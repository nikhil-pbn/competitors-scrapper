/**
 * Browser-side helpers for calling the phase API routes. No business logic —
 * just request/response plumbing (and SSE parsing for analyze/classify).
 */

import type { AhrefsFilters } from "@/lib/ahrefs/types";
import type {
  AppendSummary,
  BusinessRecord,
  DentalCheck,
  ReferringDomain,
} from "@/lib/types";

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

/**
 * POST JSON and read a Server-Sent Events response, calling `onEvent` for each
 * frame. Reports a failed start (non-2xx) as an `error` event.
 */
async function streamSse(
  url: string,
  body: unknown,
  onEvent: (event: string, payload: Record<string, unknown>) => void,
  startError: string,
): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    onEvent("error", { error: data?.error ?? startError });
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
      if (data) onEvent(event, JSON.parse(data));
    }
  }
}

export interface AnalyzeCallbacks {
  onProgress?: (done: number, total: number, record: BusinessRecord) => void;
  onDone?: (records: BusinessRecord[]) => void;
  onError?: (message: string) => void;
}

/** Phase 2: stream website analysis via Server-Sent Events. */
export async function analyzeDomains(
  domains: string[],
  callbacks: AnalyzeCallbacks,
): Promise<void> {
  await streamSse(
    "/api/analyze",
    { domains },
    (event, p) => {
      if (event === "progress") {
        callbacks.onProgress?.(
          p.done as number,
          p.total as number,
          p.record as BusinessRecord,
        );
      } else if (event === "done") {
        callbacks.onDone?.(p.records as BusinessRecord[]);
      } else if (event === "error") {
        callbacks.onError?.(p.error as string);
      }
    },
    "Analysis failed to start.",
  );
}

export interface ClassifyCallbacks {
  onProgress?: (done: number, total: number, domain: string, check: DentalCheck) => void;
  onDone?: () => void;
  onError?: (message: string) => void;
}

/** Pre-analyze: stream the dental/non-dental check via Server-Sent Events. */
export async function classifyDomains(
  domains: string[],
  callbacks: ClassifyCallbacks,
): Promise<void> {
  await streamSse(
    "/api/classify",
    { domains },
    (event, p) => {
      if (event === "progress") {
        callbacks.onProgress?.(
          p.done as number,
          p.total as number,
          p.domain as string,
          p.check as DentalCheck,
        );
      } else if (event === "done") {
        callbacks.onDone?.();
      } else if (event === "error") {
        callbacks.onError?.(p.error as string);
      }
    },
    "Dental check failed to start.",
  );
}
