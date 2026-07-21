import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  addNoDataUrls,
  deleteNoData,
  readNoData,
  updateNoData,
} from "@/lib/research/store";

export const dynamic = "force-dynamic";

/** List saved no-data records (session-gated by the Proxy). */
export async function GET() {
  try {
    const items = await readNoData();
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

const patchSchema = z
  .object({
    practice_name: z.string(),
    doctor_name: z.string(),
    office_manager_name: z.string(),
    phone: z.string(),
    email: z.string(),
    location: z.string(),
    State: z.string(),
  })
  .partial();

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    worksheet: z.string().min(1),
    urls: z.array(z.string()).min(1),
  }),
  z.object({
    action: z.literal("update"),
    id: z.string().min(1),
    patch: patchSchema,
  }),
  z.object({ action: z.literal("delete"), id: z.string().min(1) }),
]);

/**
 * No-data research list mutations. The Proxy already requires a valid session
 * for /api/*, so any signed-in team member can add/update/delete here (it's a
 * shared research workspace, not admin-only).
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const data = parsed.data;

  try {
    if (data.action === "add") {
      const added = await addNoDataUrls(data.worksheet, data.urls);
      return NextResponse.json({ ok: true, added });
    }
    if (data.action === "update") {
      await updateNoData(data.id, data.patch);
      return NextResponse.json({ ok: true });
    }
    await deleteNoData(data.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Operation failed." }, { status: 500 });
  }
}
