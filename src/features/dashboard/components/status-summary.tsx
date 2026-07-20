"use client";

import { Spinner } from "@/components/ui";
import type { Phase } from "@/features/dashboard/pipeline";

const BASE =
  "rounded-lg border px-4 py-3 text-sm flex items-center gap-3 flex-wrap";

/** Compact status/progress banner for the pipeline. */
export function StatusSummary({
  phase,
  domainCount,
  recordCount,
  progress,
  error,
}: {
  phase: Phase;
  domainCount: number;
  recordCount: number;
  progress: { done: number; total: number };
  error: string | null;
}) {
  if (phase === "idle") return null;

  if (phase === "error") {
    return (
      <div
        className={`${BASE} border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300`}
      >
        <span className="font-medium">Error:</span>
        <span>{error}</span>
      </div>
    );
  }

  if (phase === "ahrefs") {
    return (
      <div className={`${BASE} border-border bg-card`}>
        <Spinner /> Fetching referring domains from Ahrefs…
      </div>
    );
  }

  if (phase === "domains") {
    return (
      <div className={`${BASE} border-border bg-card`}>
        <span className="font-medium">{domainCount}</span> referring domains
        found. Review below, then analyze their websites to extract contact
        details.
      </div>
    );
  }

  if (phase === "analyze") {
    const pct = progress.total
      ? Math.round((progress.done / progress.total) * 100)
      : 0;
    return (
      <div className={`${BASE} border-border bg-card`}>
        <Spinner />
        <span>
          Analyzing websites {progress.done}/{progress.total} ({pct}%)
        </span>
        <div className="h-1.5 flex-1 min-w-30 overflow-hidden rounded-full bg-background">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  if (phase === "ready") {
    return (
      <div className={`${BASE} border-border bg-card`}>
        <span className="font-medium">{recordCount}</span> websites analyzed.
        Review the contact details below, then save to the worksheet.
      </div>
    );
  }

  // Save-flow feedback ("saving" / "saved") is shown next to the Save button
  // via <SaveStatus>, so it is intentionally not handled here.
  return null;
}
