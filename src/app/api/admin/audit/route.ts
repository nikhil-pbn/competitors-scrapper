import { NextResponse, type NextRequest } from "next/server";

import { isCurrentUserAdmin } from "@/lib/auth/current-user";
import { clearAudit, deleteEntry } from "@/lib/audit/store";

export const dynamic = "force-dynamic";

/**
 * Admin-only mutations on the audit log. The Proxy already requires a valid
 * session for /api/*; here we additionally require an admin identity, so a
 * signed-in non-admin (or a password session) can't delete anything.
 *
 * Body: { all: true } to clear everything, or { id: "<entry id/timestamp>" }.
 */
export async function POST(request: NextRequest) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: { id?: string; all?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    // treated as an invalid request below
  }

  if (body.all === true) {
    await clearAudit();
    return NextResponse.json({ ok: true });
  }

  if (typeof body.id === "string" && body.id.trim() !== "") {
    await deleteEntry(body.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Nothing to delete." }, { status: 400 });
}
