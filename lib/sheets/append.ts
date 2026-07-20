import "server-only";

import { getSheetsClient } from "./client";
import { getSpreadsheetId } from "@/lib/env";
import { columnLetter, planUpsert } from "./upsert";
import type { AppendSummary, BusinessRecord } from "@/lib/types";

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
 * - New source_url  -> appended as a new row.
 * - Existing source_url -> the row is updated in place, but only when a mapped
 *   cell actually changes (a blank incoming value keeps the sheet's current
 *   value). Matched rows with identical data are reported as "unchanged".
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

  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
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
  };
}
