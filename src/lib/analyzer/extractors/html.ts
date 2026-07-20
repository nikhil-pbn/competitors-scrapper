import * as cheerio from "cheerio";

/**
 * Shared HTML/JSON-LD utilities for the Phase 2 extractors. Pure — no network,
 * no side effects.
 */

export type Dom = cheerio.CheerioAPI;

export function parseHtml(html: string): Dom {
  return cheerio.load(html);
}

/** Collect and parse all JSON-LD blocks into a flat list of objects. */
export function extractJsonLd($: Dom): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw.trim()) return;
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item && typeof item === "object") {
          out.push(item as Record<string, unknown>);
          // @graph nesting is common
          const graph = (item as Record<string, unknown>)["@graph"];
          if (Array.isArray(graph)) {
            for (const g of graph) {
              if (g && typeof g === "object") {
                out.push(g as Record<string, unknown>);
              }
            }
          }
        }
      }
    } catch {
      // Ignore malformed JSON-LD.
    }
  });
  return out;
}

export function typeMatches(
  node: Record<string, unknown>,
  needles: string[],
): boolean {
  const t = node["@type"];
  const types = Array.isArray(t) ? t : [t];
  return types.some(
    (x) =>
      typeof x === "string" &&
      needles.some((n) => x.toLowerCase().includes(n)),
  );
}
