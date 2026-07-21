"use client";

import { useEffect, useState } from "react";

import { ResearchRow, type RowData } from "@/components/research/research-row";

const HEADERS = [
  "URL / from",
  "Practice",
  "Doctor",
  "Office manager",
  "Phone",
  "Email",
  "Location",
  "State",
  "Add to tab",
  "Actions",
];

/**
 * Editable table of saved no-data URLs. Data is fetched CLIENT-side from the API
 * routes (never during server render) so the page can't hit RSC streaming
 * issues. Rows leave the list once pushed to a sheet or deleted.
 */
export function ResearchWorkspace() {
  const [rows, setRows] = useState<RowData[]>([]);
  const [worksheets, setWorksheets] = useState<string[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [list, tabs] = await Promise.all([
          fetch("/api/research/nodata").then((r) => r.json()),
          fetch("/api/worksheets").then((r) => r.json()),
        ]);
        if (!active) return;
        setRows(Array.isArray(list?.items) ? list.items : []);
        setWorksheets(Array.isArray(tabs?.worksheets) ? tabs.worksheets : []);
        setStatus("ready");
      } catch {
        if (active) setStatus("error");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const remove = (id: string) =>
    setRows((current) => current.filter((r) => r.id !== id));

  const message = (text: string) => (
    <p className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );

  if (status === "loading") return message("Loading…");
  if (status === "error")
    return message("Couldn’t load the list — refresh to try again.");
  if (rows.length === 0)
    return message(
      "No URLs saved for research yet. On the main page, analyze a competitor and click “Save for research” on the no-data notice.",
    );

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-card">
          <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground">
            {HEADERS.map((h) => (
              <th key={h} className="px-2 py-2 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <ResearchRow
              key={r.id}
              record={r}
              worksheets={worksheets}
              onRemove={remove}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
