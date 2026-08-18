/*
 * Quality guardrails for scraped phone numbers and emails.
 *
 * These values are still SHOWN in the contact table (styled red) so the team
 * can see what was found, but obviously-fake placeholders (9999999999,
 * 1234567890, abc@xyz.com, gggggg@g.com …) are stripped before a row is saved
 * to the sheet — see `sanitizeRecordForSheet`.
 *
 * Pure functions — safe to import from both client components and server code.
 */

// ── Phones ────────────────────────────────────────────────────────────────

/** Digits form an ascending or descending run (with 9→0 / 0→9 wrap). */
function isSequential(digits: string): boolean {
  let ascending = true;
  let descending = true;
  for (let i = 1; i < digits.length; i++) {
    const prev = Number(digits[i - 1]);
    const cur = Number(digits[i]);
    if (cur !== (prev + 1) % 10) ascending = false;
    if (cur !== (prev + 9) % 10) descending = false;
  }
  return ascending || descending;
}

/**
 * A real US phone number: 10 digits (an optional leading "1" is stripped),
 * valid NANP area code + exchange (both start 2-9), enough digit variety, and
 * not a sequential run. Input may be formatted — only the digits are checked.
 */
export function isRealPhone(raw: string): boolean {
  let digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return false;

  // NANP: the area code (pos 0) and exchange (pos 3) must both start 2-9.
  // Rejects 1234567890 (area 123), 0123456789, 1111111111 (area 111), etc.
  if (digits[0] < "2" || digits[3] < "2") return false;

  // All-same / two-digit junk: 9999999999, 5555555555, 9090909090…
  if (new Set(digits).size <= 2) return false;

  // Straight runs: 1234567890, 0987654321, 2345678901…
  if (isSequential(digits)) return false;

  return true;
}

// ── Emails ──────────────────────────────────────────────────────────────

/** Placeholder domains that never belong to a real practice. */
const PLACEHOLDER_EMAIL_DOMAINS = new Set([
  "example.com", "example.org", "example.net", "example.edu",
  "test.com", "test.net", "tests.com",
  "xyz.com", "abc.com", "domain.com", "yourdomain.com",
  "sample.com", "acme.com", "company.com", "yourcompany.com",
  "yoursite.com", "website.com", "mysite.com", "site.com",
  "fake.com", "nowhere.com", "none.com", "placeholder.com",
]);

/** Placeholder local parts (the bit before "@"). */
const PLACEHOLDER_EMAIL_LOCALS = new Set([
  "test", "example", "abc", "xyz", "sample", "demo", "placeholder",
  "name", "yourname", "firstname", "lastname", "youremail", "email",
  "someone", "user", "username", "none",
]);

/** File extensions that mean the match was really an image/asset, not an email. */
const FILE_SUFFIXES = [
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico", ".css", ".js",
];

/**
 * A real-looking email: valid shape, not a known placeholder domain/local,
 * not an all-identical-character local part (gggggg@…) or domain (gg.com), and
 * not an image/asset filename that slipped through the regex.
 */
export function isRealEmail(raw: string): boolean {
  const email = (raw ?? "").trim().toLowerCase();

  const match = /^([^@\s]+)@([^@\s]+\.[a-z]{2,})$/.exec(email);
  if (!match) return false;
  const [, local, domain] = match;

  if (FILE_SUFFIXES.some((s) => email.endsWith(s))) return false;
  if (PLACEHOLDER_EMAIL_DOMAINS.has(domain)) return false;
  if (PLACEHOLDER_EMAIL_LOCALS.has(local)) return false;

  // All-identical local part: gggggg@…, aaaa@… (ignoring separators).
  const localCore = local.replace(/[._%+-]/g, "");
  if (localCore.length >= 3 && new Set(localCore).size === 1) return false;

  // All-identical domain label before the TLD: gg.com, aaaa.net.
  const domainLabel = domain.slice(0, domain.lastIndexOf("."));
  if (domainLabel.length >= 2 && new Set(domainLabel).size === 1) return false;

  return true;
}

// ── Junk flags (drive the red styling + the save-time strip) ────────────────

/** True if this phone should be flagged (shown red) and not saved by default. */
export function isJunkPhone(value: string): boolean {
  return Boolean(value) && !isRealPhone(value);
}

/** True if this email should be flagged (shown red) and not saved by default. */
export function isJunkEmail(value: string): boolean {
  return Boolean(value) && !isRealEmail(value);
}
