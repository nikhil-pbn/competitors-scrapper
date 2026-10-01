import type { DentalCheck } from "@/lib/types";
import type { PageContent } from "@/lib/dental/html";

/**
 * Content-based dental practice classification. Ported from the
 * dental-website-data-enricher so both tools agree on what counts as dental.
 *
 * The decision uses only what the fetched pages say: page text, title,
 * headings, meta description and JSON-LD. The domain name is never used as
 * evidence, so "smilefamilydental.com" is only Dental if its content says so.
 *
 * "Dental" means a dental practice or dentistry organization that treats
 * patients. Dental-industry businesses that serve dentists (manufacturers,
 * suppliers, software, marketing agencies, schools) are Non-Dental.
 */

interface Term {
  label: string;
  pattern: RegExp;
}

const term = (label: string, pattern?: string): Term => ({
  label,
  pattern: new RegExp(`\\b(?:${pattern ?? label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\b`, "i"),
});

/** Words that identify dentistry as a profession or specialty. */
const PROVIDER_TERMS: Term[] = [
  term("dentist", "dentists?"),
  term("dentistry"),
  term("dental practice", "dental (?:practice|office|clinic|center|centre|care|group|team)"),
  term("orthodontics", "orthodontics?|orthodontists?"),
  term("pediatric dentistry", "p(?:a)?ediatric dent(?:istry|ist|al)|children'?s dentistry|kids'? dentist"),
  term("periodontics", "periodontics|periodontists?"),
  term("endodontics", "endodontics|endodontists?"),
  term("prosthodontics", "prosthodontics|prosthodontists?"),
  term("oral surgery", "oral (?:and|&) maxillofacial|oral surgery|oral surgeons?"),
  term("DDS", "D\\.?D\\.?S\\.?"),
  term("DMD", "D\\.?M\\.?D\\.?"),
];

/** Treatments a patient-facing dental practice typically lists. */
const SERVICE_TERMS: Term[] = [
  term("dental cleanings", "(?:teeth|dental) cleanings?|cleanings? (?:and|&) exams?|hygiene visits?"),
  term("dental exams", "dental (?:exams?|check-?ups?)"),
  term("fillings", "(?:tooth-colored |composite |dental )fillings?"),
  term("crowns", "dental crowns?|crowns? (?:and|&) bridges?|same[- ]day crowns?"),
  term("dental implants", "dental implants?|implant dentistry|all-on-(?:4|four|x)"),
  term("root canals", "root canals?"),
  term("extractions", "tooth extractions?|extractions|wisdom teeth"),
  term("dentures", "dentures?|partials"),
  term("veneers", "veneers?"),
  term("teeth whitening", "teeth whitening|tooth whitening"),
  term("Invisalign", "invisalign|clear aligners?"),
  term("braces", "braces"),
  term("gum disease treatment", "gum disease|periodontal (?:therapy|treatment|disease)|scaling (?:and|&) root planing"),
  term("cosmetic dentistry", "cosmetic dentistry|smile makeovers?"),
  term("sedation dentistry", "sedation dentistry|sleep dentistry|nitrous oxide"),
  term("emergency dental care", "emergency (?:dental|dentist)|dental emergenc(?:y|ies)"),
  term("sealants and fluoride", "sealants?|fluoride"),
  term("TMJ treatment", "tmj|tmd"),
  term("bonding", "dental bonding|cosmetic bonding"),
];

/** Cues that the site serves patients of a practice. */
const PATIENT_TERMS: Term[] = [
  term("new patients", "new patients?"),
  term("appointment booking", "(?:book|schedule|request)(?: an| your)? (?:appointment|visit|consultation)"),
  term("dental insurance", "dental insurance|insurance (?:we accept|accepted)|we accept (?:most )?(?:dental )?insurance"),
  term("patient forms", "patient (?:forms|information|portal)"),
  term("meet the doctor", "meet (?:the |our )?(?:doctors?|dentists?|dr\\.?|team)|our (?:doctors|dentists)"),
  term("office hours", "office hours"),
  term("smile", "your (?:best |healthy |beautiful )?smile"),
];

/** Businesses that sell to or serve dental practices rather than patients. */
const VENDOR_TERMS: Term[] = [
  term("online store", "add to cart|shopping cart|view cart|checkout|shop now|free shipping"),
  term("product catalog", "product catalog|our products|product line|sku|item #"),
  term("manufacturer", "manufactur(?:er|ers|ing)|distributors?|wholesale"),
  term("dental supplies", "dental (?:supplies|supply|equipment|instruments|materials|products)"),
  term("dental laboratory", "dental (?:lab|laboratory|laboratories)"),
  term("practice marketing", "dental marketing|marketing for dentists|seo for dentists|grow your (?:dental )?practice|more new patients for your practice"),
  term("practice software", "practice management software|dental software|request a demo|book a demo|schedule a demo"),
  term("billing services", "dental billing|revenue cycle|insurance verification services|credentialing services"),
  term("for dental professionals", "for dental professionals|for dentists|for your practice|clinicians and practices|dental practices nationwide"),
  term("practice coaching", "seminars?|practice coaching|dental coaching|dental consulting|consulting for dentists|business of dentistry|dental business"),
  term("dental training school", "dental assist(?:ant|ing) (?:school|program|training|course)s?|job placement|enroll (?:now|today)|campus(?:es)?"),
];

/** Organizations that own or support multiple dental practices. */
const DSO_TERMS: Term[] = [
  term("dental support organization", "dental support organi[sz]ations?|DSOs?"),
  term("practice affiliation", "affiliat(?:e|ion) with us|partner(?:ship)? with us|join (?:our|the) (?:family|network) of (?:dental )?practices|partner practices|supported practices"),
  term("practice management support", "operational support|administrative support|practice management (?:and|&) support|support (?:our|your) (?:private(?:ly owned)? )?(?:dental )?(?:practices|offices)"),
];

const INSTITUTION_TERM = term("university", "university|college|school of (?:dental )?medicine");
const ACADEMIC_TERMS: Term[] = [
  term("admissions", "admissions|apply now|tuition|degree programs?|academic programs?|prospective students"),
];

/** Other health care fields, used to explain Non-Dental results. */
const OTHER_HEALTH_TERMS: Term[] = [
  term("hospital", "hospitals?|health system|medical center"),
  term("orthopedics", "orthop(?:a)?edic(?:s)?|sports medicine"),
  term("dermatology", "dermatolog(?:y|ist|ists)"),
  term("podiatry", "podiatr(?:y|ist|ists)"),
  term("physical therapy", "physical therapy|physiotherapy"),
  term("mental health", "mental health|behavioral health|psychiatr(?:y|ic)|addiction treatment|therapy for"),
  term("oncology", "cancer|oncology"),
  term("pharmacy", "pharmacy|prescriptions?"),
  term("home health", "home health|hospice|senior living|assisted living"),
  term("primary care", "primary care|family medicine|internal medicine|pediatricians?|urgent care"),
  term("optometry", "optometr(?:y|ist)|eye care|vision clinic"),
  term("IV therapy", "iv therapy|infusions?|iv hydration"),
  term("naturopathy", "naturopath(?:y|ic)"),
  term("speech therapy", "speech therapy|speech-language"),
  term("chiropractic", "chiropract(?:ic|or)"),
];

const PARKED_PATTERNS =
  /this domain (?:is|may be) for sale|buy this domain|domain (?:is )?parked|parked (?:free|domain)|related searches|sedoparking|dan\.com|hugedomains/i;

const DENTAL_SCHEMA_TYPES = new Set(["Dentist"]);
const DENTAL_SPECIALTIES = /dent|orthodont|periodont|endodont|prosthodont|oral/i;

function matchTerms(terms: Term[], text: string): string[] {
  return terms.filter((t) => t.pattern.test(text)).map((t) => t.label);
}

function listLabels(labels: string[], max = 4): string {
  const shown = labels.slice(0, max);
  return shown.length < labels.length
    ? `${shown.join(", ")} and ${labels.length - shown.length} more`
    : shown.join(", ");
}

export interface ClassificationInput {
  pages: PageContent[];
  /** Hostname of the final page when it differs from the requested domain. */
  redirectedTo?: string;
}

export interface ClassificationSignals {
  providers: string[];
  headlineProviders: string[];
  services: string[];
  patient: string[];
  vendor: string[];
  headlineVendor: string[];
  /** Institution named in the headline and academic content on the page. */
  education: string[];
  dso: string[];
  headlineDso: string[];
  otherHealth: string[];
  headlineOtherHealth: string[];
  schemaDentist: boolean;
  textLength: number;
  parked: boolean;
}

export function collectSignals(pages: PageContent[]): ClassificationSignals {
  const headline = pages
    .map((p) => [p.title, p.siteName, p.metaDescription, ...p.headings.slice(0, 10)].join(" \n "))
    .join(" \n ");
  const body = pages.map((p) => p.text).join(" \n ");
  const all = `${headline} \n ${body}`;

  const schemaDentist = pages.some(
    (p) =>
      p.jsonLdTypes.some((t) => DENTAL_SCHEMA_TYPES.has(t)) ||
      p.medicalSpecialties.some((s) => DENTAL_SPECIALTIES.test(s)),
  );

  return {
    providers: matchTerms(PROVIDER_TERMS, all),
    headlineProviders: matchTerms(PROVIDER_TERMS, headline),
    services: matchTerms(SERVICE_TERMS, all),
    patient: matchTerms(PATIENT_TERMS, all),
    vendor: matchTerms(VENDOR_TERMS, all),
    headlineVendor: matchTerms(VENDOR_TERMS, headline),
    education:
      INSTITUTION_TERM.pattern.test(headline) && matchTerms(ACADEMIC_TERMS, all).length
        ? ["university", ...matchTerms(ACADEMIC_TERMS, all)]
        : [],
    dso: matchTerms(DSO_TERMS, all),
    headlineDso: matchTerms(DSO_TERMS, headline),
    otherHealth: matchTerms(OTHER_HEALTH_TERMS, all),
    headlineOtherHealth: matchTerms(OTHER_HEALTH_TERMS, headline),
    schemaDentist,
    textLength: body.length,
    parked: PARKED_PATTERNS.test(all) && body.length < 3000,
  };
}

/** Minimum readable characters for a page to be judged on its content. */
const THIN_CONTENT = 400;

export function classifyContent({ pages, redirectedTo }: ClassificationInput): DentalCheck & {
  signals: ClassificationSignals;
} {
  const s = collectSignals(pages);
  const redirectNote = redirectedTo ? ` (redirected to ${redirectedTo})` : "";
  const result = (
    status: DentalCheck["status"],
    confidence: DentalCheck["confidence"],
    reason: string,
  ) => ({ status, confidence, reason: reason + redirectNote, signals: s });

  if (s.parked) {
    return result("Non-Dental", "Medium", "Domain appears to be parked or for sale; no practice website found.");
  }

  const practiceScore =
    s.providers.length * 2 +
    s.headlineProviders.length * 3 +
    s.services.length +
    s.patient.length +
    (s.schemaDentist ? 6 : 0);
  const vendorScore = s.vendor.length * 2 + s.headlineVendor.length * 3;
  const treatsPatients = s.services.length >= 2 || s.patient.length >= 2 || s.schemaDentist;
  const dentalIndustry = s.providers.length > 0;

  // Dental support organizations operate dental practices: a dentistry
  // organization, so Dental, but flagged so they can be told apart.
  if (dentalIndustry && (s.headlineDso.length || s.dso.length >= 2)) {
    return result(
      "Dental",
      "Medium",
      `Dental support organization (DSO) that operates or supports dental practices: content refers to ${listLabels(s.dso)}.`,
    );
  }

  // A dental-industry business that sells to practices, not a practice.
  const vendorHeadline = s.headlineVendor.length > 0 && s.services.length < 2 && !s.schemaDentist;
  if (
    dentalIndustry &&
    (vendorHeadline ||
      (vendorScore >= 6 && vendorScore > s.patient.length * 2 + (s.schemaDentist ? 6 : 0)))
  ) {
    return result(
      "Non-Dental",
      vendorScore >= 10 ? "High" : "Medium",
      `Dental-industry business rather than a practice: content points to ${listLabels(s.vendor)}.`,
    );
  }

  if (s.education.length && !s.headlineProviders.length && !s.schemaDentist) {
    return result(
      "Non-Dental",
      "Medium",
      `Educational institution (${listLabels(s.education)}), not a dental practice website.`,
    );
  }

  if (
    s.headlineOtherHealth.length &&
    !s.headlineProviders.length &&
    !s.schemaDentist &&
    practiceScore < 8
  ) {
    return result(
      "Non-Dental",
      practiceScore <= 2 ? "High" : "Medium",
      `Health care provider in another field (${listLabels(s.headlineOtherHealth)}); no dental practice content.`,
    );
  }

  if (practiceScore >= 12 && s.providers.length >= 1 && treatsPatients) {
    const evidence = [
      s.schemaDentist && "structured data identifies a dentist",
      s.providers.length && `mentions ${listLabels(s.providers, 3)}`,
      s.services.length && `lists services such as ${listLabels(s.services, 4)}`,
      s.patient.length && `has patient cues (${listLabels(s.patient, 3)})`,
    ].filter(Boolean);
    return result("Dental", "High", `Website represents a dental practice: ${evidence.join("; ")}.`);
  }

  if (practiceScore >= 7 && s.providers.length >= 1 && (treatsPatients || s.headlineProviders.length)) {
    return result(
      "Dental",
      "Medium",
      `Likely a dental practice: mentions ${listLabels(s.providers, 3)}${
        s.services.length ? ` and ${listLabels(s.services, 3)}` : ""
      }, but practice details are limited.`,
    );
  }

  if (s.textLength < THIN_CONTENT) {
    return result(
      "Unknown",
      "Low",
      `Website has too little readable content to classify (${s.textLength} characters); it may require JavaScript.`,
    );
  }

  const dentalRefs = [...s.providers, ...s.services];
  if (practiceScore >= 3 && dentalRefs.length) {
    return result(
      "Unknown",
      "Low",
      `Some dental references (${listLabels(dentalRefs, 4)}) but not enough to confirm a dental practice.`,
    );
  }

  if (s.otherHealth.length && !dentalRefs.length) {
    return result(
      "Non-Dental",
      "Medium",
      `No dental practice content; the site refers to ${listLabels(s.otherHealth)}.`,
    );
  }

  return result(
    "Non-Dental",
    s.textLength > 1500 && practiceScore === 0 ? "High" : "Medium",
    dentalRefs.length === 0
      ? "Website content has no references to dentistry or dental services."
      : "Website content has only incidental dental references; it does not represent a dental practice.",
  );
}
