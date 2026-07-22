"use client";

import { useState } from "react";

import { Button, Input } from "@/components/ui";
import { stripProtocol } from "@/lib/format";

export interface RowData {
  id: string;
  worksheet: string;
  source_url: string;
  practice_name: string;
  doctor_name: string;
  office_manager_name: string;
  phone: string;
  email: string;
  location: string;
  State: string;
}

type Fields = Omit<RowData, "id" | "worksheet" | "source_url">;

const FIELDS: { key: keyof Fields; label: string }[] = [
  { key: "practice_name", label: "Practice" },
  { key: "doctor_name", label: "Doctor" },
  { key: "office_manager_name", label: "Office manager" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "location", label: "Location" },
  { key: "State", label: "State" },
];

const ENDPOINT = "/api/research/nodata";
const jsonPost = (body: unknown) =>
  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

/**
 * One editable no-data row. Details are filled in manually; "Add to sheet"
 * always pushes to the row's own origin tab (never a different one).
 */
export function ResearchRow({
  record,
  onRemove,
}: {
  record: RowData;
  onRemove: (id: string) => void;
}) {
  const [fields, setFields] = useState<Fields>({
    practice_name: record.practice_name,
    doctor_name: record.doctor_name,
    office_manager_name: record.office_manager_name,
    phone: record.phone,
    email: record.email,
    location: record.location,
    State: record.State,
  });
  const [busy, setBusy] = useState<"" | "save" | "add" | "delete">("");

  const set = (k: keyof Fields, v: string) =>
    setFields((prev) => ({ ...prev, [k]: v }));

  async function save() {
    setBusy("save");
    try {
      await jsonPost({ action: "update", id: record.id, patch: fields });
    } finally {
      setBusy("");
    }
  }

  async function addToSheet() {
    if (!record.worksheet) return;
    setBusy("add");
    try {
      const res = await fetch("/api/sheets/append", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          worksheet: record.worksheet,
          records: [{ ...fields, source_url: record.source_url }],
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        window.alert(d?.error ?? "Could not add to the worksheet.");
        setBusy("");
        return;
      }
      await jsonPost({ action: "delete", id: record.id });
      onRemove(record.id);
    } catch {
      window.alert("Could not add to the worksheet.");
      setBusy("");
    }
  }

  async function remove() {
    if (!window.confirm("Delete this URL from the research list?")) return;
    setBusy("delete");
    try {
      await jsonPost({ action: "delete", id: record.id });
      onRemove(record.id);
    } finally {
      setBusy("");
    }
  }

  const href = record.source_url.startsWith("http")
    ? record.source_url
    : `https://${record.source_url}`;

  return (
    <tr className="border-b border-border align-middle last:border-0">
      <td className="px-2 py-2">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline"
        >
          {stripProtocol(record.source_url)}
        </a>
        <div className="text-[10px] text-muted-foreground">
          from {record.worksheet}
        </div>
      </td>
      {FIELDS.map((f) => (
        <td key={f.key} className="px-1 py-1">
          <Input
            value={fields[f.key]}
            placeholder={f.label}
            onChange={(e) => set(f.key, e.target.value)}
            className="h-8 min-w-32"
          />
        </td>
      ))}
      <td className="px-2 py-1 text-xs font-medium whitespace-nowrap">
        {record.worksheet}
      </td>
      <td className="px-2 py-1 whitespace-nowrap">
        <div className="flex gap-1">
          <Button
            variant="secondary"
            onClick={save}
            disabled={busy !== ""}
            className="h-8 px-2 text-xs"
          >
            {busy === "save" ? "…" : "Save"}
          </Button>
          <Button
            onClick={addToSheet}
            disabled={busy !== "" || !record.worksheet}
            className="h-8 px-2 text-xs"
          >
            {busy === "add" ? "…" : "Add to sheet"}
          </Button>
          <Button
            variant="destructive"
            onClick={remove}
            disabled={busy !== ""}
            className="h-8 px-2 text-xs"
          >
            ✕
          </Button>
        </div>
      </td>
    </tr>
  );
}
