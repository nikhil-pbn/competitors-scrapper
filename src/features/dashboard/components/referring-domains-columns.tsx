import type { ColumnDef } from "@tanstack/react-table";

import type { ReferringDomain } from "@/lib/types";
import { formatDate } from "@/lib/format";

const METRICS: { key: keyof ReferringDomain; header: string; date?: boolean }[] =
  [
    { key: "domainRating", header: "DR" },
    { key: "dofollowRefdomains", header: "Dofollow ref. domains" },
    { key: "dofollowLinkedDomains", header: "Dofollow linked domains" },
    { key: "trafficDomain", header: "Traffic" },
    { key: "keywords", header: "Keywords" },
    { key: "linksToTarget", header: "Links to target" },
    { key: "dofollowLinks", header: "Dofollow links" },
    { key: "firstSeen", header: "First seen", date: true },
  ];

/** CSV header row + a row-mapper mirroring the on-screen columns. */
export const REFERRING_DOMAIN_CSV_HEADERS = [
  "Domain",
  ...METRICS.map((m) => m.header),
];

export function referringDomainCsvRow(d: ReferringDomain): string[] {
  return [d.domain, ...METRICS.map((m) => String(d[m.key] ?? ""))];
}

function DomainCell({ d }: { d: ReferringDomain }) {
  return (
    <div className="flex items-center gap-2">
      {d.newLinks && d.newLinks > 0 ? (
        <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-950/60 dark:text-green-300">
          New
        </span>
      ) : null}
      <a
        href={`https://${d.domain}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline"
      >
        {d.domain}
      </a>
    </div>
  );
}

/** Columns mirroring the Ahrefs "Referring domains" report. */
export function buildReferringDomainColumns(): ColumnDef<ReferringDomain>[] {
  const domainCol: ColumnDef<ReferringDomain> = {
    id: "domain",
    accessorKey: "domain",
    header: "Domain",
    cell: ({ row }) => <DomainCell d={row.original} />,
  };

  const rest: ColumnDef<ReferringDomain>[] = METRICS.map((c) => ({
    id: c.key,
    accessorKey: c.key,
    header: c.header,
    cell: ({ getValue }) => {
      const value = getValue();
      if (value === null || value === undefined || value === "")
        return <span className="text-muted-foreground">—</span>;
      return c.date ? formatDate(value) : String(value);
    },
  }));

  return [domainCol, ...rest];
}
