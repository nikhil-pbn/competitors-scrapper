"use client";

import { useCallback, useState } from "react";

import type { BusinessRecord } from "@/lib/types";
import { normalizeSourceUrl, sourceKey } from "@/features/dashboard/keys";

function without(set: Set<string>, key: string): Set<string> {
  if (!set.has(key)) return set;
  const next = new Set(set);
  next.delete(key);
  return next;
}

/**
 * Review-time overrides layered on top of the scraped results: URLs moved out
 * of the table, no-data URLs pulled back in, and hand-entered rows. Kept
 * separate from the pipeline so a new run can reset it in one call.
 */
export function useReview() {
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [included, setIncluded] = useState<Set<string>>(new Set());
  const [manual, setManual] = useState<BusinessRecord[]>([]);

  const reset = useCallback(() => {
    setExcluded(new Set());
    setIncluded(new Set());
    setManual([]);
  }, []);

  // Move a row out of the table into the no-data list.
  const exclude = useCallback((record: BusinessRecord) => {
    const key = sourceKey(record.source_url);
    setExcluded((prev) => new Set(prev).add(key));
    setIncluded((prev) => without(prev, key));
  }, []);

  // Pull a no/low-data URL back into the table (with whatever details it has).
  const includeFromNoData = useCallback((key: string) => {
    setIncluded((prev) => new Set(prev).add(key));
    setExcluded((prev) => without(prev, key));
  }, []);

  // Add a hand-researched row: it joins the table and un-excludes that URL.
  const addManual = useCallback((record: BusinessRecord) => {
    const normalized: BusinessRecord = {
      ...record,
      source_url: normalizeSourceUrl(record.source_url),
    };
    const key = sourceKey(normalized.source_url);
    setExcluded((prev) => without(prev, key));
    setManual((prev) => [
      ...prev.filter((r) => sourceKey(r.source_url) !== key),
      normalized,
    ]);
  }, []);

  return { excluded, included, manual, reset, exclude, includeFromNoData, addManual };
}
