import type { ColumnDef } from "@tanstack/react-table";

import type { DentalCheck, DentalStatus, ReferringDomain } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { DentalBadge } from "@/features/dashboard/components/dental-badge";

/** A table row: the Ahrefs domain plus its dental-check result (if run). */
export type DomainRow = ReferringDomain & { dental?: DentalCheck };

/** Sort order for the Dental column (unchecked rows sort last). */
const DENTAL_ORDER: Record<DentalStatus, number> = {
  Dental: 0,
  Unknown: 1,
  "Non-Dental": 2,
  Failed: 3,
};

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
  "Competitor",
  "Dental",
  "Dental reason",
  ...METRICS.map((m) => m.header),
];

export function referringDomainCsvRow(d: DomainRow): string[] {
  return [
    d.domain,
    d.competitor ?? "",
    d.dental?.status ?? "",
    d.dental?.reason ?? "",
    ...METRICS.map((m) => String(d[m.key] ?? "")),
  ];
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
export function buildReferringDomainColumns(): ColumnDef<DomainRow>[] {
  const domainCol: ColumnDef<DomainRow> = {
    id: "domain",
    accessorKey: "domain",
    header: "Domain",
    cell: ({ row }) => <DomainCell d={row.original} />,
  };

  const competitorCol: ColumnDef<DomainRow> = {
    id: "competitor",
    accessorFn: (d) => d.competitor ?? "",
    header: "Competitor",
    cell: ({ row }) => {
      const c = row.original.competitor;
      return c ? (
        <span className="font-medium">{c}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  };

  const dentalCol: ColumnDef<DomainRow> = {
    id: "dental",
    accessorFn: (d) => (d.dental ? DENTAL_ORDER[d.dental.status] : 9),
    header: "Dental",
    cell: ({ row }) => <DentalBadge check={row.original.dental} />,
  };

  const rest: ColumnDef<DomainRow>[] = METRICS.map((c) => ({
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

  return [domainCol, competitorCol, dentalCol, ...rest];
}
