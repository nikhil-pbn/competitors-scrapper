/** Shared display formatters. Pure and framework-agnostic. */

/** "11 Nov 2023" from an ISO-ish date string; passes through if unparseable. */
export function formatDate(value: unknown): string {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Strip the protocol for compact display of a URL/domain. */
export function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//, "");
}
