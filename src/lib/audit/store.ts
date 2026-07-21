import "server-only";

import { list, put } from "@vercel/blob";

/*
 * Save-event audit log kept as ONE JSON file — "audit.json" — in Vercel Blob
 * (NOT in the Google Sheet). On each successful save we read the file, prepend
 * the new entry, and overwrite it. /admin reads the same file back. If no Blob
 * store is connected, everything degrades gracefully (logging is a no-op and
 * the admin table shows empty).
 *
 * Note: Vercel Blob files are reachable by their (unguessable) URL, so treat
 * this as light internal record-keeping, not secret data.
 */

export interface AuditEntry {
  timestamp: string;
  user: string;
  worksheet: string;
  received: number;
  added: number;
  updated: number;
  unchanged: number;
}

const FILE = "audit.json";
const MAX_ENTRIES = 2000;

/** Whether a Blob store is connected (its token is injected by Vercel). */
export function auditConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function currentFileUrl(): Promise<string | null> {
  const { blobs } = await list({ prefix: FILE, limit: 1 });
  return blobs.find((b) => b.pathname === FILE)?.url ?? blobs[0]?.url ?? null;
}

/** Read all entries, newest first (empty when no store is connected). */
export async function readAuditLog(limit = 1000): Promise<AuditEntry[]> {
  if (!auditConfigured()) return [];
  try {
    const url = await currentFileUrl();
    if (!url) return [];
    // Cache-bust so an overwrite is reflected immediately.
    const res = await fetch(`${url}?_=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as AuditEntry[]).slice(0, limit) : [];
  } catch {
    return [];
  }
}

/** Prepend one save event and overwrite the file. No-op if no store connected. */
export async function logSave(entry: AuditEntry): Promise<void> {
  if (!auditConfigured()) return;
  const current = await readAuditLog(MAX_ENTRIES);
  const next = [entry, ...current].slice(0, MAX_ENTRIES);
  await put(FILE, JSON.stringify(next, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}
