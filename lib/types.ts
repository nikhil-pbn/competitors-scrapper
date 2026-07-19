/**
 * Shared domain models.
 *
 * The pipeline is three independent phases and the output of one phase is the
 * input of the next:
 *
 *   Phase 1 (Ahrefs)   -> ReferringDomain[]
 *   Phase 2 (Analyzer) -> BusinessRecord[]   (input: ReferringDomain[])
 *   Phase 3 (Sheets)   -> AppendSummary       (input: BusinessRecord[])
 *
 * Keep these types free of any phase-specific implementation detail so each
 * module can be developed and tested in isolation.
 */

/**
 * Phase 1 output: one filtered referring domain plus its Ahrefs metrics.
 * Columns mirror the Ahrefs "Referring domains" report.
 */
export interface ReferringDomain {
  /** Bare referring domain, e.g. "brightdentalcare.com". */
  domain: string;
  /** Ahrefs Domain Rating (0-100). */
  domainRating: number | null;
  /** Estimated organic traffic of the referring domain. */
  trafficDomain: number | null;
  /** Number of links from this domain to the target. */
  linksToTarget: number | null;
  /** Dofollow links from this domain to the target. */
  dofollowLinks: number | null;
  /** Dofollow referring domains of this domain. */
  dofollowRefdomains: number | null;
  /** Dofollow linked domains of this domain. */
  dofollowLinkedDomains: number | null;
  /** Keywords the referring domain ranks for (positions). */
  keywords: number | null;
  /** ISO date the link was first seen. */
  firstSeen: string | null;
  /** ISO date the link was last seen (null if still live). */
  lastSeen: string | null;
  /** Count of newly discovered links from this domain in the period. */
  newLinks: number | null;
}

/**
 * Phase 2 output: normalized business/contact information for one website.
 *
 * Field names intentionally mirror the master spreadsheet's column headers
 * (snake_case) so Phase 3 can map by header name. Every field is optional at
 * the data level — Phase 2 is best-effort and blanks are acceptable.
 */
export interface BusinessRecord {
  practice_name: string;
  doctor_name: string;
  office_manager_name: string;
  phone: string;
  email: string;
  /** Free-form location (typically "City, ST" or a street address). */
  location: string;
  /** US state (full name or abbreviation, as extracted). */
  State: string;
  /** The referring domain / page the record was extracted from. */
  source_url: string;
}

/** The canonical column keys written to Google Sheets, in preferred order. */
export const BUSINESS_RECORD_FIELDS: (keyof BusinessRecord)[] = [
  "practice_name",
  "doctor_name",
  "office_manager_name",
  "phone",
  "email",
  "location",
  "State",
  "source_url",
];

/**
 * True if a record has at least one extracted contact field (anything beyond
 * source_url). Used to exclude "nothing found" domains from the results table.
 */
export function hasContactData(r: BusinessRecord): boolean {
  return Boolean(
    r.practice_name ||
      r.doctor_name ||
      r.office_manager_name ||
      r.phone ||
      r.email ||
      r.location ||
      r.State,
  );
}

/** An empty record with the given source URL — used as the best-effort fallback. */
export function emptyBusinessRecord(sourceUrl: string): BusinessRecord {
  return {
    practice_name: "",
    doctor_name: "",
    office_manager_name: "",
    phone: "",
    email: "",
    location: "",
    State: "",
    source_url: sourceUrl,
  };
}

/** Phase 3 result: outcome of appending records to a worksheet. */
export interface AppendSummary {
  worksheet: string;
  /** Rows actually appended. */
  added: number;
  /** Records skipped because their source_url already existed. */
  skippedDuplicates: number;
  /** Total records received for this append. */
  received: number;
}
