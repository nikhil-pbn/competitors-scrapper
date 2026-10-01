"use client";

import { useEffect, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";

import type { DentalCheck, ReferringDomain } from "@/lib/types";
import { downloadCsv } from "@/lib/csv";
import { Button, TooltipProvider } from "@/components/ui";
import { FilterInput, TablePagination } from "@/components/data-table";
import {
  REFERRING_DOMAIN_CSV_HEADERS,
  buildReferringDomainColumns,
  referringDomainCsvRow,
  type DomainRow,
} from "@/features/dashboard/components/referring-domains-columns";
import { sourceKey } from "@/features/dashboard/keys";

const LEFT_ALIGNED = new Set(["domain", "competitor", "dental"]);

/** Ahrefs-style Phase 1 table: sortable, filterable, paginated, exportable. */
export function ReferringDomainsTable({
  domains,
  dental,
  exportDisabled,
}: {
  domains: ReferringDomain[];
  /** Dental-check results keyed by sourceKey(domain). */
  dental: Record<string, DentalCheck>;
  exportDisabled?: boolean;
}) {
  const rows = useMemo<DomainRow[]>(
    () => domains.map((d) => ({ ...d, dental: dental[sourceKey(d.domain)] })),
    [domains, dental],
  );
  const [sorting, setSorting] = useState<SortingState>([
    { id: "domainRating", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");
  const columns = useMemo(() => buildReferringDomainColumns(), []);

  // TanStack Table is not React Compiler–compatible; the compiler skips this
  // component, which is expected and safe.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    // Keep the current page while dental results stream into the rows.
    autoResetPageIndex: false,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  });

  // A new domain list starts on page 1 (dental results alone don't reset it).
  useEffect(() => table.setPageIndex(0), [domains, table]);

  return (
    <TooltipProvider>
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
                  rows.map(referringDomainCsvRow),
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
                        LEFT_ALIGNED.has(header.id) ? "text-left" : "text-right"
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
                        LEFT_ALIGNED.has(cell.column.id)
                          ? "text-left"
                          : "text-right tabular-nums"
                      }`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TablePagination table={table} />
      </div>
    </TooltipProvider>
  );
}
