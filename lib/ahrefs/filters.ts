import type { AhrefsFilters } from "./types";

/**
 * Ahrefs API v3 filter/`where` builder.
 *
 * The `where` parameter is a JSON boolean expression:
 *   {"and":[{"field":"<col>","is":["<op>",<value>]}, ...]}
 * Operators: eq, neq, gt, gte, lt, lte, substring, isubstring, prefix, suffix.
 *
 * NOTE on field identifiers: the `where` parameter recognizes different column
 * identifiers than `select`. The names below reflect the documented refdomains
 * columns; if the live API rejects one, confirm the exact identifier by building
 * the filter visually on ahrefs.com and pressing the "API {}" button.
 */

type Condition = { field: string; is: [string, ...unknown[]] };

/** First day of the previous month as YYYY-MM-DD (for `history=since:`). */
export function startOfLastMonth(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0-based; previous month = month - 1
  const d = new Date(Date.UTC(year, month - 1, 1));
  return d.toISOString().slice(0, 10);
}

/**
 * Build the `where` JSON expression from UI filters. Returns undefined when no
 * conditions apply (so the query param can be omitted entirely).
 */
export function buildWhere(filters: AhrefsFilters): string | undefined {
  const conditions: Condition[] = [];

  if (filters.domainKeyword?.trim()) {
    // Case-insensitive substring match on the referring domain name.
    conditions.push({
      field: "domain",
      is: ["isubstring", filters.domainKeyword.trim()],
    });
  }

  // Status: "new" -> domains with newly discovered links, "lost" -> lost links.
  // "all" (default) adds no status condition.
  //
  // NOTE: the sub-status (filters.linkStatus: newly_published / link_added /
  // link_restored / …) has no corresponding column in the refdomains API, so it
  // is a UI-level selection only and is not translated into a `where` clause
  // here. Confirm the exact query via ahrefs.com's "API {}" button if refdomains
  // gains support for it.
  if (filters.status === "new") {
    conditions.push({ field: "new_links", is: ["gt", 0] });
  } else if (filters.status === "lost") {
    conditions.push({ field: "lost_links", is: ["gt", 0] });
  }

  if (conditions.length === 0) return undefined;
  return JSON.stringify({ and: conditions });
}

/** The `history` value for the request, based on the "last month" filter. */
export function buildHistory(filters: AhrefsFilters): string {
  return filters.sinceLastMonth
    ? `since:${startOfLastMonth()}`
    : "live";
}
