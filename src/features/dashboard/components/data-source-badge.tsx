import type { DataSource } from "@/features/dashboard/pipeline";

const BADGES: Partial<Record<DataSource, { label: string; className: string }>> =
  {
    sample: {
      label: "SAMPLE DATA",
      className:
        "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    },
    upload: {
      label: "UPLOADED",
      className:
        "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
    },
    urls: {
      label: "URLS ONLY",
      className:
        "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
    },
  };

/** Small pill flagging where the referring-domain list came from. */
export function DataSourceBadge({ source }: { source: DataSource }) {
  const badge = BADGES[source];
  if (!badge) return null;
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}
