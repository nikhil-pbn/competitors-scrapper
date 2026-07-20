"use client";

import {
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";

/** Competitor/worksheet picker + the (auto-filled, editable) competitor domain. */
export function CompetitorFields({
  worksheets,
  worksheetsError,
  worksheet,
  onSelectWorksheet,
  target,
  onTargetChange,
  busy,
  onSearch,
}: {
  worksheets: string[];
  worksheetsError: string | null;
  worksheet: string;
  onSelectWorksheet: (name: string) => void;
  target: string;
  onTargetChange: (value: string) => void;
  busy: boolean;
  onSearch: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field
        label="Competitor / worksheet"
        hint="required — target worksheet for Search, Upload & URLs"
      >
        {worksheetsError ? (
          <span className="text-xs text-red-500">{worksheetsError}</span>
        ) : (
          <Select
            value={worksheet || undefined}
            onValueChange={onSelectWorksheet}
            disabled={busy || worksheets.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  worksheets.length === 0 ? "Loading…" : "Select competitor…"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {worksheets.map((w) => (
                <SelectItem key={w} value={w}>
                  {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Field>

      <Field label="Competitor domain" hint="e.g. adit.com">
        <Input
          value={target}
          placeholder="competitor.com"
          disabled={busy}
          onChange={(e) => onTargetChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearch();
          }}
        />
      </Field>
    </div>
  );
}
