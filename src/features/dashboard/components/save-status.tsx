"use client";

import type { AppendSummary } from "@/lib/types";
import { Spinner } from "@/components/ui";
import type { Phase } from "@/features/dashboard/pipeline";

/** Save-flow feedback shown next to the Save button (loading + per-tab success). */
export function SaveStatus({
  phase,
  summaries,
}: {
  phase: Phase;
  summaries: AppendSummary[];
}) {
  if (phase === "saving") {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm">
        <Spinner />
        <span>Saving to competitor tabs…</span>
      </div>
    );
  }

  if (phase === "saved" && summaries.length > 0) {
    const totalAdded = summaries.reduce((n, s) => n + s.added, 0);
    const totalUpdated = summaries.reduce((n, s) => n + s.updated, 0);

    return (
      <div className="save-pop mb-4 flex items-start gap-4 rounded-lg border border-green-300 bg-linear-to-r from-green-50 to-emerald-50 px-4 py-4 dark:border-green-900 dark:from-green-950/50 dark:to-emerald-950/40">
        <SuccessCheck />
        <div className="text-sm">
          <p className="font-semibold text-green-800 dark:text-green-300">
            Saved to {summaries.length} tab
            {summaries.length === 1 ? "" : "s"} · {totalAdded} added ·{" "}
            {totalUpdated} updated
          </p>
          <ul className="mt-1 space-y-0.5 text-green-700/90 dark:text-green-400/90">
            {summaries.map((s) => (
              <li key={s.worksheet}>
                <span className="font-medium">{s.worksheet}</span>: {s.added}{" "}
                added · {s.updated} updated
                {s.unchanged > 0 ? ` · ${s.unchanged} unchanged` : ""}
                {s.skippedDuplicates > 0
                  ? ` · ${s.skippedDuplicates} dup${
                      s.skippedDuplicates === 1 ? "" : "s"
                    } skipped`
                  : ""}
              </li>
            ))}
          </ul>
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
