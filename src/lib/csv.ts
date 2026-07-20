/**
 * Trigger a client-side CSV download from a header row + data rows. Values are
 * quoted and escaped so commas/quotes/newlines survive. Browser-only.
 */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: string[][],
): void {
  const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers, ...rows].map((r) => r.map(escape).join(","));
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
