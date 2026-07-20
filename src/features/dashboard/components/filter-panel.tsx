"use client";

import type {
  AhrefsFilters,
  RefdomainLinkStatus,
  RefdomainStatus,
} from "@/lib/ahrefs/types";
import {
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";

const NEW_LINK_STATUSES: { value: RefdomainLinkStatus; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "newly_published", label: "Newly published" },
  { value: "link_added", label: "Link added" },
  { value: "link_restored", label: "Link restored" },
];

const LOST_LINK_STATUSES: { value: RefdomainLinkStatus; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "link_removed", label: "Link removed" },
  { value: "link_lost", label: "Link lost" },
];

/** The configurable Ahrefs filters (Phase 1). Pure presentational + onChange. */
export function FilterPanel({
  filters,
  onChange,
  disabled,
}: {
  filters: AhrefsFilters;
  onChange: (next: AhrefsFilters) => void;
  disabled?: boolean;
}) {
  function update<K extends keyof AhrefsFilters>(
    key: K,
    value: AhrefsFilters[K],
  ) {
    onChange({ ...filters, [key]: value });
  }

  function numOrUndefined(v: string): number | undefined {
    if (v.trim() === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }

  // Changing the primary status resets the sub-status to "Any".
  function updateStatus(value: RefdomainStatus) {
    onChange({ ...filters, status: value, linkStatus: "any" });
  }

  const status = filters.status ?? "all";
  const linkStatusOptions =
    status === "new"
      ? NEW_LINK_STATUSES
      : status === "lost"
        ? LOST_LINK_STATUSES
        : [];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Domain contains" hint="e.g. dent">
        <Input
          value={filters.domainKeyword ?? ""}
          placeholder="keyword"
          disabled={disabled}
          onChange={(e) => update("domainKeyword", e.target.value)}
        />
      </Field>

      <Field label="Status">
        <Select
          value={status}
          disabled={disabled}
          onValueChange={(v) => updateStatus(v as RefdomainStatus)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {linkStatusOptions.length > 0 ? (
        <Field
          label="Link status"
          hint="Newly published & Link added: since Apr 2021"
        >
          <Select
            value={filters.linkStatus ?? "any"}
            disabled={disabled}
            onValueChange={(v) => update("linkStatus", v as RefdomainLinkStatus)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {linkStatusOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}

      <Field label="Row limit" hint="max domains from Ahrefs">
        <Input
          type="number"
          min={1}
          max={5000}
          value={filters.limit ?? ""}
          placeholder="1000"
          disabled={disabled}
          onChange={(e) => update("limit", numOrUndefined(e.target.value))}
        />
      </Field>

      <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filters.sinceLastMonth ?? false}
            disabled={disabled}
            onChange={(e) => update("sinceLastMonth", e.target.checked)}
          />
          Last month only
        </label>
      </div>
    </div>
  );
}
