import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { logSave } from "@/lib/audit/store";
import { getCurrentUser } from "@/lib/auth/current-user";
import { appendRecords } from "@/lib/sheets/append";
import { getWorksheetGid, worksheetTabUrl } from "@/lib/sheets/worksheets";

export const dynamic = "force-dynamic";

const businessRecordSchema = z.object({
  practice_name: z.string().default(""),
  doctor_name: z.string().default(""),
  office_manager_name: z.string().default(""),
  phone: z.string().default(""),
  email: z.string().default(""),
  location: z.string().default(""),
  State: z.string().default(""),
  source_url: z.string().default(""),
});

const appendSchema = z.object({
  worksheet: z.string().min(1, "worksheet is required"),
  records: z.array(businessRecordSchema).min(1, "records must not be empty"),
});

/** POST /api/sheets/append — append reviewed records to a worksheet (Phase 3 write). */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = appendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const { addedUrls, ...summary } = await appendRecords(
      parsed.data.worksheet,
      parsed.data.records,
    );

    // Deep link to the tab for the "Go to worksheet" button (best-effort;
    // falls back to the spreadsheet root if the gid can't be resolved).
    let tabUrl: string;
    try {
      tabUrl = worksheetTabUrl(await getWorksheetGid(parsed.data.worksheet));
    } catch {
      tabUrl = worksheetTabUrl(null);
    }

    // Who did it (best-effort — never fail the save on an identity hiccup).
    let user = "unknown";
    try {
      user = (await getCurrentUser()) ?? "unknown";
    } catch {
      // ignore
    }

    // Best-effort audit — never let a logging hiccup fail the save.
    try {
      await logSave({
        user,
        worksheet: parsed.data.worksheet,
        received: summary.received,
        added: summary.added,
        updated: summary.updated,
        unchanged: summary.unchanged,
        addedUrls,
      });
    } catch {
      // ignore audit failures
    }

    return NextResponse.json({ summary: { ...summary, tabUrl } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to append rows.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
