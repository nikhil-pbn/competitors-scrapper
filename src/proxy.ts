import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/config";
import { verifySession } from "@/lib/auth/session";

/**
 * Server-side gate for the data APIs. Any /api/* call without a valid signed
 * session cookie is rejected with 401 — so the Google Sheet can't be read or
 * written by anyone who hasn't entered the password, regardless of the UI.
 * The auth endpoints themselves stay open so login/logout can work.
 */
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySession(token)) {
    return NextResponse.next();
  }

  return NextResponse.json(
    { error: "Unauthorized. Please sign in first." },
    { status: 401 },
  );
}

export const config = {
  matcher: "/api/:path*",
};
