"use client";

import type { AppendSummary } from "@/lib/types";
import type { Phase } from "./status-summary";

/** Save-flow feedback shown next to the Save button (loading + success). */
export function SaveStatus({
  phase,
  worksheet,
  summary,
}: {
  phase: Phase;
  worksheet: string;
  summary: AppendSummary | null;
}) {
  if (phase === "saving") {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent" />
        <span>
          Saving to <span className="font-medium">{worksheet}</span>…
        </span>
      </div>
    );
  }

  if (phase === "saved" && summary) {
    return (
      <div className="save-pop mb-4 flex items-center gap-4 rounded-lg border border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-4 dark:border-green-900 dark:from-green-950/50 dark:to-emerald-950/40">
        <SuccessCheck />
        <div className="text-sm">
          <p className="font-semibold text-green-800 dark:text-green-300">
            Saved to “{summary.worksheet}”
          </p>
          <p className="text-green-700/90 dark:text-green-400/90">
            <span className="font-medium">{summary.added}</span> row
            {summary.added === 1 ? "" : "s"} added
            {summary.skippedDuplicates > 0 ? (
              <>
                {" · "}
                <span className="font-medium">
                  {summary.skippedDuplicates}
                </span>{" "}
                duplicate
                {summary.skippedDuplicates === 1 ? "" : "s"} skipped
              </>
            ) : null}
            {summary.added === 0 && summary.skippedDuplicates > 0
              ? " (all already in the sheet)"
              : ""}
          </p>
        </div>
      </div>
    );
  }

  return null;
}

/** Animated draw-in checkmark. */
function SuccessCheck() {
  return (
    <svg
      viewBox="0 0 52 52"
      className="h-10 w-10 shrink-0 text-green-600 dark:text-green-400"
      aria-hidden="true"
    >
      <circle
        className="check-circle"
        cx="26"
        cy="26"
        r="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="check-mark"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 27 l7 7 l15 -15"
      />
    </svg>
  );
}
