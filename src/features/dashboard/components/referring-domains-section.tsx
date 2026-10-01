"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import type { DentalCheck, ReferringDomain } from "@/lib/types";
import {
  Button,
  Card,
  MultiSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { TableSkeleton } from "@/components/data-table";
import type { DataSource, Phase } from "@/features/dashboard/pipeline";
import { DataSourceBadge } from "@/features/dashboard/components/data-source-badge";
import { sourceKey } from "@/features/dashboard/keys";

/** Which domains Analyze visits: everything, or only those checked Dental. */
type AnalyzeTarget = "all" | "dental";

// Code-split the TanStack table: its chunk only loads once there are domains to
// show, keeping the initial dashboard bundle lean. Client-only (ssr: false).
const ReferringDomainsTable = dynamic(
  () =>
    import("@/features/dashboard/components/referring-domains-table").then(
      (m) => m.ReferringDomainsTable,
    ),
  { loading: () => <TableSkeleton />, ssr: false },
);

/**
 * Phase 1 results card: the domain list, an optional "Check dental" step, and
 * a scoped "Analyze" (competitor multi-select × All / Dental only).
 */
export function ReferringDomainsSection({
  domains,
  dental,
  dataSource,
  phase,
  blocked,
  onCheckDental,
  onAnalyze,
}: {
  domains: ReferringDomain[];
  /** Dental-check results keyed by sourceKey(domain). */
  dental: Record<string, DentalCheck>;
  dataSource: DataSource;
  phase: Phase;
  blocked: boolean;
  onCheckDental: (domains: ReferringDomain[]) => void;
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
  // `target` is null until the user picks one: it then defaults to "Dental
  // only" once a dental check has run, otherwise "All websites".
  const [scope, setScope] = useState<string[]>(competitors);
  const [target, setTarget] = useState<AnalyzeTarget | null>(null);
  const [prevDomains, setPrevDomains] = useState(domains);
  if (domains !== prevDomains) {
    setPrevDomains(domains);
    setScope(competitors);
    setTarget(null);
  }

  const inScope = useMemo(
    () => domains.filter((d) => scope.includes(d.competitor ?? "")),
    [domains, scope],
  );
  const checkOf = (d: ReferringDomain) => dental[sourceKey(d.domain)];
  const dentalInScope = inScope.filter((d) => checkOf(d)?.status === "Dental");
  const anyChecked = inScope.some((d) => checkOf(d));
  const unchecked = inScope.filter((d) => !checkOf(d));

  const effectiveTarget = target ?? (anyChecked ? "dental" : "all");
  const toAnalyze = effectiveTarget === "dental" ? dentalInScope : inScope;
  // Check the not-yet-checked domains; once all are checked, re-check them all.
  const toCheck = unchecked.length > 0 ? unchecked : inScope;

  return (
    <Card className="gap-0 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          Referring domains
          <DataSourceBadge source={dataSource} />
        </h2>
        <div className="flex flex-wrap items-center gap-2">
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
            variant="secondary"
            onClick={() => onCheckDental(toCheck)}
            disabled={blocked || toCheck.length === 0}
          >
            {phase === "classify"
              ? "Checking…"
              : unchecked.length === 0
                ? "Re-check dental"
                : `Check dental (${unchecked.length})`}
          </Button>
          <Select
            value={effectiveTarget}
            onValueChange={(v) => setTarget(v as AnalyzeTarget)}
            disabled={blocked}
          >
            <SelectTrigger className="w-44" aria-label="Websites to analyze">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All websites ({inScope.length})</SelectItem>
              <SelectItem value="dental" disabled={!anyChecked}>
                Dental only
                {anyChecked ? ` (${dentalInScope.length})` : " — check first"}
              </SelectItem>
            </SelectContent>
          </Select>
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
      <ReferringDomainsTable
        domains={domains}
        dental={dental}
        exportDisabled={blocked}
      />
    </Card>
  );
}
