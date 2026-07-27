"use client";

import { useState } from "react";

import {
  emptyBusinessRecord,
  hasContactData,
  type BusinessRecord,
} from "@/lib/types";
import {
  Button,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";

const FIELDS: { key: keyof BusinessRecord; label: string; placeholder?: string }[] =
  [
    { key: "source_url", label: "Source URL *", placeholder: "brightdentalcare.com" },
    { key: "practice_name", label: "Practice name" },
    { key: "doctor_name", label: "Doctor name" },
    { key: "office_manager_name", label: "Office manager" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "location", label: "Location" },
    { key: "State", label: "State" },
  ];

/**
 * Manually add a contact row (for URLs researched by hand). The row must be
 * tagged with one of the selected competitors so it saves to the right tab.
 */
export function AddRecordForm({
  onAdd,
  disabled,
  competitors,
}: {
  onAdd: (record: BusinessRecord) => void;
  disabled?: boolean;
  competitors: string[];
}) {
  const [form, setForm] = useState<BusinessRecord>(emptyBusinessRecord(""));
  const [competitor, setCompetitor] = useState(competitors[0] ?? "");

  const update = (key: keyof BusinessRecord, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Needs a competitor, a URL, and at least one contact detail.
  const valid =
    competitor !== "" && form.source_url.trim() !== "" && hasContactData(form);

  function submit() {
    if (!valid || disabled) return;
    onAdd({ ...form, competitor });
    setForm(emptyBusinessRecord("")); // reset details; keep the competitor
  }

  return (
    <div className="rounded-md border border-border bg-background/50 p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Competitor *">
          <Select
            value={competitor || undefined}
            onValueChange={setCompetitor}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pick tab" />
            </SelectTrigger>
            <SelectContent>
              {competitors.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {FIELDS.map((f) => (
          <Field key={f.key} label={f.label}>
            <Input
              value={form[f.key] ?? ""}
              placeholder={f.placeholder}
              disabled={disabled}
              onChange={(e) => update(f.key, e.target.value)}
            />
          </Field>
        ))}
      </div>
      <div className="mt-3 flex max-md:flex-col items-center justify-end gap-3">
        {!valid ? (
          <span className="text-xs text-muted-foreground">
            Pick a competitor, a Source URL, and at least one detail.
          </span>
        ) : null}
        <Button onClick={submit} disabled={disabled || !valid}>
          Add to table
        </Button>
      </div>
    </div>
  );
}
