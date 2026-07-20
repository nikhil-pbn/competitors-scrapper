import type { ReferringDomain } from "@/lib/types";
import {
  DOMAIN_LINE_RE,
  HEADER_ALIASES,
  NUMERIC_FIELDS,
  blankDomain,
  normalizeHeader,
  splitDelimited,
  toDomain,
  toNumber,
} from "@/lib/parse/helpers";

// A line that is a date like "11 Nov 2023".
const DATE_LINE_RE = /^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}$/;

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

export interface ParseResult {
  domains: ReferringDomain[];
  /** Header labels that were not recognized (ignored). */
  unmatchedHeaders: string[];
}

/** Parse an uploaded CSV/TSV of referring domains into ReferringDomain[]. */
export function parseReferringDomainsFile(text: string): ParseResult {
  const firstLine = text.slice(0, text.indexOf("\n") + 1 || text.length);
  const delim =
    firstLine.split("\t").length > firstLine.split(",").length ? "\t" : ",";

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
