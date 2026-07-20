"use client";

import type { AhrefsFilters } from "@/lib/ahrefs/types";
import { Card } from "@/components/ui";
import type { Phase } from "@/features/dashboard/pipeline";
import { CompetitorFields } from "@/features/dashboard/components/competitor-fields";
import { FilterPanel } from "@/features/dashboard/components/filter-panel";
import { PasteDataPanel } from "@/features/dashboard/components/paste-data-panel";
import { SourceActions } from "@/features/dashboard/components/source-actions";

export interface SearchPanelProps {
  worksheets: string[];
  worksheetsError: string | null;
  worksheet: string;
  onSelectWorksheet: (name: string) => void;
  target: string;
  onTargetChange: (value: string) => void;
  filters: AhrefsFilters;
  onFiltersChange: (next: AhrefsFilters) => void;
  urlText: string;
  onUrlTextChange: (value: string) => void;
  busy: boolean;
  blocked: boolean;
  noCompetitor: boolean;
  phase: Phase;
  onSearch: () => void;
  onSample: () => void;
  onUsePasted: () => void;
  onUpload: (file: File) => void;
}

/** Phase 1 control surface: competitor, filters, and the data-source actions. */
export function SearchPanel(props: SearchPanelProps) {
  return (
    <Card className="gap-0 p-5">
      <CompetitorFields
        worksheets={props.worksheets}
        worksheetsError={props.worksheetsError}
        worksheet={props.worksheet}
        onSelectWorksheet={props.onSelectWorksheet}
        target={props.target}
        onTargetChange={props.onTargetChange}
        busy={props.busy}
        onSearch={props.onSearch}
      />

      <div className="mt-5 border-t border-border pt-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Filters
        </h2>
        <FilterPanel
          filters={props.filters}
          onChange={props.onFiltersChange}
          disabled={props.blocked}
        />
      </div>

      <div className="mt-5">
        <SourceActions
          blocked={props.blocked}
          noCompetitor={props.noCompetitor}
          fetching={props.phase === "ahrefs"}
          canSearch={props.target.trim() !== ""}
          onUpload={props.onUpload}
          onSample={props.onSample}
          onSearch={props.onSearch}
        />
      </div>

      <PasteDataPanel
        value={props.urlText}
        onChange={props.onUrlTextChange}
        onUse={props.onUsePasted}
        blocked={props.blocked}
      />
    </Card>
  );
}
