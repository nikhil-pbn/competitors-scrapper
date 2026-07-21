"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui";

/**
 * Admin table controls: manual refresh, JSON export, clear-all, and an
 * automatic refresh roughly hourly so a left-open tab stays current.
 */
export function AdminTools({ entries }: { entries: unknown[] }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [router]);

  function downloadJson() {
    const blob = new Blob([JSON.stringify(entries, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit-log.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function clearAll() {
    if (
      !window.confirm(
        "Delete ALL audit entries? This clears audit.json and can't be undone.",
      )
    ) {
      return;
    }
    await fetch("/api/admin/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        onClick={() => router.refresh()}
        className="h-8 px-2.5 text-xs"
      >
        Refresh
      </Button>
      <Button
        variant="secondary"
        onClick={downloadJson}
        disabled={entries.length === 0}
        className="h-8 px-2.5 text-xs"
      >
        Download JSON
      </Button>
      <Button
        variant="destructive"
        onClick={clearAll}
        disabled={entries.length === 0}
        className="h-8 px-2.5 text-xs"
      >
        Clear all
      </Button>
    </div>
  );
}
