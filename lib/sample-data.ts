import type { ReferringDomain } from "@/lib/types";

/**
 * Sample Phase 1 output (adit.com, "dent" keyword) mirroring the Ahrefs
 * Referring domains report. Used only for previewing the UI when live API
 * units are unavailable — clearly labeled as sample data in the dashboard.
 */
export const SAMPLE_REFERRING_DOMAINS: ReferringDomain[] = [
  row("rosecrestdental.com", 35, 63, 15, 15, 95, 29, 66, "2026-06-30"),
  row("ballantynefamilydental.com", 12, 276, 41, 41, 64, 10, 43, "2026-06-24"),
  row("andersonwinchesterdental.ca", 10, 48, 2, 2, 7, 4, 6, "2026-06-25"),
  row("dentaltechhub.com", 8, 0, 2, 2, 25, 291, 0, "2026-07-08"),
  row("wecaredentalpllc.com", 7, 86, 1, 1, 38, 11, 7, "2026-06-28"),
  row("sierradentalcare.com", 6, 253, 37, 2, 168, 14, 36, "2026-07-08"),
  row("harborpointedental.com", 4.7, 36, 1, 1, 38, 7, 4, "2026-07-14"),
  row("riversidedentalcenter.ca", 4.4, 125, 41, 41, 113, 14, 14, "2026-07-04"),
  row("parkcreekdentalcare.com", 2.3, 350, 11, 11, 36, 12, 183, "2026-07-01"),
  row("lakeviewdentistry.com", 1.4, 152, 5, 2, 40, 15, 55, "2026-06-30"),
  row("sbcosmeticdentistry.com", 1.3, 21, 50, 50, 42, 35, 7, "2026-07-01"),
  row("dentobees.com", 1.2, 2, 1, 1, 36, 21, 4, "2026-06-25"),
];

function row(
  domain: string,
  domainRating: number,
  trafficDomain: number,
  linksToTarget: number,
  dofollowLinks: number,
  dofollowRefdomains: number,
  dofollowLinkedDomains: number,
  keywords: number,
  firstSeen: string,
): ReferringDomain {
  return {
    domain,
    domainRating,
    trafficDomain,
    linksToTarget,
    dofollowLinks,
    dofollowRefdomains,
    dofollowLinkedDomains,
    keywords,
    firstSeen,
    lastSeen: null,
    newLinks: linksToTarget,
  };
}
