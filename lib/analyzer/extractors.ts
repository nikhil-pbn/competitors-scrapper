import * as cheerio from "cheerio";

/**
 * Pure, unit-testable extraction helpers for Phase 2. Each takes parsed HTML
 * and returns best-effort values ("" / [] when nothing is found). No network,
 * no side effects.
 */

export type Dom = cheerio.CheerioAPI;

export function parseHtml(html: string): Dom {
  return cheerio.load(html);
}

const US_STATES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS",
  missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
  oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI",
  wyoming: "WY", "district of columbia": "DC",
};

const STATE_ABBRS = new Set(Object.values(US_STATES));

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
// US phone numbers: (123) 456-7890, 123-456-7890, 123.456.7890, +1 123 456 7890
const PHONE_RE =
  /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;

const IGNORED_EMAIL_SUFFIXES = [
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
];

/** Collect and parse all JSON-LD blocks into a flat list of objects. */
export function extractJsonLd($: Dom): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw.trim()) return;
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item && typeof item === "object") {
          out.push(item as Record<string, unknown>);
          // @graph nesting is common
          const graph = (item as Record<string, unknown>)["@graph"];
          if (Array.isArray(graph)) {
            for (const g of graph) {
              if (g && typeof g === "object") {
                out.push(g as Record<string, unknown>);
              }
            }
          }
        }
      }
    } catch {
      // Ignore malformed JSON-LD.
    }
  });
  return out;
}

const GENERIC_NAMES = new Set([
  "home", "welcome", "homepage", "home page", "index", "main", "untitled",
]);

/** True for placeholder page titles that shouldn't be used as a business name. */
function isGenericName(value: string): boolean {
  return GENERIC_NAMES.has(value.trim().toLowerCase());
}

function typeMatches(node: Record<string, unknown>, needles: string[]): boolean {
  const t = node["@type"];
  const types = Array.isArray(t) ? t : [t];
  return types.some(
    (x) =>
      typeof x === "string" &&
      needles.some((n) => x.toLowerCase().includes(n)),
  );
}

/** Practice / business name: JSON-LD business name → og:site_name → <title>. */
export function extractPracticeName($: Dom): string {
  for (const node of extractJsonLd($)) {
    if (
      typeMatches(node, ["dentist", "localbusiness", "medicalorganization", "organization"]) &&
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

export interface AddressParts {
  location: string;
  state: string;
}

function normalizeState(value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (STATE_ABBRS.has(v.toUpperCase())) return v.toUpperCase();
  const full = US_STATES[v.toLowerCase()];
  return full ?? v;
}

/** Address/location + US state: JSON-LD PostalAddress → text regex fallback. */
export function extractAddress($: Dom): AddressParts {
  for (const node of extractJsonLd($)) {
    const addr = node.address as Record<string, unknown> | undefined;
    if (addr && typeof addr === "object") {
      const locality = (addr.addressLocality as string) ?? "";
      const region = (addr.addressRegion as string) ?? "";
      const street = (addr.streetAddress as string) ?? "";
      const parts = [street, locality, region].filter(Boolean);
      if (parts.length > 0) {
        return {
          location: parts.join(", "),
          state: normalizeState(region),
        };
      }
    }
  }

  // Fallback: look for "City, ST 12345" in the body text.
  const bodyText = $("body").text().replace(/\s+/g, " ");
  const m = bodyText.match(/([A-Za-z .'-]+),\s*([A-Z]{2})\s+\d{5}/);
  if (m && STATE_ABBRS.has(m[2])) {
    return { location: `${m[1].trim()}, ${m[2]}`, state: m[2] };
  }
  return { location: "", state: "" };
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
