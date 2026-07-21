import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { appendRecords } from "@/lib/sheets/append";
import { logSave } from "@/lib/audit/store";
import { getCurrentUser } from "@/lib/auth/current-user";

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

    // Best-effort audit — never let a logging hiccup fail the save.
    try {
      const user = (await getCurrentUser()) ?? "unknown";
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

    return NextResponse.json({ summary });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to append rows.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
