"use client";

import { useCallback, type Dispatch } from "react";

import type { AhrefsFilters } from "@/lib/ahrefs/types";
import type { ReferringDomain } from "@/lib/types";
import { fetchDomains } from "@/lib/client-api";
import { parsePastedData, parseReferringDomainsFile } from "@/lib/parse";
import { SAMPLE_REFERRING_DOMAINS } from "@/lib/sample-data";
import { sourceKey } from "@/features/dashboard/keys";
import type { PipelineAction } from "@/features/dashboard/pipeline";

export interface Competitor {
  name: string;
  domain: string;
}

const errMsg = (e: unknown, fallback: string) =>
  e instanceof Error ? e.message : fallback;

/**
 * Phase-1 source loaders (Search / Sample / Paste / Upload) that produce the
 * referring-domain list. Search is multi-competitor (one Ahrefs call each,
 * tagged + deduped); the rest are single-competitor.
 */
export function useDomainSources(
  dispatch: Dispatch<PipelineAction>,
  onReset: () => void,
) {
  // Live: fetch referring domains for EACH competitor, tag + dedupe.
  const search = useCallback(
    async (competitors: Competitor[], filters: AhrefsFilters) => {
      if (competitors.length === 0) return;
      onReset();
      dispatch({ type: "fetchStart" });

      const seen = new Set<string>();
      const all: ReferringDomain[] = [];
      let firstError: string | null = null;

      for (const c of competitors) {
        try {
          const domains = await fetchDomains(c.domain, filters);
          for (const d of domains) {
            const key = sourceKey(d.domain);
            if (seen.has(key)) continue; // same domain across competitors → keep first
            seen.add(key);
            all.push({ ...d, competitor: c.name });
          }
        } catch (e) {
          if (!firstError) firstError = `${c.name}: ${errMsg(e, "fetch failed")}`;
        }
      }

      if (all.length === 0 && firstError) {
        dispatch({ type: "sourceError", message: firstError });
        return;
      }
      dispatch({ type: "domainsLoaded", domains: all, dataSource: "live" });
    },
    [dispatch, onReset],
  );

  // Preview with sample data, tagged to the single chosen competitor.
  const sample = useCallback(
    (competitor: string) => {
      onReset();
      dispatch({
        type: "domainsLoaded",
        domains: SAMPLE_REFERRING_DOMAINS.map((d) => ({ ...d, competitor })),
        dataSource: "sample",
      });
    },
    [dispatch, onReset],
  );

  // Pasted data (URL list, CSV/TSV, or an Ahrefs table), tagged to one competitor.
  const usePasted = useCallback(
    (text: string, competitor: string) => {
      onReset();
      const { domains, source } = parsePastedData(text);
      if (domains.length === 0) {
        dispatch({
          type: "sourceError",
          message:
            "No valid URLs or rows found. Paste a URL list, CSV, or Ahrefs table.",
        });
        return;
      }
      dispatch({
        type: "domainsLoaded",
        domains: domains.map((d) => ({ ...d, competitor })),
        dataSource: source,
      });
    },
    [dispatch, onReset],
  );

  // Uploaded CSV/TSV, tagged to one competitor.
  const upload = useCallback(
    async (file: File, competitor: string) => {
      onReset();
      try {
        const text = await file.text();
        const { domains, unmatchedHeaders } = parseReferringDomainsFile(text);
        if (domains.length === 0) {
          dispatch({
            type: "sourceError",
            message: "No rows found in the file. Check it has a header + data.",
          });
          return;
        }
        if (unmatchedHeaders.length > 0) {
          console.info("Ignored unrecognized columns:", unmatchedHeaders);
        }
        dispatch({
          type: "domainsLoaded",
          domains: domains.map((d) => ({ ...d, competitor })),
          dataSource: "upload",
        });
      } catch (e) {
        dispatch({
          type: "sourceError",
          message: errMsg(e, "Could not read the file."),
        });
      }
    },
    [dispatch, onReset],
  );

  return { search, sample, usePasted, upload };
}
