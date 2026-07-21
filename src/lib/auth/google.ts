import "server-only";

import { createRemoteJWKSet, jwtVerify } from "jose";

import { ALLOWED_EMAIL_DOMAIN } from "@/lib/auth/config";

/*
 * Minimal Google OAuth 2.0 (authorization-code) helpers. The id_token returned
 * by the token endpoint is verified against Google's public keys (signature +
 * issuer + audience) before we trust the email, then the domain is enforced.
 */

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

function clientId(): string {
  const value = process.env.GOOGLE_CLIENT_ID;
  if (!value) throw new Error("GOOGLE_CLIENT_ID is not set.");
  return value;
}

function clientSecret(): string {
  const value = process.env.GOOGLE_CLIENT_SECRET;
  if (!value) throw new Error("GOOGLE_CLIENT_SECRET is not set.");
  return value;
}

/** Authorization URL to redirect the user to (hints Google to the org domain). */
export function buildGoogleAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    hd: ALLOWED_EMAIL_DOMAIN,
    prompt: "select_account",
    access_type: "online",
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

/** Thrown when a verified Google account is not on the allowed domain. */
export const DOMAIN_NOT_ALLOWED = "DOMAIN_NOT_ALLOWED";

/**
 * Exchange the auth code for tokens, verify the id_token, enforce the allowed
 * domain, and return the verified email. Throws on any failure.
 */
export async function completeGoogleLogin(
  code: string,
  redirectUri: string,
): Promise<{ email: string }> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error("Google token exchange failed.");

  const data = (await res.json()) as { id_token?: string };
  if (!data.id_token) throw new Error("Google response had no id_token.");

  const { payload } = await jwtVerify(data.id_token, JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId(),
  });

  const email =
    typeof payload.email === "string" ? payload.email.toLowerCase() : "";
  const verified =
    payload.email_verified === true || payload.email_verified === "true";
  const hd = typeof payload.hd === "string" ? payload.hd : "";

  const domainOk =
    email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`) || hd === ALLOWED_EMAIL_DOMAIN;
  if (!email || !verified || !domainOk) {
    throw new Error(DOMAIN_NOT_ALLOWED);
  }

  return { email };
}
