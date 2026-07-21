"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { RowSelectionState } from "@tanstack/react-table";

import type { AppendSummary, BusinessRecord } from "@/lib/types";
import { Button, Card, Spinner } from "@/components/ui";
import { TableSkeleton } from "@/components/data-table";
import type { NoDataItem } from "@/features/dashboard/selectors";
import type { Phase } from "@/features/dashboard/pipeline";
import { AddRecordForm } from "@/features/dashboard/components/add-record-form";
import { NoDataNotice } from "@/features/dashboard/components/no-data-notice";
import { SaveStatus } from "@/features/dashboard/components/save-status";

const ResultsTable = dynamic(
  () => import("@/features/dashboard/components/results-table").then((m) => m.ResultsTable),
  { loading: () => <TableSkeleton />, ssr: false },
);

const allSelected = (rows: BusinessRecord[]): RowSelectionState =>
  Object.fromEntries(rows.map((_, i) => [String(i), true]));

export interface ContactDetailsSectionProps {
  worksheet: string;
  phase: Phase;
  busy: boolean;
  blocked: boolean;
  tableRecords: BusinessRecord[];
  noDataItems: NoDataItem[];
  saveSummary: AppendSummary | null;
  onExclude: (record: BusinessRecord) => void;
  onIncludeFromNoData: (key: string) => void;
  onAddManual: (record: BusinessRecord) => void;
  onSave: (selected: BusinessRecord[]) => void;
}

/** Phase 2/3 card: review the contacts, then save the selected rows. */
export function ContactDetailsSection(props: ContactDetailsSectionProps) {
  const { tableRecords, phase, worksheet, busy, blocked } = props;

  // Controlled selection. Reset to "all selected" whenever the row set changes
  // (new run, streamed rows, include/exclude) using the adjust-state-during-
  // render pattern — no effect, no setState-in-effect.
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [prevRecords, setPrevRecords] = useState(tableRecords);
  if (tableRecords !== prevRecords) {
    setPrevRecords(tableRecords);
    setRowSelection(allSelected(tableRecords));
  }

  const selected = useMemo(
    () => tableRecords.filter((_, i) => rowSelection[String(i)]),
    [tableRecords, rowSelection],
  );

  const canSave = !busy && selected.length > 0 && Boolean(worksheet);

  return (
    <Card className="gap-0 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">
          Contact details{" "}
          <span className="font-normal text-muted-foreground">({tableRecords.length})</span>
        </h2>
        <Button onClick={() => props.onSave(selected)} disabled={!canSave}>
          {phase === "saving" ? (
            <>
              <Spinner />
              Saving…
            </>
          ) : (
            `Save ${selected.length} to "${worksheet}"`
          )}
        </Button>
      </div>

      <SaveStatus
        phase={phase}
        worksheet={worksheet}
        summary={props.saveSummary}
      />

      <details className="mb-4">
        <summary className="cursor-pointer text-sm text-muted-foreground">
          ＋ Add a row manually (for URLs you researched by hand)
        </summary>
        <div className="mt-3">
          <AddRecordForm onAdd={props.onAddManual} disabled={blocked} />
        </div>
      </details>

      <NoDataNotice
        items={props.noDataItems}
        worksheet={worksheet}
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
