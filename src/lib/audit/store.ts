import "server-only";

import { get, put } from "@vercel/blob";

/*
 * Save-event audit log kept as ONE JSON file — "audit.json" — in a PRIVATE
 * Vercel Blob store (NOT in the Google Sheet, and not publicly reachable). On
 * each successful save we read the file, prepend the new entry, and overwrite
 * it. /admin reads the same file back. If no Blob store is connected, this
 * degrades gracefully (logging is a no-op and the admin table shows empty).
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

/**
 * Connected when the Blob credentials are present. On Vercel a connected store
 * injects BLOB_READ_WRITE_TOKEN (or a store id used with the OIDC token).
 */
export function auditConfigured(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID,
  );
}

/** Read the audit file, newest first. Empty when unconfigured / not yet created. */
export async function readAuditLog(limit = 1000): Promise<AuditEntry[]> {
  if (!auditConfigured()) return [];
  try {
    const result = await get(FILE, { access: "private", useCache: false });
    if (!result || result.stream === null) return [];
    const data = await new Response(result.stream).json();
    return Array.isArray(data) ? (data as AuditEntry[]).slice(0, limit) : [];
  } catch {
    return [];
  }
}

/** Prepend one save event and overwrite the private audit.json. */
export async function logSave(entry: AuditEntry): Promise<void> {
  if (!auditConfigured()) return;
  const current = await readAuditLog(MAX_ENTRIES);
  const next = [entry, ...current].slice(0, MAX_ENTRIES);
  await put(FILE, JSON.stringify(next, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}
