"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";

import type { ReferringDomain } from "@/lib/types";
import { downloadCsv } from "@/lib/csv";
import { Button } from "@/components/ui";
import { FilterInput, TablePagination } from "@/components/data-table";
import {
  REFERRING_DOMAIN_CSV_HEADERS,
  buildReferringDomainColumns,
  referringDomainCsvRow,
} from "@/features/dashboard/components/referring-domains-columns";

/** Ahrefs-style Phase 1 table: sortable, filterable, paginated, exportable. */
export function ReferringDomainsTable({
  domains,
  exportDisabled,
}: {
  domains: ReferringDomain[];
  exportDisabled?: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "domainRating", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");
  const columns = useMemo(() => buildReferringDomainColumns(), []);

  const table = useReactTable({
    data: domains,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium">
          {domains.length} referring domains
        </span>
        <div className="flex max-md:flex-col items-center gap-3">
          <FilterInput
            value={globalFilter}
            onChange={setGlobalFilter}
            placeholder="Filter domains…"
          />
          <Button
            variant="secondary"
            onClick={() =>
              downloadCsv(
                "referring-domains.csv",
                REFERRING_DOMAIN_CSV_HEADERS,
                domains.map(referringDomainCsvRow),
              )
            }
            disabled={exportDisabled}
          >
            Export CSV
          </Button>
        </div>
      </div>

      <div className="max-h-130 overflow-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-muted-foreground ${
                      header.id === "domain" ? "text-left" : "text-right"
                    }`}
                  >
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
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
                    className={`px-3 py-2 ${
                      cell.column.id === "domain"
                        ? "text-left"
                        : "text-right tabular-nums"
                    }`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination table={table} />
    </div>
  );
}
