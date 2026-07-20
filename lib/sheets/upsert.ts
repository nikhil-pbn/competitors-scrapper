import { BUSINESS_RECORD_FIELDS, type BusinessRecord } from "@/lib/types";

/**
 * Pure upsert planning (no I/O) so it can be unit-tested.
 *
 * Given the worksheet header, its current data rows, and the records to save,
 * decide for each record whether it is a new row, an in-place update (only when
 * a mapped cell actually changes), an unchanged match, or a within-batch dupe.
 */

/** Normalize a header/field label for tolerant matching ("Source URL" -> "source_url"). */
export function normalizeKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Normalize a source URL for matching (protocol/trailing-slash/case-insensitive). */
export function urlKey(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

/** Convert a 0-based column index to an A1 column letter (0 -> A, 26 -> AA). */
export function columnLetter(index: number): string {
  let n = index;
  let letter = "";
  do {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letter;
}

export interface UpsertPlan {
  /** Values for rows to append (in the sheet's column order). */
  newRows: string[][];
  /** Existing rows to overwrite, with their 1-based sheet row number. */
  updates: { rowNumber: number; values: string[] }[];
  added: number;
  /** Matched rows where at least one cell actually changed. */
  updated: number;
  /** Matched rows whose data was already identical. */
  unchanged: number;
  /** Records skipped because the same URL appeared earlier in this batch. */
  skippedDuplicates: number;
}

export function planUpsert(
  header: string[],
  existingRows: string[][],
  records: BusinessRecord[],
): UpsertPlan {
  // Map each sheet column -> which BusinessRecord field feeds it (or null).
  const columnField = header.map((h) => {
    const key = normalizeKey(h);
    return BUSINESS_RECORD_FIELDS.find((f) => normalizeKey(f) === key) ?? null;
  });
  const sourceCol = header.findIndex((h) => normalizeKey(h) === "source_url");

  // Map normalized source_url -> its sheet row (1-based) and current values.
  const existingByUrl = new Map<
    string,
    { rowNumber: number; values: string[] }
  >();
  if (sourceCol !== -1) {
    existingRows.forEach((row, i) => {
      const key = urlKey(String(row?.[sourceCol] ?? ""));
      if (key && !existingByUrl.has(key)) {
        existingByUrl.set(key, {
          rowNumber: i + 2, // data starts at sheet row 2
          values: (row ?? []).map((v) => String(v ?? "")),
        });
      }
    });
  }

  const seen = new Set<string>();
  const newRows: string[][] = [];
  const updates: { rowNumber: number; values: string[] }[] = [];
  let updated = 0;
  let unchanged = 0;
  let skippedDuplicates = 0;

  for (const record of records) {
    const key = urlKey(record.source_url);

    if (key && seen.has(key)) {
      skippedDuplicates++;
      continue;
    }
    if (key) seen.add(key);

    const existing = key ? existingByUrl.get(key) : undefined;

    if (existing) {
      // Merge: keep current value where the incoming one is blank; detect any change.
      const merged: string[] = [];
      let changed = false;
      for (let c = 0; c < header.length; c++) {
        const current = existing.values[c] ?? "";
        // Never rewrite the source_url column — it's the match key, so formatting
        // differences (trailing slash, protocol) must not count as a change.
        if (c === sourceCol) {
          merged[c] = current;
          continue;
        }
        const field = columnField[c];
        const incoming = field ? String(record[field] ?? "").trim() : "";
        const value = incoming !== "" ? incoming : current;
        merged[c] = value;
        if (value !== current) changed = true;
      }
      if (changed) {
        updates.push({ rowNumber: existing.rowNumber, values: merged });
        updated++;
      } else {
        unchanged++;
      }
    } else {
      newRows.push(
        columnField.map((field) => (field ? String(record[field] ?? "") : "")),
      );
    }
  }

  return {
    newRows,
    updates,
    added: newRows.length,
    updated,
    unchanged,
    skippedDuplicates,
  };
}
