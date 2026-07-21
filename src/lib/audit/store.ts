import "server-only";

import { randomUUID } from "node:crypto";
import { get, put } from "@vercel/blob";

import { readStreamJson } from "@/lib/blob-json";

/*
 * Save-event audit log kept as ONE JSON file — "audit.json" — in a PRIVATE
 * Vercel Blob store (not in the Google Sheet, not publicly reachable). Each
 * save prepends an entry; admin deletes rewrite the same file. Degrades
 * gracefully to empty/no-op when no Blob store is connected.
 */

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  worksheet: string;
  received: number;
  added: number;
  updated: number;
  unchanged: number;
  /** source_url of each row this save added — used to delete them later. */
  addedUrls?: string[];
}

const FILE = "audit.json";
const MAX_ENTRIES = 2000;

/** Current time as an ISO string in IST (Asia/Kolkata is a fixed +05:30, no DST). */
function istTimestamp(): string {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().replace("Z", "+05:30");
}

/** Connected when Blob credentials are present (token, or store id + OIDC on Vercel). */
export function auditConfigured(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID,
  );
}

/** Overwrite the whole audit file. */
async function writeAll(entries: AuditEntry[]): Promise<void> {
  await put(FILE, JSON.stringify(entries, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

/** Read the audit file, newest first. Empty when unconfigured / not yet created. */
export async function readAuditLog(limit = 1000): Promise<AuditEntry[]> {
  if (!auditConfigured()) return [];
  try {
    const result = await get(FILE, { access: "private", useCache: false });
    if (!result || result.stream === null) return [];
    const data = await readStreamJson(result.stream);
    return Array.isArray(data) ? (data as AuditEntry[]).slice(0, limit) : [];
  } catch {
    return [];
  }
}

/** Prepend one save event (id + IST timestamp stamped here) and overwrite the file. */
export async function logSave(
  entry: Omit<AuditEntry, "id" | "timestamp">,
): Promise<void> {
  if (!auditConfigured()) return;
  const current = await readAuditLog(MAX_ENTRIES);
  const full: AuditEntry = {
    id: randomUUID(),
    timestamp: istTimestamp(),
    ...entry,
  };
  await writeAll([full, ...current].slice(0, MAX_ENTRIES));
}

/**
 * Delete one entry by id (falls back to timestamp for older rows) and return
 * the removed entry, so the caller can also remove its rows from the worksheet.
 */
export async function deleteEntry(key: string): Promise<AuditEntry | null> {
  if (!auditConfigured() || !key) return null;
  const current = await readAuditLog(MAX_ENTRIES);
  const removed =
    current.find((e) => e.id === key || e.timestamp === key) ?? null;
  const next = current.filter((e) => e.id !== key && e.timestamp !== key);
  if (next.length !== current.length) await writeAll(next);
  return removed;
}

/** Remove every entry (writes an empty file). */
export async function clearAudit(): Promise<void> {
  if (!auditConfigured()) return;
  await writeAll([]);
}
