import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { appendRecords } from "@/lib/sheets/append";

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
    const summary = await appendRecords(
      parsed.data.worksheet,
      parsed.data.records,
    );
    return NextResponse.json({ summary });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to append rows.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
