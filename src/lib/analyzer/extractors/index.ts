/**
 * Pure, unit-testable extraction helpers for Phase 2. Each takes parsed HTML
 * and returns best-effort values ("" / [] when nothing is found). No network,
 * no side effects.
 */
export { parseHtml, extractJsonLd, type Dom } from "@/lib/analyzer/extractors/html";
export { extractAddress, type AddressParts } from "@/lib/analyzer/extractors/location";
export {
  extractPracticeName,
  extractEmails,
  extractPhones,
  extractDoctorName,
} from "@/lib/analyzer/extractors/contact-fields";
