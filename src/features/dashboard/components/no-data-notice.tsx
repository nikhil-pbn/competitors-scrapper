"use client";

import { useState } from "react";

import type { NoDataItem } from "@/features/dashboard/selectors";

/**
 * Amber notice listing sites the scraper found no/low data for (excluded from
 * save). Each chip has a ＋ to pull it back into the table; the header offers a
 * one-click copy of all the URLs for manual research.
 */
export function NoDataNotice({
  items,
  onInclude,
}: {
  items: NoDataItem[];
  onInclude: (key: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  if (items.length === 0) return null;

  async function copyUrls() {
    try {
      await navigator.clipboard.writeText(
        items.map((i) => i.display).join("\n"),
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable (e.g. non-secure context) — ignore.
    }
  }

  return (
    <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className="font-medium">
          {items.length} site{items.length > 1 ? "s" : ""} with no / low contact
          details (excluded from save) — click ＋ to add one back to the table:
        </p>
        <button
          type="button"
          onClick={copyUrls}
          className="shrink-0 rounded border border-amber-400 px-2 py-1 text-[11px] font-medium hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/40"
        >
          {copied ? "Copied!" : "Copy URLs"}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item.key}
            className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-100/60 py-0.5 pl-2 pr-0.5 dark:border-amber-800 dark:bg-amber-900/40"
          >
            {item.display}
            <button
              type="button"
              onClick={() => onInclude(item.key)}
              title="Add this URL back to the table"
              className="rounded px-1 font-semibold text-amber-700 hover:bg-amber-200 dark:text-amber-300 dark:hover:bg-amber-800"
            >
              ＋
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
