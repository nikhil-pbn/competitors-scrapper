"use client";

import type {
  AhrefsFilters,
  RefdomainLinkStatus,
  RefdomainRange,
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

const RANGE_OPTIONS: { value: RefdomainRange; label: string }[] = [
  { value: "last_24h", label: "Last 24 hours" },
  { value: "last_7d", label: "Last 7 days" },
  { value: "last_month", label: "Last month" },
  { value: "last_3m", label: "Last 3 months" },
  { value: "last_6m", label: "Last 6 months" },
  { value: "last_year", label: "Last year" },
  { value: "last_2y", label: "Last 2 years" },
  { value: "last_5y", label: "Last 5 years" },
  { value: "all", label: "All time" },
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

      <Field label="Date range" hint="links first seen within this period">
        <Select
          value={filters.range ?? "last_month"}
          disabled={disabled}
          onValueChange={(v) => update("range", v as RefdomainRange)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}
