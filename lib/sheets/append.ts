import "server-only";

import { getSheetsClient } from "./client";
import { getSpreadsheetId } from "@/lib/env";
import {
  BUSINESS_RECORD_FIELDS,
  type AppendSummary,
  type BusinessRecord,
} from "@/lib/types";

/** Normalize a header/field label for tolerant matching (e.g. "Source URL" -> "source_url"). */
function normalizeKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Convert a 0-based column index to an A1 column letter (0 -> A, 26 -> AA). */
function columnLetter(index: number): string {
  let n = index;
  let letter = "";
  do {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letter;
}

/** Read the header row of a worksheet (row 1). Returns [] if the sheet is empty. */
async function readHeaderRow(worksheet: string): Promise<string[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `'${worksheet}'!1:1`,
  });
  return (res.data.values?.[0] ?? []).map((v) => String(v ?? ""));
}

/**
 * Read the set of source_url values already present in the worksheet, used to
 * skip duplicates. Matching is case-insensitive on the trimmed value.
 */
async function readExistingSourceUrls(
  worksheet: string,
  header: string[],
): Promise<Set<string>> {
  const sourceCol = header.findIndex(
    (h) => normalizeKey(h) === "source_url",
  );
  if (sourceCol === -1) return new Set();

  const sheets = getSheetsClient();
  const col = columnLetter(sourceCol);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `'${worksheet}'!${col}2:${col}`,
  });

  const set = new Set<string>();
  for (const row of res.data.values ?? []) {
    const value = String(row?.[0] ?? "").trim().toLowerCase();
    if (value) set.add(value);
  }
  return set;
}

/**
 * Phase 3: append business records to the selected worksheet.
 *
 * - Maps each record's fields onto the worksheet's own header columns by name,
 *   so column order is driven by the sheet, not hardcoded.
 * - Skips records whose source_url already exists in the sheet.
 * - Leaves existing rows untouched (INSERT_ROWS append).
 */
export async function appendRecords(
  worksheet: string,
  records: BusinessRecord[],
): Promise<AppendSummary> {
  const received = records.length;
  const header = await readHeaderRow(worksheet);

  if (header.length === 0) {
    throw new Error(
      `Worksheet "${worksheet}" has no header row. Add column headers before appending.`,
    );
  }

  // Map each sheet column -> which BusinessRecord field feeds it (or null).
  const columnField = header.map((h) => {
    const key = normalizeKey(h);
    return (
      BUSINESS_RECORD_FIELDS.find((f) => normalizeKey(f) === key) ?? null
    );
  });

  const existing = await readExistingSourceUrls(worksheet, header);

  const seenInBatch = new Set<string>();
  const rows: string[][] = [];
  let skippedDuplicates = 0;

  for (const record of records) {
    const key = record.source_url.trim().toLowerCase();
    if (key && (existing.has(key) || seenInBatch.has(key))) {
      skippedDuplicates++;
      continue;
    }
    if (key) seenInBatch.add(key);

    rows.push(columnField.map((field) => (field ? record[field] : "")));
  }

  if (rows.length > 0) {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: getSpreadsheetId(),
      range: `'${worksheet}'!A1`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: rows },
    });
  }

  return {
    worksheet,
    added: rows.length,
    skippedDuplicates,
    received,
  };
}
