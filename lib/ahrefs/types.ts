/** Primary status selector, matching the Ahrefs New / Lost / All tabs. */
export type RefdomainStatus = "all" | "new" | "lost";

/**
 * Sub-status ("Status" dropdown in Ahrefs), only meaningful when status is
 * "new" or "lost". "newly_published" / "link_added" are only available for
 * links checked since April 2021.
 */
export type RefdomainLinkStatus =
  | "any"
  | "newly_published"
  | "link_added"
  | "link_restored"
  | "link_removed"
  | "link_lost";

/** Phase 1 input: the search target + configurable filters. */
export interface AhrefsFilters {
  /** Referring domain name must contain this keyword (case-insensitive), e.g. "dent". */
  domainKeyword?: string;
  /** Primary status filter: all (default), only new, or only lost. */
  status?: RefdomainStatus;
  /** Sub-status; applies only when status is "new" or "lost". */
  linkStatus?: RefdomainLinkStatus;
  /** Restrict to links first seen since the start of last month. */
  sinceLastMonth?: boolean;
  /** Max rows to fetch from Ahrefs (default 1000). */
  limit?: number;
}

export interface AhrefsSearchInput {
  /** The competitor domain to analyze, e.g. "adit.com". */
  target: string;
  filters: AhrefsFilters;
}
