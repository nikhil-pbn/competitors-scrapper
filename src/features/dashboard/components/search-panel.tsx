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
  selected: string[];
  onSelectedChange: (next: string[]) => void;
  filters: AhrefsFilters;
  onFiltersChange: (next: AhrefsFilters) => void;
  urlText: string;
  onUrlTextChange: (value: string) => void;
  busy: boolean;
  phase: Phase;
  /** True when at least one selected competitor has a known Ahrefs domain. */
  searchable: boolean;
  /** The single selected competitor (for Upload/Paste/Sample), or null. */
  single: string | null;
  onSearch: () => void;
  onSample: () => void;
  onUsePasted: () => void;
  onUpload: (file: File) => void;
}

/** Phase 1 control surface: competitors, filters, and data-source actions. */
export function SearchPanel(props: SearchPanelProps) {
  const { busy, selected, single, searchable } = props;
  const singleDisabled = busy || single === null;

  const hint =
    selected.length === 0
      ? "Select at least one competitor to enable actions."
      : selected.length > 1
        ? "Upload / Paste / Sample need exactly one competitor selected."
        : null;

  return (
    <Card className="gap-0 p-5">
      <CompetitorFields
        worksheets={props.worksheets}
        worksheetsError={props.worksheetsError}
        selected={selected}
        onChange={props.onSelectedChange}
        busy={busy}
      />

      <div className="mt-5 border-t border-border pt-5">
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Filters
        </h2>
        <FilterPanel
          filters={props.filters}
          onChange={props.onFiltersChange}
          disabled={busy || selected.length === 0}
        />
      </div>

      <div className="mt-5">
        <SourceActions
          fetching={props.phase === "ahrefs"}
          searchDisabled={busy || !searchable}
          singleDisabled={singleDisabled}
          hint={hint}
          onUpload={props.onUpload}
          onSample={props.onSample}
          onSearch={props.onSearch}
        />
      </div>

      <PasteDataPanel
        value={props.urlText}
        onChange={props.onUrlTextChange}
        onUse={props.onUsePasted}
        blocked={busy}
        useDisabled={single === null}
      />
    </Card>
  );
}
