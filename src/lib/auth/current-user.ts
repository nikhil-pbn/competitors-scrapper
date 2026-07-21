import "server-only";

import { cookies } from "next/headers";

import { SESSION_COOKIE } from "@/lib/auth/config";
import { readSessionSubject } from "@/lib/auth/session";

/** Emails allowed into /admin. Override with ADMIN_EMAILS (comma-separated). */
const ADMIN_EMAILS = (
  process.env.ADMIN_EMAILS ?? "nikhil.kumar@practicenumbers.com"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(subject: string | null | undefined): boolean {
  return Boolean(subject) && ADMIN_EMAILS.includes(String(subject).toLowerCase());
}

/**
 * The current session identity: an email (Google sign-in) or "password"
 * (shared password), or null if not signed in. Reads the signed cookie.
 */
export async function getCurrentUser(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return readSessionSubject(token);
}

/** True only when the current session is a recognised admin email. */
export async function isCurrentUserAdmin(): Promise<boolean> {
  return isAdminEmail(await getCurrentUser());
}
