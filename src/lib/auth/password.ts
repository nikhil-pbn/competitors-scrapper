import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/*
 * Shared-password verification. Only a scrypt HASH is stored (in
 * APP_PASSWORD_HASH) — never the plaintext — so the deploy env holds nothing
 * directly reusable. scrypt is deliberately slow to blunt brute-force.
 *
 * Hash format: scrypt:<saltHex>:<hashHex>  (colon-separated so a literal "$"
 * can never collide with .env variable expansion).
 */

const KEY_LEN = 64;

export function verifyPassword(password: string): boolean {
  const stored = process.env.APP_PASSWORD_HASH;
  if (!stored) return false;
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Generate a hash for a chosen password (used from a one-off script, never at runtime). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LEN);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}
