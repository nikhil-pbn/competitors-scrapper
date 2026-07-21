import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";

import { OAUTH_STATE_COOKIE } from "@/lib/auth/config";
import { buildGoogleAuthUrl } from "@/lib/auth/google";

export const dynamic = "force-dynamic";

/** Starts Google sign-in: sets a CSRF state cookie and redirects to Google. */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/google/callback`;
  const state = randomBytes(16).toString("hex");

  let authUrl: string;
  try {
    authUrl = buildGoogleAuthUrl(redirectUri, state);
  } catch {
    return NextResponse.redirect(`${origin}/?authError=config`);
  }

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
