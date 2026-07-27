import type {
  AhrefsFilters,
  RefdomainLinkStatus,
  RefdomainRange,
} from "@/lib/ahrefs/types";

/**
 * Ahrefs API v3 refdomains filter/`where` + `history` builder.
 *
 * `where` is a JSON boolean expression:
 *   {"and":[{"field":"<col>","is":["<op>",<value>]}, ...]}
 * Operators: eq, neq, gt, gte, lt, lte, substring, isubstring, prefix, suffix…
 *
 * Semantics (verified against the API v3 spec + the web UI):
 *  - A "New" referring domain is one whose FIRST link appeared in the window,
 *    i.e. `first_seen >= <since>` — NOT `new_links > 0` (which also matches old
 *    domains that merely gained another link).
 *  - A "Lost" referring domain lost its last live link in the window, i.e.
 *    `last_seen >= <since>`, and needs `history` set (not "live") so lost rows
 *    are included in the report.
 *  - "All" lists every current referring domain; the date range does not filter
 *    it (matching the Ahrefs "All" tab).
 */

type Condition = { field: string; is: [string, ...unknown[]] };

/** The "since" date (YYYY-MM-DD, UTC) for a range, or null for all-time. */
export function sinceDateFor(
  range: RefdomainRange,
  now: Date = new Date(),
): string | null {
  const d = new Date(now.getTime());
  switch (range) {
    case "last_24h":
      d.setUTCDate(d.getUTCDate() - 1);
      break;
    case "last_7d":
      d.setUTCDate(d.getUTCDate() - 7);
      break;
    case "last_month":
      d.setUTCMonth(d.getUTCMonth() - 1);
      break;
    case "last_3m":
      d.setUTCMonth(d.getUTCMonth() - 3);
      break;
    case "last_6m":
      d.setUTCMonth(d.getUTCMonth() - 6);
      break;
    case "last_year":
      d.setUTCFullYear(d.getUTCFullYear() - 1);
      break;
    case "last_2y":
      d.setUTCFullYear(d.getUTCFullYear() - 2);
      break;
    case "last_5y":
      d.setUTCFullYear(d.getUTCFullYear() - 5);
      break;
    case "all":
      return null;
  }
  return d.toISOString().slice(0, 10);
}

/** Map the "Link status" sub-filter to the `discovered_status` column (New only). */
function discoveredStatusFor(linkStatus?: RefdomainLinkStatus): string | null {
  switch (linkStatus) {
    case "newly_published":
      return "pagefound";
    case "link_added":
      return "linkfound";
    case "link_restored":
      return "linkrestored";
    default:
      return null;
  }
}

/**
 * Build the `where` JSON expression from UI filters. Returns undefined when no
 * conditions apply (so the query param can be omitted entirely).
 */
export function buildWhere(filters: AhrefsFilters): string | undefined {
  const conditions: Condition[] = [];

  const keyword = filters.domainKeyword?.trim();
  if (keyword) {
    conditions.push({ field: "domain", is: ["isubstring", keyword] });
  }

  const status = filters.status ?? "all";
  const since = sinceDateFor(filters.range ?? "last_month");

  if (status === "new") {
    // Referring domains first seen within the window.
    if (since) conditions.push({ field: "first_seen", is: ["gte", since] });
    // Optional link-status refinement (how the link was discovered).
    const discovered = discoveredStatusFor(filters.linkStatus);
    if (discovered) {
      conditions.push({ field: "discovered_status", is: ["eq", discovered] });
    }
  } else if (status === "lost") {
    // Referring domains whose last live link was lost within the window.
    if (since) {
      conditions.push({ field: "last_seen", is: ["gte", since] });
    } else {
      conditions.push({ field: "lost_links", is: ["gt", 0] });
    }
  }
  // "all": no date/status condition — every current referring domain.

  if (conditions.length === 0) return undefined;
  return JSON.stringify({ and: conditions });
}

/**
 * The `history` value. "Lost" needs history (so lost rows are included);
 * "All"/"New" use the live snapshot (New is narrowed by first_seen in `where`).
 */
export function buildHistory(filters: AhrefsFilters): string {
  if ((filters.status ?? "all") === "lost") {
    const since = sinceDateFor(filters.range ?? "last_month");
    return since ? `since:${since}` : "all_time";
  }
  return "live";
}
