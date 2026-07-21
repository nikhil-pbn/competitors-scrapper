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

/** Format an ISO timestamp as a readable IST date-time (e.g. "21 Jul 2026, 1:24 pm IST"). */
export function formatIst(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const formatted = d.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
  return `${formatted} IST`;
}
