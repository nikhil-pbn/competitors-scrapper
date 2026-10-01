import "server-only";

import type { DentalCheck } from "@/lib/types";
import { mapWithConcurrency } from "@/lib/concurrency";
import { classifyContent } from "@/lib/dental/classifier";
import { parseHtml, type PageContent } from "@/lib/dental/html";

const USER_AGENT =
  "Mozilla/5.0 (compatible; ReferringDomainsBot/1.0; +internal-seo-tool)";
const FETCH_TIMEOUT_MS = 12_000;
const MAX_BYTES = 2_000_000;
const DEFAULT_CONCURRENCY = 8;

/**
 * Inner pages read alongside the homepage — at most one per kind, matched on
 * the link's URL path or its text. Order = priority when a link fits several.
 */
const PAGE_KINDS: { kind: string; pattern: RegExp }[] = [
  { kind: "services", pattern: /services?|treatments?|procedures?|what-we-do|solutions/i },
  { kind: "team", pattern: /team|doctors?|dentists?|staff|providers?|meet-(?:the|our)|meet (?:the|our)/i },
  { kind: "about", pattern: /about|our-practice|our-office|our practice|our office/i },
  { kind: "appointment", pattern: /appointments?|book(?:ing)?|schedule|request-a|new-patients?|new patients?/i },
  { kind: "locations", pattern: /locations?|offices?|directions|find-us|find us/i },
  { kind: "contact", pattern: /contact/i },
];
const INNER_PAGE_TIMEOUT_MS = 10_000;

type Fetched = { html: string; finalUrl: string } | { error: string };

const siteKey = (hostname: string) => hostname.toLowerCase().replace(/^www\./, "");

function describeError(error: unknown): string {
  const err = error as { name?: string; cause?: { code?: string } };
  if (err?.name === "TimeoutError" || err?.name === "AbortError") {
    return "The website did not respond in time.";
  }
  const code = err?.cause?.code ?? "";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "Domain could not be resolved (DNS lookup failed).";
  if (/CERT|SSL|TLS|SELF_SIGNED|ALTNAME|UNABLE_TO_VERIFY/.test(code)) return `SSL/TLS certificate problem (${code}).`;
  if (code) return `Connection failed (${code}).`;
  return "Website could not be reached.";
}

/** Fetch one page as HTML (size-capped). Never throws. */
async function fetchPage(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Fetched> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
        "Accept-Language": "en-US,en;q=0.8",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      await res.body?.cancel().catch(() => {});
      return {
        error: [403, 429, 503].includes(res.status)
          ? `Website blocks automated access (HTTP ${res.status}).`
          : `Website returned HTTP ${res.status}.`,
      };
    }
    const type = res.headers.get("content-type") ?? "";
    if (type && !/html/i.test(type)) {
      await res.body?.cancel().catch(() => {});
      return { error: `Homepage is not an HTML page (${type}).` };
    }
    const html = (await res.text()).slice(0, MAX_BYTES);
    return { html, finalUrl: res.url || url };
  } catch (error) {
    return { error: describeError(error) };
  }
}

/** Try https, https+www, then http; stop as soon as the site answers. */
async function fetchHomepage(host: string): Promise<Fetched> {
  let first: Fetched | null = null;
  for (const url of [`https://${host}/`, `https://www.${host}/`, `http://${host}/`]) {
    const page = await fetchPage(url);
    if ("html" in page) return page;
    first ??= page;
    // The server answered with an HTTP error; another scheme won't change it.
    if (/HTTP \d+|not an HTML page/.test(page.error)) break;
  }
  return first!;
}

/** One same-site link per page kind (services, team, about, …), in priority order. */
function pickInnerPages(home: PageContent): string[] {
  const homeUrl = new URL(home.url);
  const key = siteKey(homeUrl.hostname);
  const picked = new Map<string, string>();
  const seen = new Set<string>([homeUrl.origin + homeUrl.pathname]);

  for (const link of home.links) {
    let url: URL;
    try {
      url = new URL(link.url);
    } catch {
      continue;
    }
    if (siteKey(url.hostname) !== key || !/^https?:$/.test(url.protocol)) continue;
    if (/\.(pdf|jpe?g|png|gif|webp|zip|docx?)$/i.test(url.pathname)) continue;
    url.hash = "";
    const page = url.origin + url.pathname;
    if (seen.has(page)) continue;

    let path = url.pathname;
    try {
      path = decodeURIComponent(path);
    } catch {
      // Malformed escape; match on the raw path.
    }
    const match = PAGE_KINDS.find(
      ({ kind, pattern }) =>
        !picked.has(kind) && (pattern.test(path) || pattern.test(link.text)),
    );
    if (match) {
      picked.set(match.kind, url.href);
      seen.add(page);
      if (picked.size === PAGE_KINDS.length) break;
    }
  }

  return PAGE_KINDS.map((k) => picked.get(k.kind)).filter((u): u is string => !!u);
}

/**
 * Decide whether one referring domain is a dental practice website, from the
 * content of its homepage plus its key inner pages (services, team, …).
 * Always resolves — unreachable sites come back as `Failed`.
 */
export async function classifyDomain(domain: string): Promise<DentalCheck> {
  const host = siteKey(
    domain.trim().replace(/^https?:\/\//i, "").replace(/[/?#].*$/, ""),
  );
  if (!host.includes(".")) {
    return { status: "Failed", confidence: "Low", reason: `"${domain}" is not a valid domain.` };
  }

  const home = await fetchHomepage(host);
  if ("error" in home) return { status: "Failed", confidence: "Low", reason: home.error };

  const homeContent = parseHtml(home.html, home.finalUrl);
  const finalHost = siteKey(new URL(home.finalUrl).hostname);
  const redirectedTo = finalHost !== host ? finalHost : undefined;

  // Read the site's key inner pages (services, team, about, appointment,
  // locations, contact) in parallel, then judge all pages together.
  const inner = await Promise.all(
    pickInnerPages(homeContent).map((url) => fetchPage(url, INNER_PAGE_TIMEOUT_MS)),
  );
  const pages: PageContent[] = [
    homeContent,
    ...inner.flatMap((p) => ("html" in p ? [parseHtml(p.html, p.finalUrl)] : [])),
  ];
  const result = classifyContent({ pages, redirectedTo });

  return {
    status: result.status,
    confidence: result.confidence,
    reason: result.reason,
    pagesChecked: pages.map((p) => p.url),
  };
}

export interface ClassifyProgress {
  done: number;
  total: number;
  domain: string;
  check: DentalCheck;
}

/** Classify many domains with bounded concurrency (drives SSE streaming). */
export async function classifyDomains(
  domains: string[],
  options: {
    concurrency?: number;
    onProgress?: (progress: ClassifyProgress) => void;
  } = {},
): Promise<DentalCheck[]> {
  return mapWithConcurrency(
    domains,
    options.concurrency ?? DEFAULT_CONCURRENCY,
    classifyDomain,
    (check, index, done) =>
      options.onProgress?.({ done, total: domains.length, domain: domains[index], check }),
  );
}
