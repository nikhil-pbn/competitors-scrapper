import "server-only";

import { getSheetsClient } from "@/lib/sheets/client";
import { getSpreadsheetId } from "@/lib/env";

/**
 * Tabs that are NOT competitor data tabs and must never appear in the
 * competitor picker, save targets, or /nodata filter. The "URLs" tab is a
 * static Competitor-Name → URL reference/lookup that is never written to.
 * Matched case-insensitively (trimmed).
 */
const NON_COMPETITOR_TABS = new Set(["urls"]);

/**
 * Read all worksheet (tab) names from the master spreadsheet dynamically.
 * Names are never hardcoded — this is the source for the competitor dropdown.
 * Non-competitor reference tabs (see NON_COMPETITOR_TABS) are filtered out.
 */
export async function listWorksheetNames(): Promise<string[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.get({
    spreadsheetId: getSpreadsheetId(),
    fields: "sheets.properties(title,index)",
  });

  return (res.data.sheets ?? [])
    .map((s) => ({
      title: s.properties?.title ?? "",
      index: s.properties?.index ?? 0,
    }))
    .filter((s) => s.title !== "")
    .filter((s) => !NON_COMPETITOR_TABS.has(s.title.trim().toLowerCase()))
    .sort((a, b) => a.index - b.index)
    .map((s) => s.title);
}

/** The numeric sheetId (gid) of a tab by title, or null if not found. */
export async function getWorksheetGid(title: string): Promise<number | null> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.get({
    spreadsheetId: getSpreadsheetId(),
    fields: "sheets.properties(title,sheetId)",
  });
  const match = (res.data.sheets ?? []).find(
    (s) => s.properties?.title === title,
  );
  return match?.properties?.sheetId ?? null;
}

/** A deep link to a specific worksheet tab (falls back to the spreadsheet). */
export function worksheetTabUrl(gid: number | null): string {
  const base = `https://docs.google.com/spreadsheets/d/${getSpreadsheetId()}/edit`;
  return gid == null ? base : `${base}?gid=${gid}#gid=${gid}`;
}
