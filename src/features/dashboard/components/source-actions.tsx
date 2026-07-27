"use client";

import { useRef } from "react";

import { Button } from "@/components/ui";

/**
 * Primary data-source actions. Search works with any number of competitors;
 * Upload / Sample need exactly one selected (they tag with that competitor).
 */
export function SourceActions({
  fetching,
  searchDisabled,
  singleDisabled,
  hint,
  onUpload,
  onSample,
  onSearch,
}: {
  fetching: boolean;
  searchDisabled: boolean;
  singleDisabled: boolean;
  hint: string | null;
  onUpload: (file: File) => void;
  onSample: () => void;
  onSearch: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {hint ? (
        <span className="mr-auto text-xs text-amber-600 dark:text-amber-400">
          {hint}
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
          e.target.value = "";
        }}
      />
      <Button
        variant="secondary"
        onClick={() => fileInputRef.current?.click()}
        disabled={singleDisabled}
      >
        Upload CSV
      </Button>
      <Button variant="secondary" onClick={onSample} disabled={singleDisabled}>
        Load sample data
      </Button>
      <Button onClick={onSearch} disabled={searchDisabled}>
        {fetching ? "Fetching…" : "Search"}
      </Button>
    </div>
  );
}
