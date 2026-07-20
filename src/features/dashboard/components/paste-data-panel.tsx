"use client";

import { Button } from "@/components/ui";

const PLACEHOLDER =
  "URLs only:\nbrightdentalcare.com\nhttps://familysmiles.com/\n\nor a CSV:\nDomain,DR,Traffic,First seen\nrosecrestdental.com,35,63,2026-06-30";

/**
 * Collapsible alternative to the Ahrefs API: paste a URL list, a CSV/TSV, or a
 * table copied straight from the Ahrefs Referring domains report.
 */
export function PasteDataPanel({
  value,
  onChange,
  onUse,
  blocked,
}: {
  value: string;
  onChange: (value: string) => void;
  onUse: () => void;
  blocked: boolean;
}) {
  return (
    <details className="mt-4 border-t border-border pt-4">
      <summary className="cursor-pointer text-sm text-muted-foreground">
        Or paste URLs, a CSV, or an Ahrefs table (skip Ahrefs API)
      </summary>
      <div className="mt-3 flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          Paste any of: a plain list of URLs (one per line), a CSV with a header
          row (Domain, DR, Traffic, …), or a table copied straight from the
          Ahrefs Referring domains report. All are converted to the table below.
        </p>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={blocked}
          rows={6}
          placeholder={PLACEHOLDER}
          className="w-full rounded-md border border-border bg-card p-3 font-mono text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
        />
        <div className="flex justify-end">
          <Button onClick={onUse} disabled={blocked || !value.trim()}>
            Use pasted data
          </Button>
        </div>
      </div>
    </details>
  );
}
