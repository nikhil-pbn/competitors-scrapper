"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { RowSelectionState } from "@tanstack/react-table";

import type { AppendSummary, BusinessRecord } from "@/lib/types";
import { Button, Card, MultiSelect, Spinner } from "@/components/ui";
import { TableSkeleton } from "@/components/data-table";
import type { NoDataItem } from "@/features/dashboard/selectors";
import type { Phase } from "@/features/dashboard/pipeline";
import { AddRecordForm } from "@/features/dashboard/components/add-record-form";
import { NoDataNotice } from "@/features/dashboard/components/no-data-notice";
import { SaveStatus } from "@/features/dashboard/components/save-status";

const ResultsTable = dynamic(
  () =>
    import("@/features/dashboard/components/results-table").then(
      (m) => m.ResultsTable,
    ),
  { loading: () => <TableSkeleton />, ssr: false },
);

const allSelected = (rows: BusinessRecord[]): RowSelectionState =>
  Object.fromEntries(rows.map((_, i) => [String(i), true]));

export interface ContactDetailsSectionProps {
  competitors: string[];
  phase: Phase;
  busy: boolean;
  blocked: boolean;
  tableRecords: BusinessRecord[];
  noDataItems: NoDataItem[];
  saveSummaries: AppendSummary[];
  onExclude: (record: BusinessRecord) => void;
  onIncludeFromNoData: (key: string) => void;
  onAddManual: (record: BusinessRecord) => void;
  onSave: (selected: BusinessRecord[]) => void;
}

/** Phase 2/3 card: review the contacts, then save each row to its competitor tab. */
export function ContactDetailsSection(props: ContactDetailsSectionProps) {
  const { tableRecords, phase, busy, blocked } = props;

  // Controlled row selection, reset to "all selected" when the row set changes
  // (adjust-state-during-render — no effect, no setState-in-effect).
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [prevRecords, setPrevRecords] = useState(tableRecords);
  if (tableRecords !== prevRecords) {
    setPrevRecords(tableRecords);
    setRowSelection(allSelected(tableRecords));
  }

  // Competitor save scope — all present competitors by default; reset when the
  // present set changes (not on every row edit).
  const present = useMemo(
    () =>
      Array.from(
        new Set(
          tableRecords.map((r) => r.competitor).filter(Boolean) as string[],
        ),
      ).sort(),
    [tableRecords],
  );
  const presentKey = present.join("|");
  const [saveScope, setSaveScope] = useState<string[]>(present);
  const [prevKey, setPrevKey] = useState(presentKey);
  if (presentKey !== prevKey) {
    setPrevKey(presentKey);
    setSaveScope(present);
  }

  const selected = useMemo(
    () => tableRecords.filter((_, i) => rowSelection[String(i)]),
    [tableRecords, rowSelection],
  );
  // Save = checked rows whose competitor is in the save scope.
  const toSave = useMemo(
    () => selected.filter((r) => r.competitor && saveScope.includes(r.competitor)),
    [selected, saveScope],
  );

  const canSave = !busy && toSave.length > 0;

  return (
    <Card className="gap-0 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">
          Contact details{" "}
          <span className="font-normal text-muted-foreground">
            ({tableRecords.length})
          </span>
        </h2>
        <div className="flex items-center gap-2">
          {present.length > 1 ? (
            <MultiSelect
              options={present}
              selected={saveScope}
              onChange={setSaveScope}
              placeholder="Save to…"
              disabled={busy}
              className="w-44"
            />
          ) : null}
          <Button onClick={() => props.onSave(toSave)} disabled={!canSave}>
            {phase === "saving" ? (
              <>
                <Spinner />
                Saving…
              </>
            ) : (
              `Save ${toSave.length} row${toSave.length === 1 ? "" : "s"} to their tabs`
            )}
          </Button>
        </div>
      </div>

      <SaveStatus phase={phase} summaries={props.saveSummaries} />

      <details className="mb-4">
        <summary className="cursor-pointer text-sm text-muted-foreground">
          ＋ Add a row manually (for URLs you researched by hand)
        </summary>
        <div className="mt-3">
          <AddRecordForm
            onAdd={props.onAddManual}
            disabled={blocked}
            competitors={props.competitors}
          />
        </div>
      </details>

      <NoDataNotice
        items={props.noDataItems}
        onInclude={props.onIncludeFromNoData}
      />

      {tableRecords.length > 0 ? (
        <ResultsTable
          records={tableRecords}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          onExclude={props.onExclude}
          exportDisabled={blocked}
        />
      ) : phase !== "analyze" ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No contact details to show — all analyzed sites are in the no-data
          list above.
        </p>
      ) : null}
    </Card>
  );
}
