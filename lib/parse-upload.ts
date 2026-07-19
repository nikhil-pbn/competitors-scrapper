import type { ReferringDomain } from "@/lib/types";

/**
 * Parse an uploaded CSV/TSV of referring domains into ReferringDomain[].
 *
 * Runs in the browser (no dependency). Column headers are matched tolerantly
 * (case/spacing/underscore-insensitive) against known aliases, so exports from
 * Ahrefs, Google Sheets, or Excel-saved-as-CSV all work. Unknown columns are
 * ignored; missing metrics become null.
 */

/** Header alias (normalized) -> ReferringDomain field. */
const HEADER_ALIASES: Record<string, keyof ReferringDomain> = {
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

const NUMERIC_FIELDS = new Set<keyof ReferringDomain>([
  "domainRating",
  "trafficDomain",
  "linksToTarget",
  "dofollowLinks",
  "dofollowRefdomains",
  "dofollowLinkedDomains",
  "keywords",
  "newLinks",
]);

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Extract a bare host from a URL or domain string. */
function toDomain(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
    .split("?")[0]
    .trim();
}

function toNumber(value: string): number | null {
  const cleaned = value.replace(/,/g, "").trim();
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** A ReferringDomain with only the domain populated (all metrics null). */
function blankDomain(domain: string): ReferringDomain {
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

/**
 * Parse a free-form list of URLs/domains (newline, comma, or space separated)
 * into ReferringDomain[] with only the domain filled. For when the user has a
 * filtered URL list but no metrics.
 */
export function parseUrlList(text: string): ReferringDomain[] {
  const seen = new Set<string>();
  const domains: ReferringDomain[] = [];
  for (const token of text.split(/[\s,;]+/)) {
    const domain = toDomain(token);
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);
    domains.push(blankDomain(domain));
  }
  return domains;
}

// A line that is exactly a bare domain (e.g. "flex.dental", "example.co.uk").
const DOMAIN_LINE_RE =
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i;
// A line that is a date like "11 Nov 2023".
const DATE_LINE_RE = /^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}$/;

/**
 * Parse a table copied directly from the Ahrefs web UI. That copy is irregular:
 * each row spans several lines — the domain on its own line, a tab-separated
 * line of core metrics (DR, dofollow ref domains, dofollow linked domains,
 * traffic, keywords), standalone numbers for links-to-target / new / dofollow
 * links (optional columns only appear when they have a value), and a date.
 *
 * Domains are extracted reliably; numeric columns are best-effort (they are for
 * on-screen reference only and are not written to Sheets).
 */
export function parseAhrefsPastedTable(text: string): ReferringDomain[] {
  const records: ReferringDomain[] = [];
  const seen = new Set<string>();
  let current: ReferringDomain | null = null;
  let coreFilled = false;
  let plain: number[] = [];
  let dates: string[] = [];

  const flush = () => {
    if (!current) return;
    if (plain.length >= 1) current.linksToTarget = plain[0];
    if (plain.length >= 2) current.dofollowLinks = plain[plain.length - 1];
    if (dates.length >= 1) current.firstSeen = dates[0];
    if (dates.length >= 2) current.lastSeen = dates[dates.length - 1];
    records.push(current);
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "") continue;
    const firstCell = line.split("\t")[0].trim();

    // A bare-domain line starts a new record.
    if (DOMAIN_LINE_RE.test(firstCell)) {
      flush();
      current = seen.has(firstCell) ? null : blankDomain(firstCell);
      if (current) seen.add(firstCell);
      coreFilled = false;
      plain = [];
      dates = [];
      continue;
    }
    if (!current) continue;

    if (DATE_LINE_RE.test(firstCell)) {
      dates.push(firstCell);
      continue;
    }

    // First tab-separated numeric line after the domain = core metrics.
    if (!coreFilled && line.includes("\t")) {
      const nums = line
        .split("\t")
        .map((c) => c.trim())
        .filter((c) => c !== "")
        .map(toNumber);
      if (nums.length >= 1 && nums[0] !== null) {
        current.domainRating = nums[0] ?? null;
        current.dofollowRefdomains = nums[1] ?? null;
        current.dofollowLinkedDomains = nums[2] ?? null;
        current.trafficDomain = nums[3] ?? null;
        current.keywords = nums[4] ?? null;
        coreFilled = true;
        continue;
      }
    }

    // Signed number (+N new links / −N lost links).
    const signed = firstCell.match(/^([+−-])\s*([\d,]+)$/);
    if (signed) {
      if (signed[1] === "+") current.newLinks = toNumber(signed[2]);
      continue; // negative (lost) has no field on ReferringDomain
    }
    // Plain standalone number (links to target / dofollow links).
    if (/^[\d,]+$/.test(firstCell)) {
      const n = toNumber(firstCell);
      if (n !== null) plain.push(n);
      continue;
    }
    // Anything else (status text like "New"/"Lost", etc.) is ignored.
  }
  flush();
  return records;
}

/**
 * Smart dispatcher for pasted content. Detects and parses, in order:
 *   1. An Ahrefs web-table copy (multi-line rows) -> full metrics.
 *   2. A clean CSV/TSV with a Domain/URL header row -> full metrics.
 *   3. A plain list of URLs/domains -> domains only.
 * `source` distinguishes metric-bearing input ("upload") from a URL list.
 */
export function parsePastedData(text: string): {
  domains: ReferringDomain[];
  source: "upload" | "urls";
} {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const hasTab = text.includes("\t");
  const hasOrphanDomain = lines.some(
    (l) => !l.includes("\t") && DOMAIN_LINE_RE.test(l),
  );

  // 1. Ahrefs copied table (domain on its own line + tab-separated metrics).
  if (hasTab && hasOrphanDomain) {
    const domains = parseAhrefsPastedTable(text);
    if (domains.length > 0) return { domains, source: "upload" };
  }

  // 2. Clean CSV/TSV with a recognizable header row.
  const firstLine = lines[0] ?? "";
  if (
    (firstLine.includes(",") || firstLine.includes("\t")) &&
    /\b(domain|url|website|site)\b/i.test(firstLine)
  ) {
    try {
      const res = parseReferringDomainsFile(text);
      if (res.domains.length > 0)
        return { domains: res.domains, source: "upload" };
    } catch {
      // Not a valid table — fall through to plain URL parsing.
    }
  }

  // 3. Plain URL/domain list.
  return { domains: parseUrlList(text), source: "urls" };
}

/** Split delimited text into rows of cells, honoring quoted fields. */
function splitDelimited(text: string, delim: string): string[][] {
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

export interface ParseResult {
  domains: ReferringDomain[];
  /** Header labels that were not recognized (ignored). */
  unmatchedHeaders: string[];
}

export function parseReferringDomainsFile(text: string): ParseResult {
  const firstLine = text.slice(0, text.indexOf("\n") + 1 || text.length);
  const delim = firstLine.split("\t").length > firstLine.split(",").length
    ? "\t"
    : ",";

  const rows = splitDelimited(text, delim).filter(
    (r) => r.length > 1 || (r.length === 1 && r[0].trim() !== ""),
  );
  if (rows.length < 2) return { domains: [], unmatchedHeaders: [] };

  const header = rows[0];
  const fieldByCol = header.map((h) => HEADER_ALIASES[normalizeHeader(h)] ?? null);
  const unmatchedHeaders = header.filter((_, i) => fieldByCol[i] === null);

  const domainCol = fieldByCol.indexOf("domain");
  if (domainCol === -1) {
    throw new Error(
      "No domain/URL column found. Include a column named 'Domain' or 'URL'.",
    );
  }

  const domains: ReferringDomain[] = [];
  const seen = new Set<string>();

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const domain = toDomain(cells[domainCol] ?? "");
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);

    const record = blankDomain(domain);

    for (let c = 0; c < header.length; c++) {
      const field = fieldByCol[c];
      if (!field || field === "domain") continue;
      const raw = (cells[c] ?? "").trim();
      if (raw === "") continue;
      if (NUMERIC_FIELDS.has(field)) {
        (record[field] as number | null) = toNumber(raw);
      } else {
        (record[field] as string) = raw;
      }
    }

    domains.push(record);
  }

  return { domains, unmatchedHeaders };
}
