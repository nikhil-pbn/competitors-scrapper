"use client";

import type { DentalCheck, DentalStatus } from "@/lib/types";
import { Spinner } from "@/components/ui";
import type { Phase } from "@/features/dashboard/pipeline";

const BASE =
  "rounded-lg border px-4 py-3 text-sm flex items-center gap-3 flex-wrap";

const DENTAL_STATUSES: DentalStatus[] = [
  "Dental",
  "Non-Dental",
  "Unknown",
  "Failed",
];

function ProgressBanner({
  label,
  progress,
}: {
  label: string;
  progress: { done: number; total: number };
}) {
  const pct = progress.total
    ? Math.round((progress.done / progress.total) * 100)
    : 0;
  return (
    <div className={`${BASE} border-border bg-card`}>
      <Spinner />
      <span>
        {label} {progress.done}/{progress.total} ({pct}%)
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

/** "12 Dental · 30 Non-Dental · 3 Unknown" — empty when nothing is checked. */
function dentalTally(dental: Record<string, DentalCheck>): string {
  const counts = new Map<DentalStatus, number>();
  for (const c of Object.values(dental)) {
    counts.set(c.status, (counts.get(c.status) ?? 0) + 1);
  }
  return DENTAL_STATUSES.filter((s) => counts.get(s))
    .map((s) => `${counts.get(s)} ${s}`)
    .join(" · ");
}

/** Compact status/progress banner for the pipeline. */
export function StatusSummary({
  phase,
  domainCount,
  recordCount,
  dental,
  progress,
  error,
}: {
  phase: Phase;
  domainCount: number;
  recordCount: number;
  dental: Record<string, DentalCheck>;
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
    const tally = dentalTally(dental);
    return (
      <div className={`${BASE} border-border bg-card`}>
        {tally ? (
          <span>
            Dental check: <span className="font-medium">{tally}</span>. Choose
            All websites or Dental only, then analyze to extract contact
            details.
          </span>
        ) : (
          <span>
            <span className="font-medium">{domainCount}</span> referring
            domains found. Optionally check which are dental websites, then
            analyze them to extract contact details.
          </span>
        )}
      </div>
    );
  }

  if (phase === "classify") {
    return <ProgressBanner label="Checking for dental websites" progress={progress} />;
  }

  if (phase === "analyze") {
    return <ProgressBanner label="Analyzing websites" progress={progress} />;
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
