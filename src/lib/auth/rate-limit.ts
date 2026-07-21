import "server-only";

/*
 * Best-effort, in-memory throttle for the login endpoint (per warm instance).
 * It slows brute-force alongside scrypt's cost + a strong password. For strict
 * distributed limits across all instances, back this with Vercel KV / Upstash.
 */

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 8;

const hits = new Map<string, { count: number; resetAt: number }>();

/** Returns false when the key has exceeded the allowed attempts this window. */
export function checkRate(key: string): boolean {
  const now = Date.now();
  const rec = hits.get(key);
  if (!rec || now > rec.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (rec.count >= MAX_ATTEMPTS) return false;
  rec.count += 1;
  return true;
}
