/** Normalize a source URL for matching (protocol/path/case-insensitive). */
export function sourceKey(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

/** Stable key for a per-row phone/email "add to sheet" override. */
export function approvalKey(url: string, field: "phone" | "email"): string {
  return `${sourceKey(url)}::${field}`;
}

/** Ensure a manually-entered URL has a protocol so links work. */
export function normalizeSourceUrl(url: string): string {
  const u = url.trim();
  if (!u) return u;
  return /^https?:\/\//i.test(u) ? u : `https://${u.replace(/^\/+/, "")}`;
}
