"use client";

import { useEffect, useMemo, useState } from "react";

import { ResearchRow, type RowData } from "@/components/research/research-row";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { downloadCsv } from "@/lib/csv";

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

const ALL = "all";

/**
 * Editable table of saved no-data URLs. Data is fetched CLIENT-side from the API
 * route. A tab filter narrows the view (and the CSV export); rows leave the list
 * once pushed to their origin tab or deleted.
 */
export function ResearchWorkspace() {
  const [rows, setRows] = useState<RowData[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [tab, setTab] = useState<string>(ALL);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await fetch("/api/research/nodata").then((r) => r.json());
        if (!active) return;
        setRows(Array.isArray(list?.items) ? list.items : []);
        setStatus("ready");
      } catch {
        if (active) setStatus("error");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const tabs = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.worksheet).filter(Boolean))).sort(),
    [rows],
  );
  const visible = useMemo(
    () => (tab === ALL ? rows : rows.filter((r) => r.worksheet === tab)),
    [rows, tab],
  );

  const remove = (id: string) =>
    setRows((current) => current.filter((r) => r.id !== id));

  function exportCsv() {
    downloadCsv(
      "nodata-urls.csv",
      ["URL", "Tab"],
      visible.map((r) => [r.source_url, r.worksheet]),
    );
  }

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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={tab} onValueChange={setTab}>
            <SelectTrigger className="h-8 w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All tabs</SelectItem>
              {tabs.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {visible.length} URL{visible.length === 1 ? "" : "s"}
          </span>
        </div>
        <Button
          variant="secondary"
          onClick={exportCsv}
          disabled={visible.length === 0}
          className="h-8 px-2.5 text-xs"
        >
          Export CSV
        </Button>
      </div>

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
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={HEADERS.length}
                  className="px-2 py-8 text-center text-muted-foreground"
                >
                  No URLs for this tab.
                </td>
              </tr>
            ) : (
              visible.map((r) => (
                <ResearchRow key={r.id} record={r} onRemove={remove} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
