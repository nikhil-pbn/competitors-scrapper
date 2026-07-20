"use client";

import type { Table } from "@tanstack/react-table";
import type { ReactNode } from "react";

import { Button } from "@/components/ui";

/** Prev/Next pager + page indicator shared by the data tables. */
export function TablePagination<T>({
  table,
  note,
}: {
  table: Table<T>;
  note?: ReactNode;
}) {
  return (
    <div className="flex max-md:flex-col items-center justify-between gap-2 text-sm text-muted-foreground">
      <span>
        Page {table.getState().pagination.pageIndex + 1} of{" "}
        {table.getPageCount() || 1}
        {note ? <> · {note}</> : null}
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
  );
}
