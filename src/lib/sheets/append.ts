import "server-only";

import { getSheetsClient } from "@/lib/sheets/client";
import { getSpreadsheetId } from "@/lib/env";
import { columnLetter, normalizeKey, planUpsert } from "@/lib/sheets/upsert";
import type { AppendSummary, BusinessRecord } from "@/lib/types";

/** Header names (normalized) treated as the "date added" column. */
const DATE_ADDED_KEYS = new Set(["date_added", "added_on", "added_date"]);
/** Header written when a tab has no date-added column yet. */
const DATE_ADDED_HEADER = "date_added";

/** Today's date in IST as YYYY-MM-DD (text sorts chronologically). */
function todayInIst(): string {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
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
 * Phase 3: upsert business records into the selected worksheet.
 *
 * - Maps each record's fields onto the worksheet's own header columns by name.
 * - New source_url  -> appended as a new row, stamped with today's date in the
 *   `date_added` column (auto-created if the tab doesn't have one).
 * - Existing source_url -> the row is updated in place, but only when a mapped
 *   cell actually changes (a blank incoming value keeps the sheet's current
 *   value); its original date_added is preserved. Matched rows with identical
 *   data are reported as "unchanged".
 */
export async function appendRecords(
  worksheet: string,
  records: BusinessRecord[],
): Promise<AppendSummary & { addedUrls: string[] }> {
  const received = records.length;
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  let header = await readHeaderRow(worksheet);

  if (header.length === 0) {
    throw new Error(
      `Worksheet "${worksheet}" has no header row. Add column headers before appending.`,
    );
  }

  // Ensure a "date added" column exists — auto-create it if the tab lacks one.
  let dateCol = header.findIndex((h) => DATE_ADDED_KEYS.has(normalizeKey(h)));
  if (dateCol === -1) {
    dateCol = header.length;
    header = [...header, DATE_ADDED_HEADER];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${worksheet}'!${columnLetter(dateCol)}1`,
      valueInputOption: "RAW",
      requestBody: { values: [[DATE_ADDED_HEADER]] },
    });
  }

  const lastCol = columnLetter(header.length - 1);

  // Read all existing data rows (all columns) so updates can merge/diff.
  const existingRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${worksheet}'!A2:${lastCol}`,
  });
  const existingRows = (existingRes.data.values ?? []).map((row) =>
    (row ?? []).map((v) => String(v ?? "")),
  );

  const plan = planUpsert(header, existingRows, records);

  // Stamp each newly-added row with today's date (updates keep their original).
  const today = todayInIst();
  for (const row of plan.newRows) {
    row[dateCol] = today;
  }

  if (plan.updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: plan.updates.map((u) => ({
          range: `'${worksheet}'!A${u.rowNumber}:${lastCol}${u.rowNumber}`,
          values: [u.values],
        })),
      },
    });
  }

  if (plan.newRows.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${worksheet}'!A1`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: plan.newRows },
    });
  }

  return {
    worksheet,
    added: plan.added,
    updated: plan.updated,
    unchanged: plan.unchanged,
    skippedDuplicates: plan.skippedDuplicates,
    received,
    addedUrls: plan.addedUrls,
  };
}
