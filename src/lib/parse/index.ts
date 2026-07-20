import type { ReferringDomain } from "@/lib/types";
import { DOMAIN_LINE_RE } from "@/lib/parse/helpers";
import {
  parseAhrefsPastedTable,
  parseReferringDomainsFile,
  parseUrlList,
} from "@/lib/parse/parsers";

export {
  parseUrlList,
  parseAhrefsPastedTable,
  parseReferringDomainsFile,
  type ParseResult,
} from "@/lib/parse/parsers";

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
