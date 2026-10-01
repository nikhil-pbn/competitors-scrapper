/**
 * Lightweight HTML content extraction for the dental check. Regex-based on
 * purpose: classification only needs readable text, metadata, links and
 * JSON-LD types, not a full DOM. (Ported from the dental-website-data-enricher.)
 */

export interface PageLink {
  url: string;
  text: string;
}

export interface PageContent {
  url: string;
  title: string;
  metaDescription: string;
  siteName: string;
  headings: string[];
  /** Visible text with whitespace collapsed. */
  text: string;
  links: PageLink[];
  /** Every `@type` found in JSON-LD, including nested and `@graph` items. */
  jsonLdTypes: string[];
  /** schema.org `medicalSpecialty` values from JSON-LD. */
  medicalSpecialties: string[];
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–",
  mdash: "—", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…",
  copy: "©", reg: "®", trade: "™", bull: "•", middot: "·", eacute: "é",
  aacute: "á", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1].toLowerCase() === "x"
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000
        ? String.fromCodePoint(code)
        : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

const collapse = (text: string) => text.replace(/\s+/g, " ").trim();

const BLOCK_END =
  /<\/(?:p|div|li|ul|ol|h[1-6]|tr|td|th|section|article|header|footer|nav|address|aside|main|figure|figcaption|blockquote|dt|dd|button|label|option)>|<(?:br|hr)\s*\/?>/gi;

/** Strips tags from an HTML fragment and returns its readable text. */
function htmlToText(fragment: string): string {
  return collapse(decodeEntities(fragment.replace(BLOCK_END, "\n").replace(/<[^>]+>/g, " ")));
}

function parseAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-z_:][-a-z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/gi;
  let match: RegExpExecArray | null;
  // Skip the tag name itself.
  const inner = tag.replace(/^<\s*[a-z0-9]+/i, "").replace(/\/?>$/, "");
  while ((match = re.exec(inner))) {
    attrs[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attrs;
}

function collectJsonLd(node: unknown, types: Set<string>, specialties: Set<string>) {
  if (Array.isArray(node)) {
    node.forEach((n) => collectJsonLd(n, types, specialties));
    return;
  }
  if (!node || typeof node !== "object") return;
  const record = node as Record<string, unknown>;
  const type = record["@type"];
  for (const t of Array.isArray(type) ? type : [type]) {
    if (typeof t === "string") types.add(t.replace(/^https?:\/\/schema\.org\//, ""));
  }
  const specialty = record.medicalSpecialty;
  for (const s of Array.isArray(specialty) ? specialty : [specialty]) {
    if (typeof s === "string") specialties.add(s.replace(/^https?:\/\/schema\.org\//, ""));
  }
  for (const value of Object.values(record)) {
    if (value && typeof value === "object") collectJsonLd(value, types, specialties);
  }
}

export function parseHtml(html: string, pageUrl: string): PageContent {
  const types = new Set<string>();
  const specialties = new Set<string>();
  for (const match of html.matchAll(
    /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      collectJsonLd(JSON.parse(match[1].trim()), types, specialties);
    } catch {
      // Malformed JSON-LD is common; ignore it.
    }
  }

  const title = htmlToText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");

  let metaDescription = "";
  let siteName = "";
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = parseAttributes(match[0]);
    const key = (attrs.name ?? attrs.property ?? "").toLowerCase();
    if (!metaDescription && (key === "description" || key === "og:description")) {
      metaDescription = collapse(attrs.content ?? "");
    }
    if (!siteName && key === "og:site_name") siteName = collapse(attrs.content ?? "");
  }

  const body = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|svg|template|iframe|head)\b[\s\S]*?<\/\1>/gi, " ");

  const headings = [...body.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((m) => htmlToText(m[2]))
    .filter(Boolean)
    .slice(0, 60);

  const links: PageLink[] = [];
  for (const match of body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = parseAttributes(`<a ${match[1]}>`).href?.trim();
    if (!href || href.startsWith("#") || /^(javascript|data|mailto|tel):/i.test(href)) continue;
    try {
      links.push({ url: new URL(href, pageUrl).href, text: htmlToText(match[2]).slice(0, 120) });
    } catch {
      continue;
    }
    if (links.length >= 500) break;
  }

  return {
    url: pageUrl,
    title,
    metaDescription,
    siteName,
    headings,
    text: htmlToText(body).slice(0, 100_000),
    links,
    jsonLdTypes: [...types],
    medicalSpecialties: [...specialties],
  };
}
