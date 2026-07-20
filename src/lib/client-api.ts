/**
 * Browser-side helpers for calling the phase API routes. No business logic —
 * just request/response plumbing (and SSE parsing for Phase 2).
 */

import type { AhrefsFilters } from "@/lib/ahrefs/types";
import type { AppendSummary, BusinessRecord, ReferringDomain } from "@/lib/types";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error ?? `Request failed (${res.status}).`);
  }
  return data as T;
}

/** Phase 3 read: load worksheet (tab) names for the competitor dropdown. */
export async function loadWorksheets(): Promise<string[]> {
  const res = await fetch("/api/worksheets");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Failed to load worksheets.");
  return data.worksheets ?? [];
}

/** Phase 1: fetch filtered referring domains. */
export async function fetchDomains(
  target: string,
  filters: AhrefsFilters,
): Promise<ReferringDomain[]> {
  const data = await postJson<{ domains: ReferringDomain[] }>("/api/ahrefs", {
    target,
    filters,
  });
  return data.domains;
}

/** Phase 3 write: append reviewed records to the selected worksheet. */
export async function appendToSheet(
  worksheet: string,
  records: BusinessRecord[],
): Promise<AppendSummary> {
  const data = await postJson<{ summary: AppendSummary }>(
    "/api/sheets/append",
    { worksheet, records },
  );
  return data.summary;
}

export interface AnalyzeCallbacks {
  onProgress?: (done: number, total: number, record: BusinessRecord) => void;
  onDone?: (records: BusinessRecord[]) => void;
  onError?: (message: string) => void;
}

/**
 * Phase 2: stream website analysis via Server-Sent Events. Parses the event
 * stream and dispatches progress/done/error callbacks. Returns when complete.
 */
export async function analyzeDomains(
  domains: string[],
  callbacks: AnalyzeCallbacks,
): Promise<void> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domains }),
  });

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    callbacks.onError?.(data?.error ?? "Analysis failed to start.");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line.
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);

      let event = "message";
      let data = "";
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;

      const payload = JSON.parse(data);
      if (event === "progress") {
        callbacks.onProgress?.(payload.done, payload.total, payload.record);
      } else if (event === "done") {
        callbacks.onDone?.(payload.records);
      } else if (event === "error") {
        callbacks.onError?.(payload.error);
      }
    }
  }
}
