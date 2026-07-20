import "server-only";

import { getAhrefsApiKey } from "@/lib/env";
import type { ReferringDomain } from "@/lib/types";
import { buildHistory, buildWhere } from "@/lib/ahrefs/filters";
import type { AhrefsSearchInput } from "@/lib/ahrefs/types";

const AHREFS_REFDOMAINS_URL =
  "https://api.ahrefs.com/v3/site-explorer/refdomains";

/** Columns requested from Ahrefs (the `select` parameter). */
const SELECT_COLUMNS = [
  "domain",
  "domain_rating",
  "traffic_domain",
  "links_to_target",
  "dofollow_links",
  "dofollow_refdomains",
  "dofollow_linked_domains",
  "positions_source_domain",
  "first_seen",
  "last_seen",
  "new_links",
].join(",");

/** Shape of one row as returned by the Ahrefs refdomains endpoint. */
interface AhrefsRefdomainRow {
  domain?: string;
  domain_rating?: number | null;
  traffic_domain?: number | null;
  links_to_target?: number | null;
  dofollow_links?: number | null;
  dofollow_refdomains?: number | null;
  dofollow_linked_domains?: number | null;
  positions_source_domain?: number | null;
  first_seen?: string | null;
  last_seen?: string | null;
  new_links?: number | null;
}

function toReferringDomain(row: AhrefsRefdomainRow): ReferringDomain {
  return {
    domain: (row.domain ?? "").trim(),
    domainRating: row.domain_rating ?? null,
    trafficDomain: row.traffic_domain ?? null,
    linksToTarget: row.links_to_target ?? null,
    dofollowLinks: row.dofollow_links ?? null,
    dofollowRefdomains: row.dofollow_refdomains ?? null,
    dofollowLinkedDomains: row.dofollow_linked_domains ?? null,
    keywords: row.positions_source_domain ?? null,
    firstSeen: row.first_seen ?? null,
    lastSeen: row.last_seen ?? null,
    newLinks: row.new_links ?? null,
  };
}

/**
 * Phase 1: fetch filtered referring domains for a competitor target.
 *
 * Talks only to the Ahrefs API and returns a clean ReferringDomain[]. No
 * scraping and no Google Sheets knowledge lives here.
 */
export async function fetchReferringDomains(
  input: AhrefsSearchInput,
): Promise<ReferringDomain[]> {
  const target = input.target.trim();
  if (!target) throw new Error("A target domain is required.");

  const params = new URLSearchParams({
    target,
    mode: "domain",
    protocol: "both",
    select: SELECT_COLUMNS,
    order_by: "domain_rating:desc",
    limit: String(input.filters.limit ?? 1000),
    history: buildHistory(input.filters),
    output: "json",
  });

  const where = buildWhere(input.filters);
  if (where) params.set("where", where);

  const res = await fetch(`${AHREFS_REFDOMAINS_URL}?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getAhrefsApiKey()}`,
      Accept: "application/json",
    },
    // Referring-domain data changes slowly; never serve a stale cached response
    // for an on-demand search.
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Ahrefs API error (${res.status}): ${detail || res.statusText}`,
    );
  }

  const data = (await res.json()) as { refdomains?: AhrefsRefdomainRow[] };
  const rows = data.refdomains ?? [];

  // De-duplicate by domain (defensive; one link per domain).
  const seen = new Set<string>();
  const result: ReferringDomain[] = [];
  for (const row of rows) {
    const rd = toReferringDomain(row);
    if (!rd.domain || seen.has(rd.domain)) continue;
    seen.add(rd.domain);
    result.push(rd);
  }
  return result;
}
