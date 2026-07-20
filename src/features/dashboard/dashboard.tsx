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
import { computeNoDataItems, inTable, mergeRecords } from "@/features/dashboard/selectors";

const DEFAULT_FILTERS: AhrefsFilters = {
  domainKeyword: "dent",
  status: "all",
  linkStatus: "any",
  sinceLastMonth: true,
};

/**
 * Thin composition root: wires the worksheets/pipeline/review hooks to the
 * presentational sections. All state machinery lives in the hooks and reducer;
 * all markup lives in the section components.
 */
export function Dashboard() {
  const { worksheets, error: worksheetsError } = useWorksheets();
  const review = useReview();
  const pipeline = usePipeline(review.reset);

  const [worksheet, setWorksheet] = useState("");
  const [target, setTarget] = useState("");
  const [filters, setFilters] = useState<AhrefsFilters>(DEFAULT_FILTERS);
  const [urlText, setUrlText] = useState("");

  const noCompetitor = !worksheet;
  const blocked = pipeline.busy || noCompetitor;

  // Select a competitor/worksheet and auto-fill its preset URL (still editable).
  function selectWorksheet(name: string) {
    setWorksheet(name);
    const url = competitorUrlFor(name);
    if (url !== undefined) setTarget(url);
  }

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
        worksheet={worksheet}
        onSelectWorksheet={selectWorksheet}
        target={target}
        onTargetChange={setTarget}
        filters={filters}
        onFiltersChange={setFilters}
        urlText={urlText}
        onUrlTextChange={setUrlText}
        busy={pipeline.busy}
        blocked={blocked}
        noCompetitor={noCompetitor}
        phase={pipeline.phase}
        onSearch={() => pipeline.search(target, filters)}
        onSample={pipeline.sample}
        onUsePasted={() => pipeline.usePasted(urlText)}
        onUpload={pipeline.upload}
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
          onAnalyze={() => pipeline.analyze(pipeline.domains)}
        />
      ) : pipeline.phase === "domains" ? (
        <Card className="gap-0 p-10 text-center text-sm text-muted-foreground">
          No referring domains matched your filters.
        </Card>
      ) : null}

      {showRecords ? (
        <ContactDetailsSection
          worksheet={worksheet}
          phase={pipeline.phase}
          busy={pipeline.busy}
          blocked={blocked}
          tableRecords={tableRecords}
          noDataItems={noDataItems}
          saveSummary={pipeline.saveSummary}
          onExclude={review.exclude}
          onIncludeFromNoData={review.includeFromNoData}
          onAddManual={review.addManual}
          onSave={(selected) => pipeline.save(worksheet, selected)}
        />
      ) : null}
    </div>
  );
}
