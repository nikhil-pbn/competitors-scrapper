import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/auth/config";
import { DOMAIN_NOT_ALLOWED, completeGoogleLogin } from "@/lib/auth/google";
import { createSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const prod = process.env.NODE_ENV === "production";

/** Google redirects here with the auth code; verify, enforce domain, sign in. */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  const fail = (reason: string) => {
    const res = NextResponse.redirect(`${origin}/?authError=${reason}`);
    res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  };

  // CSRF: the state echoed back by Google must match the one we set.
  if (!code || !state || !savedState || state !== savedState) {
    return fail("state");
  }

  let email: string;
  try {
    ({ email } = await completeGoogleLogin(
      code,
      `${origin}/api/auth/google/callback`,
    ));
  } catch (e) {
    return fail(e instanceof Error && e.message === DOMAIN_NOT_ALLOWED ? "domain" : "google");
  }

  let token: string;
  try {
    token = await createSession(email);
  } catch {
    return fail("config");
  }

  const res = NextResponse.redirect(`${origin}/`);
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: prod,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
