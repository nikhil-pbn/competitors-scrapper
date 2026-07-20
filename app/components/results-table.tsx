"use client";

import { useEffect, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";

import type { BusinessRecord } from "@/lib/types";
import { Button } from "./ui";

const COLUMNS: { key: keyof BusinessRecord; header: string }[] = [
  { key: "practice_name", header: "Practice" },
  { key: "doctor_name", header: "Doctor" },
  { key: "office_manager_name", header: "Office Manager" },
  { key: "phone", header: "Phone" },
  { key: "email", header: "Email" },
  { key: "location", header: "Location" },
  { key: "State", header: "State" },
  { key: "source_url", header: "Source URL" },
];

export function ResultsTable({
  records,
  onSelectedChange,
  onExclude,
  exportDisabled,
}: {
  records: BusinessRecord[];
  onSelectedChange: (selected: BusinessRecord[]) => void;
  /** Move a row out of the table and into the no-data list. */
  onExclude?: (record: BusinessRecord) => void;
  exportDisabled?: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo<ColumnDef<BusinessRecord>[]>(() => {
    const selectCol: ColumnDef<BusinessRecord> = {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          ref={(el) => {
            if (el) el.indeterminate = table.getIsSomeRowsSelected();
          }}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
      enableSorting: false,
    };

    const dataCols: ColumnDef<BusinessRecord>[] = COLUMNS.map((c) => ({
      id: c.key,
      accessorKey: c.key,
      header: c.header,
      cell: ({ getValue }) => {
        const value = String(getValue() ?? "");
        if (!value) return <span className="text-muted">—</span>;
        if (c.key === "source_url") {
          return (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              {value.replace(/^https?:\/\//, "")}
            </a>
          );
        }
        return value;
      },
    }));

    if (!onExclude) return [selectCol, ...dataCols];

    const actionCol: ColumnDef<BusinessRecord> = {
      id: "actions",
      header: "",
      enableSorting: false,
      // Only offered once a row is unchecked — so it's a deliberate two-step:
      // uncheck to skip from save, then optionally push it to the no-data list.
      cell: ({ row }) =>
        row.getIsSelected() ? null : (
          <button
            type="button"
            onClick={() => onExclude(row.original)}
            title="Remove from the list and add to the no-data URLs"
            className="whitespace-nowrap rounded border border-border px-2 py-0.5 text-[11px] text-muted transition-colors hover:border-amber-400 hover:text-amber-600"
          >
            Move to no-data
          </button>
        ),
    };

    return [selectCol, ...dataCols, actionCol];
  }, [onExclude]);

  const table = useReactTable({
    data: records,
    columns,
    state: { sorting, rowSelection, columnVisibility, globalFilter },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  // Report selection to parent (default: all rows selected once data arrives).
  useEffect(() => {
    const rows = table.getSelectedRowModel().rows;
    onSelectedChange(rows.map((r) => r.original));
  }, [rowSelection, records, table, onSelectedChange]);

  // Select all rows whenever a fresh result set arrives.
  useEffect(() => {
    setRowSelection(
      Object.fromEntries(records.map((_, i) => [String(i), true])),
    );
  }, [records]);

  const selectedCount = Object.values(rowSelection).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Filter results…"
          className="h-9 w-56 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-accent"
        />
        <div className="flex items-center gap-3 text-sm text-muted">
          <span>{selectedCount} selected</span>
          <Button
            variant="secondary"
            onClick={() => exportCsv(records)}
            disabled={exportDisabled}
          >
            Export CSV
          </Button>
        </div>
      </div>

      <div className="max-h-[560px] overflow-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold text-muted"
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
                  <td
                    key={cell.id}
                    className="max-w-xs truncate px-3 py-2"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()} · {records.length} rows
        </span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Prev
          </Button>
          <Button
            variant="secondary"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Export the full result set as a CSV download. */
function exportCsv(records: BusinessRecord[]) {
  const headers = COLUMNS.map((c) => c.header);
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...records.map((r) =>
      COLUMNS.map((c) => escape(String(r[c.key] ?? ""))).join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "referring-domains.csv";
  a.click();
  URL.revokeObjectURL(url);
}
