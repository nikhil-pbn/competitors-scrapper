import "server-only";

import { getSheetsClient } from "@/lib/sheets/client";
import { getSpreadsheetId } from "@/lib/env";

/**
 * Read all worksheet (tab) names from the master spreadsheet dynamically.
 * Names are never hardcoded — this is the source for the competitor dropdown.
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
    .sort((a, b) => a.index - b.index)
    .map((s) => s.title);
}
