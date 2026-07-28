"use client";

import { ExternalLink } from "lucide-react";

import type { AppendSummary } from "@/lib/types";
import { Spinner } from "@/components/ui";
import type { Phase } from "@/features/dashboard/pipeline";

/**
 * Where the "Go to worksheet" button points:
 *  - saved to exactly one tab → that tab's deep link
 *  - saved to several tabs → the spreadsheet root
 * (based on how many tabs were saved, not on how many rows changed).
 */
function worksheetLink(summaries: AppendSummary[]): { href: string; label: string } | null {
  const anyUrl = summaries.find((s) => s.tabUrl)?.tabUrl;
  const rootUrl = anyUrl ? anyUrl.split("?gid=")[0] : undefined;

  if (summaries.length === 1 && summaries[0].tabUrl) {
    return {
      href: summaries[0].tabUrl,
      label: `Go to ${summaries[0].worksheet} tab`,
    };
  }
  if (rootUrl) return { href: rootUrl, label: "Go to worksheet" };
  return null;
}

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
    const link = worksheetLink(summaries);

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
          {link ? (
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {link.label}
              <ExternalLink className="size-3.5" />
            </a>
          ) : null}
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
