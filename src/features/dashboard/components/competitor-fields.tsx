"use client";

import { Field, MultiSelect } from "@/components/ui";

/**
 * Multi-select competitor picker. Search runs Ahrefs once per selected
 * competitor; their target domains are derived from the built-in list.
 */
export function CompetitorFields({
  worksheets,
  worksheetsError,
  selected,
  onChange,
  busy,
}: {
  worksheets: string[];
  worksheetsError: string | null;
  selected: string[];
  onChange: (next: string[]) => void;
  busy: boolean;
}) {
  return (
    <Field
      label="Competitors"
      hint="required — pick one or more; Search runs Ahrefs for each"
    >
      {worksheetsError ? (
        <span className="text-xs text-red-500">{worksheetsError}</span>
      ) : worksheets.length === 0 ? (
        <span className="text-xs text-muted-foreground">Loading…</span>
      ) : (
        <MultiSelect
          options={worksheets}
          selected={selected}
          onChange={onChange}
          placeholder="Select competitors…"
          disabled={busy}
        />
      )}
    </Field>
  );
}
