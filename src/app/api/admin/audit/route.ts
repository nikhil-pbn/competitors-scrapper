import { NextResponse, type NextRequest } from "next/server";

import { isCurrentUserAdmin } from "@/lib/auth/current-user";
import { clearAudit, deleteEntry } from "@/lib/audit/store";
import { deleteRowsByUrls } from "@/lib/sheets/delete";

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
    const removed = await deleteEntry(body.id);

    // Also remove exactly the rows this save added, from its worksheet tab.
    let removedRows = 0;
    if (removed?.worksheet && removed.addedUrls && removed.addedUrls.length > 0) {
      try {
        removedRows = await deleteRowsByUrls(
          removed.worksheet,
          removed.addedUrls,
        );
      } catch {
        // Log entry is already gone; surface partial success to the client.
        return NextResponse.json({ ok: true, removedRows: 0, sheetError: true });
      }
    }
    return NextResponse.json({ ok: true, removedRows });
  }

  return NextResponse.json({ error: "Nothing to delete." }, { status: 400 });
}
