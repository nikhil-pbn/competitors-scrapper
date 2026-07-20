import { extractJsonLd, typeMatches, type Dom } from "@/lib/analyzer/extractors/html";

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
// US phone numbers: (123) 456-7890, 123-456-7890, 123.456.7890, +1 123 456 7890
const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;

const IGNORED_EMAIL_SUFFIXES = [
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
];

const GENERIC_NAMES = new Set([
  "home", "welcome", "homepage", "home page", "index", "main", "untitled",
]);

/** True for placeholder page titles that shouldn't be used as a business name. */
function isGenericName(value: string): boolean {
  return GENERIC_NAMES.has(value.trim().toLowerCase());
}

/** Practice / business name: JSON-LD business name → og:site_name → <title>. */
export function extractPracticeName($: Dom): string {
  for (const node of extractJsonLd($)) {
    if (
      typeMatches(node, [
        "dentist",
        "localbusiness",
        "medicalorganization",
        "organization",
      ]) &&
      typeof node.name === "string" &&
      node.name.trim()
    ) {
      return node.name.trim();
    }
  }

  const og = $('meta[property="og:site_name"]').attr("content");
  if (og?.trim() && !isGenericName(og)) return og.trim();

  const title = $("title").first().text();
  if (title?.trim()) {
    // Trim common " | Tagline" / " - City, ST" suffixes.
    const head = title.split(/[|–—-]/)[0].trim();
    if (head && !isGenericName(head)) return head;
    // If the first segment was generic, try the whole title.
    if (!isGenericName(title)) return title.trim();
  }
  return "";
}

/** Emails from mailto: links and raw text, filtered of image/file false positives. */
export function extractEmails($: Dom): string[] {
  const found = new Set<string>();

  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const email = href.replace(/^mailto:/i, "").split("?")[0].trim();
    if (email) found.add(email.toLowerCase());
  });

  const bodyText = $("body").text();
  for (const m of bodyText.matchAll(EMAIL_RE)) {
    const email = m[0].toLowerCase();
    if (!IGNORED_EMAIL_SUFFIXES.some((s) => email.endsWith(s))) {
      found.add(email);
    }
  }
  return [...found];
}

/** Phone numbers from tel: links and raw text. */
export function extractPhones($: Dom): string[] {
  const found = new Set<string>();

  $('a[href^="tel:"]').each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const tel = href.replace(/^tel:/i, "").trim();
    if (tel) found.add(tel);
  });

  const bodyText = $("body").text();
  for (const m of bodyText.matchAll(PHONE_RE)) {
    const digits = m[0].replace(/\D/g, "");
    if (digits.length === 10 || digits.length === 11) {
      found.add(m[0].trim());
    }
  }
  return [...found];
}

/**
 * Best-effort doctor name: look for "Dr. Firstname Lastname" patterns.
 * Frequently blank — that is acceptable per the phase's best-effort contract.
 */
export function extractDoctorName($: Dom): string {
  const text = $("body").text().replace(/\s+/g, " ");
  const m = text.match(/\bDr\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/);
  return m ? `Dr. ${m[1]}`.trim() : "";
}
