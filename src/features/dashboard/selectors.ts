import { hasContactData, type BusinessRecord } from "@/lib/types";
import { stripProtocol } from "@/lib/format";
import { sourceKey } from "@/features/dashboard/keys";

/** Scraped + manual results, with manual entries overriding scraped ones by URL. */
export function mergeRecords(
  scraped: BusinessRecord[],
  manual: BusinessRecord[],
): BusinessRecord[] {
  const manualByKey = new Map(manual.map((r) => [sourceKey(r.source_url), r]));
  const out: BusinessRecord[] = [];
  const scrapedKeys = new Set<string>();
  for (const r of scraped) {
    const k = sourceKey(r.source_url);
    scrapedKeys.add(k);
    out.push(manualByKey.get(k) ?? r);
  }
  // Manual rows for URLs that weren't in the scraped set.
  for (const r of manual) {
    if (!scrapedKeys.has(sourceKey(r.source_url))) out.push(r);
  }
  return out;
}

/**
 * Whether a record belongs in the table: not set aside, and either it has
 * contact data or the user explicitly pulled it back in from the no-data list.
 */
export function inTable(
  r: BusinessRecord,
  excluded: Set<string>,
  included: Set<string>,
): boolean {
  const key = sourceKey(r.source_url);
  return !excluded.has(key) && (hasContactData(r) || included.has(key));
}

export interface NoDataItem {
  key: string;
  display: string;
}

/**
 * No-data list = merged records not in the table. Each carries its match key so
 * it can be pulled back in, plus a display domain for the warning + copy.
 */
export function computeNoDataItems(
  merged: BusinessRecord[],
  excluded: Set<string>,
  included: Set<string>,
): NoDataItem[] {
  const seen = new Set<string>();
  const out: NoDataItem[] = [];
  for (const r of merged) {
    if (inTable(r, excluded, included)) continue;
    const key = sourceKey(r.source_url);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key, display: stripProtocol(r.source_url) });
  }
  return out;
}
