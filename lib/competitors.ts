/**
 * Known competitor/vendor URLs, keyed by their worksheet name.
 *
 * Selecting a competitor in the dashboard auto-fills its URL (still editable).
 * Lookup is tolerant of spacing/casing differences between this list and the
 * actual worksheet tab names (e.g. "Flex Dental" vs "FlexDental").
 */
const COMPETITOR_URLS: Record<string, string> = {
  adit: "https://adit.com/",
  dentalintelligence: "https://www.dentalintel.com/",
  modento: "https://www.dentalintel.com/?redirect_from=modento",
  nexhealth: "https://www.nexhealth.com/",
  yapi: "https://yapiapp.com/",
  revenuewell: "https://www.revenuewell.com/",
  solutionreach: "https://www.solutionreach.com/",
  mango: "https://mangovoice.com/",
  flexdental: "https://flex.dental/",
  weave: "https://www.getweave.com/",
  lighthouse360: "https://www.lh360.com/",
};

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Return the preset URL for a competitor/worksheet name, or undefined. */
export function competitorUrlFor(name: string): string | undefined {
  return COMPETITOR_URLS[normalize(name)];
}
