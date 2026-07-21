/** Shared auth constants (no secrets, safe to import anywhere). */

/** Signed session cookie name. */
export const SESSION_COOKIE = "cs_session";

/** Short-lived cookie holding the OAuth CSRF state during Google sign-in. */
export const OAUTH_STATE_COOKIE = "cs_oauth_state";

/** Session lifetime in seconds (12 hours). */
export const SESSION_MAX_AGE = 60 * 60 * 12;

/** Only Google accounts on this domain may sign in. */
export const ALLOWED_EMAIL_DOMAIN = "practicenumbers.com";
