import { NextResponse } from "next/server";

import { listWorksheetNames } from "@/lib/sheets/worksheets";

// Always run at request time; worksheet names can change in the sheet.
export const dynamic = "force-dynamic";

/** GET /api/worksheets — list the master spreadsheet's tab names (Phase 3 read). */
export async function GET() {
  try {
    const worksheets = await listWorksheetNames();
    return NextResponse.json({ worksheets });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load worksheets.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
