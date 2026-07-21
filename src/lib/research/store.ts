import "server-only";

import { randomUUID } from "node:crypto";
import { get, put } from "@vercel/blob";

import { readStreamJson } from "@/lib/blob-json";

/*
 * "No-data" URLs saved for manual research, kept as ONE JSON file —
 * "nodata.json" — in the same private Vercel Blob store as the audit log. Each
 * record is a full (editable) contact row tagged with the competitor tab it
 * came from; the team fills in details they find, then pushes a row into a
 * worksheet. Degrades gracefully to empty/no-op when no Blob store is connected.
 */

export interface NoDataRecord {
  id: string;
  createdAt: string;
  worksheet: string;
  practice_name: string;
  doctor_name: string;
  office_manager_name: string;
  phone: string;
  email: string;
  location: string;
  State: string;
  source_url: string;
}

export type NoDataFields = Omit<
  NoDataRecord,
  "id" | "createdAt" | "worksheet" | "source_url"
>;

const FILE = "nodata.json";
const MAX_ENTRIES = 5000;

function istTimestamp(): string {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().replace("Z", "+05:30");
}

function urlKey(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

export function researchConfigured(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID,
  );
}

async function writeAll(items: NoDataRecord[]): Promise<void> {
  await put(FILE, JSON.stringify(items, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

/** Read saved records, newest first. Empty when unconfigured / not created. */
export async function readNoData(limit = MAX_ENTRIES): Promise<NoDataRecord[]> {
  if (!researchConfigured()) return [];
  try {
    const result = await get(FILE, { access: "private", useCache: false });
    if (!result || result.stream === null) return [];
    const data = await readStreamJson(result.stream);
    return Array.isArray(data) ? (data as NoDataRecord[]).slice(0, limit) : [];
  } catch {
    return [];
  }
}

/** Add URLs for a competitor (blank details), skipping ones already stored for it. */
export async function addNoDataUrls(
  worksheet: string,
  urls: string[],
): Promise<number> {
  if (!researchConfigured() || !worksheet || urls.length === 0) return 0;
  const current = await readNoData(MAX_ENTRIES);
  const seen = new Set(
    current.map((i) => `${i.worksheet}::${urlKey(i.source_url)}`),
  );

  const additions: NoDataRecord[] = [];
  for (const raw of urls) {
    const url = raw.trim();
    if (!url) continue;
    const key = `${worksheet}::${urlKey(url)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    additions.push({
      id: randomUUID(),
      createdAt: istTimestamp(),
      worksheet,
      practice_name: "",
      doctor_name: "",
      office_manager_name: "",
      phone: "",
      email: "",
      location: "",
      State: "",
      source_url: url,
    });
  }
  if (additions.length === 0) return 0;

  await writeAll([...additions, ...current].slice(0, MAX_ENTRIES));
  return additions.length;
}

/** Patch the editable detail fields of one record. */
export async function updateNoData(
  id: string,
  patch: Partial<NoDataFields>,
): Promise<void> {
  if (!researchConfigured() || !id) return;
  const current = await readNoData(MAX_ENTRIES);
  let changed = false;
  const next = current.map((r) => {
    if (r.id !== id) return r;
    changed = true;
    return { ...r, ...patch };
  });
  if (changed) await writeAll(next);
}

/** Delete one record by id. */
export async function deleteNoData(id: string): Promise<void> {
  if (!researchConfigured() || !id) return;
  const current = await readNoData(MAX_ENTRIES);
  const next = current.filter((r) => r.id !== id);
  if (next.length !== current.length) await writeAll(next);
}
