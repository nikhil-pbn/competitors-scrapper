"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui";

/** Deletes one audit entry (admin-only endpoint), then refreshes the table. */
export function DeleteEntryButton({ entryKey }: { entryKey: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (busy) return;
    if (
      !window.confirm("Delete this entry? It's removed from audit.json too.")
    ) {
      return;
    }
    setBusy(true);
    try {
      await fetch("/api/admin/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entryKey }),
      });
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
