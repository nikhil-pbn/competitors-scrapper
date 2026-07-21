import "server-only";

import { getSheetsClient } from "@/lib/sheets/client";
import { getSpreadsheetId } from "@/lib/env";
import { columnLetter, normalizeKey, urlKey } from "@/lib/sheets/upsert";

/**
 * Delete rows from a worksheet whose source_url matches one of `urls`. Matching
 * is normalized (protocol/trailing-slash/case-insensitive), and rows are
 * deleted bottom-up so indices don't shift mid-batch. Only the matched rows are
 * removed — all other data in the tab is untouched. Returns how many were deleted.
 */
export async function deleteRowsByUrls(
  worksheet: string,
  urls: string[],
): Promise<number> {
  const wanted = new Set(urls.map((u) => urlKey(u)).filter(Boolean));
  if (wanted.size === 0) return 0;

  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  // Resolve the tab's numeric sheetId (needed for row deletion).
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties(title,sheetId)",
  });
  const props = (meta.data.sheets ?? [])
    .map((s) => s.properties)
    .find((p) => p?.title === worksheet);
  if (!props || props.sheetId == null) return 0;
  const sheetId = props.sheetId;

  // Find the source_url column from the header row.
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${worksheet}'!1:1`,
  });
  const header = (headerRes.data.values?.[0] ?? []).map((v) => String(v ?? ""));
  const sourceCol = header.findIndex((h) => normalizeKey(h) === "source_url");
  if (header.length === 0 || sourceCol === -1) return 0;

  // Read data rows and collect the 0-based row indices that match.
  const lastCol = columnLetter(header.length - 1);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${worksheet}'!A2:${lastCol}`,
  });
  const rows = (res.data.values ?? []).map((r) =>
    (r ?? []).map((v) => String(v ?? "")),
  );

  const indices: number[] = [];
  rows.forEach((row, i) => {
    const key = urlKey(String(row[sourceCol] ?? ""));
    if (key && wanted.has(key)) indices.push(i + 1); // header is index 0
  });
  if (indices.length === 0) return 0;

  // Delete highest index first so earlier indices stay valid.
  indices.sort((a, b) => b - a);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: indices.map((idx) => ({
        deleteDimension: {
          range: {
            sheetId,
            dimension: "ROWS",
            startIndex: idx,
            endIndex: idx + 1,
          },
        },
      })),
    },
  });

  return indices.length;
}
