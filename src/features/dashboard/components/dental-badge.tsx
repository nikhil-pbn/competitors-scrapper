import type { DentalCheck, DentalStatus } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui";

const STYLES: Record<DentalStatus, string> = {
  Dental:
    "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300",
  "Non-Dental":
    "bg-zinc-100 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300",
  Unknown:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  Failed: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
};

/** "/our-team" for an inner page, "/" for the homepage. */
function pagePath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/** Dental-check result pill; hover shows confidence, reason and pages read. */
export function DentalBadge({ check }: { check?: DentalCheck }) {
  if (!check) return <span className="text-muted-foreground">—</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`cursor-default whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold ${STYLES[check.status]}`}
        >
          {check.status}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-80">
        <p>
          <span className="font-semibold">{check.confidence} confidence.</span>{" "}
          {check.reason}
        </p>
        {check.pagesChecked?.length ? (
          <p className="mt-1 opacity-80">
            Pages read ({check.pagesChecked.length}):{" "}
            {check.pagesChecked.map(pagePath).join(", ")}
          </p>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}
