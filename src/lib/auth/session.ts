import { SignJWT, jwtVerify } from "jose";

import { SESSION_MAX_AGE } from "@/lib/auth/config";

/*
 * Signed session tokens (HS256 via AUTH_SECRET). The secret lives only on the
 * server, so the cookie can be verified but never forged/tampered from the
 * browser. Used by the Proxy (guards /api/*) and the layout (renders the gate).
 */

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set.");
  return new TextEncoder().encode(value);
}

/**
 * Mint a signed session token for a successful login. `subject` records who it
 * was — an email for Google sign-in, or "password" for the shared password.
 */
export async function createSession(subject = "user"): Promise<string> {
  return new SignJWT({ ok: true })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret());
}

/** True only for a present, unexpired, correctly-signed token. */
export async function verifySession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

/**
 * The identity stored in a valid session — an email (Google) or "password"
 * (shared password) — or null if the token is missing/invalid.
 */
export async function readSessionSubject(
  token: string | undefined,
): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
    });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
