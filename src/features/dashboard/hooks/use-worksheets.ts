"use client";

import { useEffect, useState } from "react";

import { loadWorksheets } from "@/lib/client-api";

/** Load worksheet (tab) names for the competitor dropdown (Phase 3 read). */
export function useWorksheets() {
  const [worksheets, setWorksheets] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWorksheets()
      .then(setWorksheets)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load worksheets."),
      );
  }, []);

  return { worksheets, error };
}
