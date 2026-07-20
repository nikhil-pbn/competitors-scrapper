"use client";

import { useRef } from "react";

import { Button } from "@/components/ui";

/**
 * The primary data-source actions: upload a file, load sample data, or run a
 * live Ahrefs search. All are disabled until a competitor is selected.
 */
export function SourceActions({
  blocked,
  noCompetitor,
  fetching,
  canSearch,
  onUpload,
  onSample,
  onSearch,
}: {
  blocked: boolean;
  noCompetitor: boolean;
  fetching: boolean;
  canSearch: boolean;
  onUpload: (file: File) => void;
  onSample: () => void;
  onSearch: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {noCompetitor ? (
        <span className="mr-auto text-xs text-amber-600 dark:text-amber-400">
          Select a competitor above to enable actions.
        </span>
      ) : null}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.tsv,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = ""; // allow re-uploading the same file
        }}
      />
      <Button
        variant="secondary"
        onClick={() => fileInputRef.current?.click()}
        disabled={blocked}
      >
        Upload CSV
      </Button>
      <Button variant="secondary" onClick={onSample} disabled={blocked}>
        Load sample data
      </Button>
      <Button onClick={onSearch} disabled={blocked || !canSearch}>
        {fetching ? "Fetching…" : "Search"}
      </Button>
    </div>
  );
}
