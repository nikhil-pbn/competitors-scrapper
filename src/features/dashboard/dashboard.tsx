"use client";

import { useMemo, useState } from "react";

import type { AhrefsFilters } from "@/lib/ahrefs/types";
import { competitorUrlFor } from "@/lib/competitors";
import { Card } from "@/components/ui";
import { ContactDetailsSection } from "@/features/dashboard/components/contact-details-section";
import { ReferringDomainsSection } from "@/features/dashboard/components/referring-domains-section";
import { SearchPanel } from "@/features/dashboard/components/search-panel";
import { StatusSummary } from "@/features/dashboard/components/status-summary";
import { usePipeline } from "@/features/dashboard/hooks/use-pipeline";
import { useReview } from "@/features/dashboard/hooks/use-review";
import { useWorksheets } from "@/features/dashboard/hooks/use-worksheets";
import {
  computeNoDataItems,
  inTable,
  mergeRecords,
} from "@/features/dashboard/selectors";

const DEFAULT_FILTERS: AhrefsFilters = {
  domainKeyword: "dent",
  status: "all",
  linkStatus: "any",
  range: "last_month",
};

/**
 * Thin composition root. Multi-competitor selection drives a per-competitor
 * Ahrefs search; every domain/record carries its competitor tag through to a
 * per-tab save. All state lives in the hooks/reducer; markup in the sections.
 */
export function Dashboard() {
  const { worksheets, error: worksheetsError } = useWorksheets();
  const review = useReview();
  const pipeline = usePipeline(review.reset);

  const [selected, setSelected] = useState<string[]>([]);
  const [filters, setFilters] = useState<AhrefsFilters>(DEFAULT_FILTERS);
  const [urlText, setUrlText] = useState("");

  // Competitors that have a known Ahrefs domain (searchable), and the single
  // selected competitor (used for Upload/Paste/Sample) — null unless exactly one.
  const searchableCompetitors = useMemo(
    () =>
      selected
        .map((name) => ({ name, domain: competitorUrlFor(name) ?? "" }))
        .filter((c) => c.domain !== ""),
    [selected],
  );
  const single = selected.length === 1 ? selected[0] : null;
  const blocked = pipeline.busy || selected.length === 0;

  const merged = useMemo(
    () => mergeRecords(pipeline.records, review.manual),
    [pipeline.records, review.manual],
  );
  const tableRecords = useMemo(
    () => merged.filter((r) => inTable(r, review.excluded, review.included)),
    [merged, review.excluded, review.included],
  );
  const noDataItems = useMemo(
    () => computeNoDataItems(merged, review.excluded, review.included),
    [merged, review.excluded, review.included],
  );

  const showRecords = pipeline.records.length > 0 || review.manual.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <SearchPanel
        worksheets={worksheets}
        worksheetsError={worksheetsError}
        selected={selected}
        onSelectedChange={setSelected}
        filters={filters}
        onFiltersChange={setFilters}
        urlText={urlText}
        onUrlTextChange={setUrlText}
        busy={pipeline.busy}
        phase={pipeline.phase}
        searchable={searchableCompetitors.length > 0}
        single={single}
        onSearch={() => pipeline.search(searchableCompetitors, filters)}
        onSample={() => single && pipeline.sample(single)}
        onUsePasted={() => single && pipeline.usePasted(urlText, single)}
        onUpload={(file) => single && pipeline.upload(file, single)}
      />

      <StatusSummary
        phase={pipeline.phase}
        domainCount={pipeline.domains.length}
        recordCount={pipeline.records.length}
        progress={pipeline.progress}
        error={pipeline.error}
      />

      {pipeline.domains.length > 0 ? (
        <ReferringDomainsSection
          domains={pipeline.domains}
          dataSource={pipeline.dataSource}
          phase={pipeline.phase}
          blocked={blocked}
          onAnalyze={(subset) => pipeline.analyze(subset)}
        />
      ) : pipeline.phase === "domains" ? (
        <Card className="gap-0 p-10 text-center text-sm text-muted-foreground">
          No referring domains matched your filters.
        </Card>
      ) : null}

      {showRecords ? (
        <ContactDetailsSection
          competitors={selected}
          phase={pipeline.phase}
          busy={pipeline.busy}
          blocked={blocked}
          tableRecords={tableRecords}
          noDataItems={noDataItems}
          saveSummaries={pipeline.saveSummaries}
          onExclude={review.exclude}
          onIncludeFromNoData={review.includeFromNoData}
          onAddManual={review.addManual}
          onSave={(sel) => pipeline.save(sel)}
        />
      ) : null}
    </div>
  );
}
