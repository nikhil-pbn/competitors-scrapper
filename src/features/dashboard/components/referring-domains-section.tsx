"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import type { ReferringDomain } from "@/lib/types";
import { Button, Card, MultiSelect } from "@/components/ui";
import { TableSkeleton } from "@/components/data-table";
import type { DataSource, Phase } from "@/features/dashboard/pipeline";
import { DataSourceBadge } from "@/features/dashboard/components/data-source-badge";

// Code-split the TanStack table: its chunk only loads once there are domains to
// show, keeping the initial dashboard bundle lean. Client-only (ssr: false).
const ReferringDomainsTable = dynamic(
  () =>
    import("@/features/dashboard/components/referring-domains-table").then(
      (m) => m.ReferringDomainsTable,
    ),
  { loading: () => <TableSkeleton />, ssr: false },
);

/** Phase 1 results card: the domain list + a scoped (multi-select) "Analyze". */
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
  onAnalyze: (domains: ReferringDomain[]) => void;
}) {
  const competitors = useMemo(
    () =>
      Array.from(
        new Set(domains.map((d) => d.competitor).filter(Boolean) as string[]),
      ).sort(),
    [domains],
  );

  // Which competitors to analyze — all selected by default; reset on new data.
  const [scope, setScope] = useState<string[]>(competitors);
  const [prevDomains, setPrevDomains] = useState(domains);
  if (domains !== prevDomains) {
    setPrevDomains(domains);
    setScope(competitors);
  }

  const toAnalyze = useMemo(
    () => domains.filter((d) => scope.includes(d.competitor ?? "")),
    [domains, scope],
  );

  return (
    <Card className="gap-0 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          Referring domains
          <DataSourceBadge source={dataSource} />
        </h2>
        <div className="flex items-center gap-2">
          {competitors.length > 1 ? (
            <MultiSelect
              options={competitors}
              selected={scope}
              onChange={setScope}
              placeholder="Analyze…"
              disabled={blocked}
              className="w-44"
            />
          ) : null}
          <Button
            onClick={() => onAnalyze(toAnalyze)}
            disabled={blocked || toAnalyze.length === 0}
          >
            {phase === "analyze"
              ? "Analyzing…"
              : `Analyze ${toAnalyze.length} website${
                  toAnalyze.length === 1 ? "" : "s"
                } →`}
          </Button>
        </div>
      </div>
      <ReferringDomainsTable domains={domains} exportDisabled={blocked} />
    </Card>
  );
}
