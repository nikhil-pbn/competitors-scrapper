"use client";

import dynamic from "next/dynamic";

import type { ReferringDomain } from "@/lib/types";
import { Button, Card } from "@/components/ui";
import { TableSkeleton } from "@/components/data-table";
import type { DataSource, Phase } from "@/features/dashboard/pipeline";
import { DataSourceBadge } from "@/features/dashboard/components/data-source-badge";

// Code-split the TanStack table: its chunk only loads once there are domains to
// show, keeping the initial dashboard bundle lean. Client-only (ssr: false).
const ReferringDomainsTable = dynamic(
  () =>
    import("@/features/dashboard/components/referring-domains-table").then((m) => m.ReferringDomainsTable),
  { loading: () => <TableSkeleton />, ssr: false },
);

/** Phase 1 results card: the domain list + the "Analyze" call to action. */
export function ReferringDomainsSection({
  domains,
  dataSource,
  phase,
  blocked,
  onAnalyze,
}: {
  domains: ReferringDomain[];
  dataSource: DataSource;
  phase: Phase;
  blocked: boolean;
  onAnalyze: () => void;
}) {
  return (
    <Card className="gap-0 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          Referring domains
          <DataSourceBadge source={dataSource} />
        </h2>
        <Button onClick={onAnalyze} disabled={blocked}>
          {phase === "analyze"
            ? "Analyzing…"
            : `Analyze ${domains.length} websites →`}
        </Button>
      </div>
      <ReferringDomainsTable domains={domains} exportDisabled={blocked} />
    </Card>
  );
}
