"use client";

import { useCallback, useReducer, useRef } from "react";

import type { AppendSummary, BusinessRecord, ReferringDomain } from "@/lib/types";
import { analyzeDomains, appendToSheet } from "@/lib/client-api";
import { sourceKey } from "@/features/dashboard/keys";
import {
  initialPipelineState,
  pipelineReducer,
} from "@/features/dashboard/pipeline";
import { useDomainSources } from "@/features/dashboard/hooks/use-domain-sources";

export type { Competitor } from "@/features/dashboard/hooks/use-domain-sources";

const errMsg = (e: unknown, fallback: string) =>
  e instanceof Error ? e.message : fallback;

/**
 * Owns the Ahrefs → analyze → save pipeline. Source loaders (Search/Sample/
 * Paste/Upload) live in useDomainSources; here we add analyze + a per-tab save.
 * `onReset` fires whenever a new source loads or analysis starts.
 */
export function usePipeline(onReset: () => void) {
  const [state, dispatch] = useReducer(pipelineReducer, initialPipelineState);
  const savingRef = useRef(false);
  const { search, sample, usePasted, upload } = useDomainSources(
    dispatch,
    onReset,
  );

  // Phase 2: analyze each domain's website (streamed), carrying its competitor.
  const analyze = useCallback(
    async (domains: ReferringDomain[]) => {
      if (domains.length === 0) return;
      onReset();
      dispatch({ type: "analyzeStart", total: domains.length });

      const compByDomain = new Map(
        domains.map((d) => [sourceKey(d.domain), d.competitor]),
      );
      const tag = (r: BusinessRecord): BusinessRecord => ({
        ...r,
        competitor: compByDomain.get(sourceKey(r.source_url)),
      });

      try {
        await analyzeDomains(
          domains.map((d) => d.domain),
          {
            onProgress: (done, total, record) =>
              dispatch({ type: "progress", done, total, record: tag(record) }),
            onDone: (records) =>
              dispatch({ type: "analyzeDone", records: records.map(tag) }),
            onError: (message) => dispatch({ type: "fail", message }),
          },
        );
      } catch (e) {
        dispatch({ type: "fail", message: errMsg(e, "Analysis failed.") });
      }
    },
    [onReset],
  );

  // Phase 3: group the selected records by competitor and append to each tab.
  const save = useCallback(async (records: BusinessRecord[]) => {
    if (savingRef.current || records.length === 0) return;

    const groups = new Map<string, BusinessRecord[]>();
    for (const r of records) {
      if (!r.competitor) continue;
      const arr = groups.get(r.competitor) ?? [];
      arr.push(r);
      groups.set(r.competitor, arr);
    }
    if (groups.size === 0) {
      dispatch({
        type: "fail",
        message: "None of the selected rows have a competitor tab.",
      });
      return;
    }

    savingRef.current = true;
    dispatch({ type: "saveStart" });
    try {
      const summaries: AppendSummary[] = [];
      for (const [tab, group] of groups) {
        summaries.push(await appendToSheet(tab, group));
      }
      dispatch({ type: "saveDone", summaries });
    } catch (e) {
      dispatch({ type: "fail", message: errMsg(e, "Save failed.") });
    } finally {
      savingRef.current = false;
    }
  }, []);

  const busy =
    state.phase === "ahrefs" ||
    state.phase === "analyze" ||
    state.phase === "saving";

  return { ...state, busy, search, sample, usePasted, upload, analyze, save };
}
