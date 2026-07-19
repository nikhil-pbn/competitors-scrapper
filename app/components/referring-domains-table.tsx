"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";

import type { ReferringDomain } from "@/lib/types";
import { Button } from "./ui";

/** Columns mirroring the Ahrefs "Referring domains" report. */
const COLUMNS: {
  key: keyof ReferringDomain;
  header: string;
  numeric?: boolean;
  date?: boolean;
}[] = [
  { key: "domainRating", header: "DR", numeric: true },
  { key: "dofollowRefdomains", header: "Dofollow ref. domains", numeric: true },
  { key: "dofollowLinkedDomains", header: "Dofollow linked domains", numeric: true },
  { key: "trafficDomain", header: "Traffic", numeric: true },
  { key: "keywords", header: "Keywords", numeric: true },
  { key: "linksToTarget", header: "Links to target", numeric: true },
  { key: "dofollowLinks", header: "Dofollow links", numeric: true },
  { key: "firstSeen", header: "First seen", date: true },
];

function formatDate(value: unknown): string {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

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

  const columns = useMemo<ColumnDef<ReferringDomain>[]>(() => {
    const domainCol: ColumnDef<ReferringDomain> = {
      id: "domain",
      accessorKey: "domain",
      header: "Domain",
      cell: ({ row }) => {
        const d = row.original;
        return (
          <div className="flex items-center gap-2">
            {d.newLinks && d.newLinks > 0 ? (
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-950/60 dark:text-green-300">
                New
              </span>
            ) : null}
            <a
              href={`https://${d.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              {d.domain}
            </a>
          </div>
        );
      },
    };

    const rest: ColumnDef<ReferringDomain>[] = COLUMNS.map((c) => ({
      id: c.key,
      accessorKey: c.key,
      header: c.header,
      cell: ({ getValue }) => {
        const value = getValue();
        if (value === null || value === undefined || value === "")
          return <span className="text-muted">—</span>;
        if (c.date) return formatDate(value);
        return String(value);
      },
    }));

    return [domainCol, ...rest];
  }, []);

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
        <div className="flex items-center gap-3">
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Filter domains…"
            className="h-9 w-56 rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-accent"
          />
          <Button
            variant="secondary"
            onClick={() => exportCsv(domains)}
            disabled={exportDisabled}
          >
            Export CSV
          </Button>
        </div>
      </div>

      <div className="max-h-[520px] overflow-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-muted ${
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

      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
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

function exportCsv(domains: ReferringDomain[]) {
  const headers = ["Domain", ...COLUMNS.map((c) => c.header)];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...domains.map((d) =>
      [
        escape(d.domain),
        ...COLUMNS.map((c) => escape(String(d[c.key] ?? ""))),
      ].join(","),
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
