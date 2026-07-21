"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui";

/**
 * Deletes one audit entry (admin-only endpoint) and, for saves that added rows,
 * removes exactly those rows from the worksheet tab too — then refreshes.
 */
export function DeleteEntryButton({
  entryKey,
  worksheet,
  rows,
}: {
  entryKey: string;
  worksheet?: string;
  rows?: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (busy) return;
    const message =
      rows && rows > 0
        ? `Delete this entry AND remove its ${rows} row${rows === 1 ? "" : "s"} from the "${worksheet}" tab? This can't be undone.`
        : "Delete this entry from the log?";
    if (!window.confirm(message)) return;

    setBusy(true);
    try {
      const res = await fetch("/api/admin/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entryKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.sheetError) {
        window.alert(
          "The log entry was removed, but the worksheet rows couldn't be deleted. Try again or remove them manually.",
        );
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="destructive"
      onClick={remove}
      disabled={busy}
      className="h-7 px-2 text-xs"
    >
      {busy ? "…" : "Delete"}
    </Button>
  );
}
