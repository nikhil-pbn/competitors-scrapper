import { extractJsonLd, type Dom } from "@/lib/analyzer/extractors/html";

const US_STATES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS",
  missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
  oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI",
  wyoming: "WY", "district of columbia": "DC",
};

const STATE_ABBRS = new Set(Object.values(US_STATES));

export interface AddressParts {
  location: string;
  state: string;
}

function normalizeState(value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (STATE_ABBRS.has(v.toUpperCase())) return v.toUpperCase();
  const full = US_STATES[v.toLowerCase()];
  return full ?? v;
}

/** Address/location + US state: JSON-LD PostalAddress → text regex fallback. */
export function extractAddress($: Dom): AddressParts {
  for (const node of extractJsonLd($)) {
    const addr = node.address as Record<string, unknown> | undefined;
    if (addr && typeof addr === "object") {
      const locality = (addr.addressLocality as string) ?? "";
      const region = (addr.addressRegion as string) ?? "";
      const street = (addr.streetAddress as string) ?? "";
      const parts = [street, locality, region].filter(Boolean);
      if (parts.length > 0) {
        return {
          location: parts.join(", "),
          state: normalizeState(region),
        };
      }
    }
  }

  // Fallback: look for "City, ST 12345" in the body text.
  const bodyText = $("body").text().replace(/\s+/g, " ");
  const m = bodyText.match(/([A-Za-z .'-]+),\s*([A-Z]{2})\s+\d{5}/);
  if (m && STATE_ABBRS.has(m[2])) {
    return { location: `${m[1].trim()}, ${m[2]}`, state: m[2] };
  }
  return { location: "", state: "" };
}
