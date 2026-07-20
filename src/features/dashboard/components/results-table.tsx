"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type OnChangeFn,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";

import type { BusinessRecord } from "@/lib/types";
import { downloadCsv } from "@/lib/csv";
import { Button } from "@/components/ui";
import { FilterInput, TablePagination } from "@/components/data-table";
import {
  RESULT_CSV_HEADERS,
  buildResultColumns,
  resultCsvRow,
} from "@/features/dashboard/components/results-columns";

/**
 * Phase 2 contact table. Row selection is *controlled* by the parent section,
 * so the Save button can read the selected rows without this component lifting
 * state up through an effect.
 */
export function ResultsTable({
  records,
  rowSelection,
  onRowSelectionChange,
  onExclude,
  exportDisabled,
}: {
  records: BusinessRecord[];
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  onExclude?: (record: BusinessRecord) => void;
  exportDisabled?: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const columns = useMemo(() => buildResultColumns(onExclude), [onExclude]);

  const table = useReactTable({
    data: records,
    columns,
    state: { sorting, rowSelection, globalFilter },
    onSortingChange: setSorting,
    onRowSelectionChange,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  const selectedCount = table.getSelectedRowModel().rows.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterInput
          value={globalFilter}
          onChange={setGlobalFilter}
          placeholder="Filter results…"
        />
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{selectedCount} selected</span>
          <Button
            variant="secondary"
            onClick={() =>
              downloadCsv(
                "referring-domains.csv",
                RESULT_CSV_HEADERS,
                records.map(resultCsvRow),
              )
            }
            disabled={exportDisabled}
          >
            Export CSV
          </Button>
        </div>
      </div>

      <div className="max-h-140 overflow-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground"
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        className={
                          header.column.getCanSort()
                            ? "flex items-center gap-1"
                            : ""
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {{ asc: " ↑", desc: " ↓" }[
                          header.column.getIsSorted() as string
                        ] ?? null}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border last:border-0 hover:bg-background"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="max-w-xs truncate px-3 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination table={table} note={`${records.length} rows`} />
    </div>
  );
}
