import type { ReferringDomain } from "@/lib/types";

/**
 * Low-level parsing helpers shared by the upload/paste parsers. Pure, no
 * dependencies — safe to run in the browser.
 */

/** Header alias (normalized) -> ReferringDomain field. */
export const HEADER_ALIASES: Record<string, keyof ReferringDomain> = {
  domain: "domain",
  url: "domain",
  referringdomain: "domain",
  referringdomains: "domain",
  website: "domain",
  site: "domain",
  sourceurl: "domain",
  dr: "domainRating",
  domainrating: "domainRating",
  traffic: "trafficDomain",
  domaintraffic: "trafficDomain",
  trafficdomain: "trafficDomain",
  keywords: "keywords",
  positions: "keywords",
  linkstotarget: "linksToTarget",
  dofollowlinks: "dofollowLinks",
  dofollowrefdomains: "dofollowRefdomains",
  dofollowreferringdomains: "dofollowRefdomains",
  dofollowlinkeddomains: "dofollowLinkedDomains",
  firstseen: "firstSeen",
  lastseen: "lastSeen",
  newlinks: "newLinks",
};

export const NUMERIC_FIELDS = new Set<keyof ReferringDomain>([
  "domainRating",
  "trafficDomain",
  "linksToTarget",
  "dofollowLinks",
  "dofollowRefdomains",
  "dofollowLinkedDomains",
  "keywords",
  "newLinks",
]);

/** A line that is exactly a bare domain (e.g. "flex.dental", "example.co.uk"). */
export const DOMAIN_LINE_RE =
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i;

export function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Extract a bare host from a URL or domain string. */
export function toDomain(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
    .split("?")[0]
    .trim();
}

export function toNumber(value: string): number | null {
  const cleaned = value.replace(/,/g, "").trim();
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** A ReferringDomain with only the domain populated (all metrics null). */
export function blankDomain(domain: string): ReferringDomain {
  return {
    domain,
    domainRating: null,
    trafficDomain: null,
    linksToTarget: null,
    dofollowLinks: null,
    dofollowRefdomains: null,
    dofollowLinkedDomains: null,
    keywords: null,
    firstSeen: null,
    lastSeen: null,
    newLinks: null,
  };
}

/** Split delimited text into rows of cells, honoring quoted fields. */
export function splitDelimited(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
