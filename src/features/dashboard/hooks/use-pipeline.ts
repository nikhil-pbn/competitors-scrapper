"use client";

import { useCallback, useReducer, useRef } from "react";

import type { AhrefsFilters } from "@/lib/ahrefs/types";
import type { BusinessRecord, ReferringDomain } from "@/lib/types";
import { analyzeDomains, appendToSheet, fetchDomains } from "@/lib/client-api";
import { parsePastedData, parseReferringDomainsFile } from "@/lib/parse";
import { SAMPLE_REFERRING_DOMAINS } from "@/lib/sample-data";
import { initialPipelineState, pipelineReducer } from "@/features/dashboard/pipeline";

const errMsg = (e: unknown, fallback: string) =>
  e instanceof Error ? e.message : fallback;

/**
 * Owns the Ahrefs → analyze → save pipeline: state (via the reducer) plus the
 * async actions that drive it. `onReset` fires whenever a new source loads or
 * analysis starts, so review-time overrides can be cleared in lockstep.
 */
export function usePipeline(onReset: () => void) {
  const [state, dispatch] = useReducer(pipelineReducer, initialPipelineState);
  // Synchronous guard so rapid double-clicks can't fire concurrent saves.
  const savingRef = useRef(false);

  // Phase 1 (live): fetch referring domains from Ahrefs.
  const search = useCallback(
    async (target: string, filters: AhrefsFilters) => {
      if (!target.trim()) return;
      onReset();
      dispatch({ type: "fetchStart" });
      try {
        const domains = await fetchDomains(target.trim(), filters);
        dispatch({ type: "domainsLoaded", domains, dataSource: "live" });
      } catch (e) {
        dispatch({ type: "sourceError", message: errMsg(e, "Search failed.") });
      }
    },
    [onReset],
  );

  // Preview the Phase 1 table with sample data (no API units consumed).
  const sample = useCallback(() => {
    onReset();
    dispatch({
      type: "domainsLoaded",
      domains: SAMPLE_REFERRING_DOMAINS,
      dataSource: "sample",
    });
  }, [onReset]);

  // Use pasted data (URL list, CSV/TSV, or an Ahrefs web-table copy).
  const usePasted = useCallback(
    (text: string) => {
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
      dispatch({ type: "domainsLoaded", domains, dataSource: source });
    },
    [onReset],
  );

  // Upload a CSV/TSV of previously-fetched domains, skipping the Ahrefs step.
  const upload = useCallback(
    async (file: File) => {
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
        dispatch({ type: "domainsLoaded", domains, dataSource: "upload" });
      } catch (e) {
        dispatch({
          type: "sourceError",
          message: errMsg(e, "Could not read the file."),
        });
      }
    },
    [onReset],
  );

  // Phase 2: analyze each referring domain's website (streamed via SSE).
  const analyze = useCallback(
    async (domains: ReferringDomain[]) => {
      if (domains.length === 0) return;
      onReset();
      dispatch({ type: "analyzeStart", total: domains.length });
      try {
        await analyzeDomains(
          domains.map((d) => d.domain),
          {
            onProgress: (done, total, record) =>
              dispatch({ type: "progress", done, total, record }),
            onDone: (records) => dispatch({ type: "analyzeDone", records }),
            onError: (message) => dispatch({ type: "fail", message }),
          },
        );
      } catch (e) {
        dispatch({ type: "fail", message: errMsg(e, "Analysis failed.") });
      }
    },
    [onReset],
  );

  // Phase 3: append the reviewed records to the chosen worksheet.
  const save = useCallback(async (worksheet: string, records: BusinessRecord[]) => {
    if (savingRef.current || records.length === 0 || !worksheet) return;
    savingRef.current = true;
    dispatch({ type: "saveStart" });
    try {
      const summary = await appendToSheet(worksheet, records);
      dispatch({ type: "saveDone", summary });
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
