import { emptyBusinessRecord, type BusinessRecord } from "@/lib/types";
import { isRealEmail, isRealPhone } from "@/lib/contact-quality";
import {
  extractAddress,
  extractDoctorName,
  extractEmails,
  extractPhones,
  extractPracticeName,
  parseHtml,
} from "@/lib/analyzer/extractors";

/**
 * Turn a fetched HTML page into a normalized BusinessRecord. Pure given the
 * html + source url, so it can be tested against saved fixtures.
 */
export function normalizeFromHtml(
  sourceUrl: string,
  html: string,
): BusinessRecord {
  const $ = parseHtml(html);
  const { location, state } = extractAddress($);
  const emails = extractEmails($);
  const phones = extractPhones($);

  return {
    practice_name: extractPracticeName($),
    doctor_name: extractDoctorName($),
    office_manager_name: "", // rarely published; left blank (best-effort)
    // Prefer a real-looking value; otherwise keep the best candidate so it can
    // be shown (in red) in the table — it's stripped before saving to the sheet.
    phone: phones.find(isRealPhone) ?? phones[0] ?? "",
    email: emails.find(isRealEmail) ?? emails[0] ?? "",
    location,
    State: state,
    source_url: sourceUrl,
  };
}

export { emptyBusinessRecord };
export type { BusinessRecord };
