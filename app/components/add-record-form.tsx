"use client";

import { useState } from "react";

import {
  emptyBusinessRecord,
  hasContactData,
  type BusinessRecord,
} from "@/lib/types";
import { Button, Field, TextInput } from "./ui";

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
 * Manually add a contact row to the results table (for URLs the scraper
 * couldn't extract but the user researched by hand). The new row joins the
 * table and is saved together with the rest.
 */
export function AddRecordForm({
  onAdd,
  disabled,
}: {
  onAdd: (record: BusinessRecord) => void;
  disabled?: boolean;
}) {
  const [form, setForm] = useState<BusinessRecord>(emptyBusinessRecord(""));

  const update = (key: keyof BusinessRecord, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Needs a URL plus at least one contact detail to be worth adding.
  const valid = form.source_url.trim() !== "" && hasContactData(form);

  function submit() {
    if (!valid || disabled) return;
    onAdd(form);
    setForm(emptyBusinessRecord("")); // reset for the next entry
  }

  return (
    <div className="rounded-md border border-border bg-background/50 p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FIELDS.map((f) => (
          <Field key={f.key} label={f.label}>
            <TextInput
              value={form[f.key]}
              placeholder={f.placeholder}
              disabled={disabled}
              onChange={(e) => update(f.key, e.target.value)}
            />
          </Field>
        ))}
      </div>
      <div className="mt-3 flex max-md:flex-col items-center justify-end gap-3">
        {!valid ? (
          <span className="text-xs text-muted">
            Enter a Source URL and at least one detail.
          </span>
        ) : null}
        <Button onClick={submit} disabled={disabled || !valid}>
          Add to table
        </Button>
      </div>
    </div>
  );
}
