import "server-only";

import { emptyBusinessRecord, type BusinessRecord } from "@/lib/types";
import { normalizeFromHtml } from "@/lib/analyzer/normalize";

const USER_AGENT =
  "Mozilla/5.0 (compatible; ReferringDomainsBot/1.0; +internal-seo-tool)";
const FETCH_TIMEOUT_MS = 10_000;
const DEFAULT_CONCURRENCY = 8;
/** Extra paths tried (in order) when the homepage lacks contact details. */
const CONTACT_PATHS = ["/contact", "/contact-us", "/about", "/about-us"];

/** Fetch a single URL as text with a timeout. Returns null on any failure. */
async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function isRecordComplete(r: BusinessRecord): boolean {
  return Boolean(r.email && r.phone && r.practice_name);
}

function mergeRecords(base: BusinessRecord, extra: BusinessRecord): BusinessRecord {
  return {
    practice_name: base.practice_name || extra.practice_name,
    doctor_name: base.doctor_name || extra.doctor_name,
    office_manager_name: base.office_manager_name || extra.office_manager_name,
    phone: base.phone || extra.phone,
    email: base.email || extra.email,
    location: base.location || extra.location,
    State: base.State || extra.State,
    source_url: base.source_url,
  };
}

/**
 * Visit a single referring domain and extract a BusinessRecord (best-effort).
 * Always resolves — on total failure it returns a record with only source_url.
 */
export async function analyzeDomain(domain: string): Promise<BusinessRecord> {
  const clean = domain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const base = `https://${clean}`;

  const homepage = await fetchHtml(base);
  let record = homepage
    ? normalizeFromHtml(base, homepage)
    : emptyBusinessRecord(base);

  // If key fields are still missing, try common contact/about pages.
  for (const path of CONTACT_PATHS) {
    if (isRecordComplete(record)) break;
    const html = await fetchHtml(`${base}${path}`);
    if (html) record = mergeRecords(record, normalizeFromHtml(base, html));
  }

  return record;
}

export interface AnalyzeProgress {
  done: number;
  total: number;
  record: BusinessRecord;
}

/**
 * Phase 2 entry point: analyze many domains with bounded concurrency.
 * Invokes onProgress after each domain resolves (drives SSE streaming).
 */
export async function analyzeDomains(
  domains: string[],
  options: {
    concurrency?: number;
    onProgress?: (progress: AnalyzeProgress) => void;
  } = {},
): Promise<BusinessRecord[]> {
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  const total = domains.length;
  const results: BusinessRecord[] = new Array(total);
  let cursor = 0;
  let done = 0;

  async function worker() {
    while (cursor < total) {
      const index = cursor++;
      const record = await analyzeDomain(domains[index]);
      results[index] = record;
      done++;
      options.onProgress?.({ done, total, record });
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, total) },
    () => worker(),
  );
  await Promise.all(workers);

  return results;
}
