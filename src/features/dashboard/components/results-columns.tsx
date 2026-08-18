import type { ColumnDef } from "@tanstack/react-table";

import type { BusinessRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import { stripProtocol } from "@/lib/format";
import { isJunkEmail, isJunkPhone } from "@/lib/contact-quality";
import { approvalKey } from "@/features/dashboard/keys";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui";

type ContactField = "phone" | "email";

/** How a phone/email save-override toggle is wired in. */
export interface ApprovalControls {
  approved: Set<string>;
  onToggle: (record: BusinessRecord, field: ContactField) => void;
}

export const RESULT_COLUMNS: { key: keyof BusinessRecord; header: string }[] = [
  { key: "practice_name", header: "Practice" },
  { key: "doctor_name", header: "Doctor" },
  { key: "office_manager_name", header: "Office Manager" },
  { key: "phone", header: "Phone" },
  { key: "email", header: "Email" },
  { key: "location", header: "Location" },
  { key: "State", header: "State" },
  { key: "source_url", header: "Source URL" },
];

export const RESULT_CSV_HEADERS = [
  "Competitor",
  ...RESULT_COLUMNS.map((c) => c.header),
];

export function resultCsvRow(r: BusinessRecord): string[] {
  return [r.competitor ?? "", ...RESULT_COLUMNS.map((c) => String(r[c.key] ?? ""))];
}

function Checkbox(props: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      type="checkbox"
      checked={props.checked}
      ref={(el) => {
        if (el) el.indeterminate = props.indeterminate ?? false;
      }}
      onChange={props.onChange}
    />
  );
}

function SourceLink({ value }: { value: string }) {
  return (
    <a
      href={value}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline"
    >
      {stripProtocol(value)}
    </a>
  );
}

/**
 * A phone/email cell. When the value looks fake it's shown in red (struck
 * through) and, by default, stripped at save time. Hovering opens a tooltip
 * with an "Add to sheet" button to override that for this row (turns it green
 * and keeps it on save); a "Remove" button undoes the override.
 */
function ContactCell({
  value,
  field,
  record,
  controls,
}: {
  value: string;
  field: ContactField;
  record: BusinessRecord;
  controls?: ApprovalControls;
}) {
  const junk = field === "phone" ? isJunkPhone(value) : isJunkEmail(value);
  if (!junk) return <>{value}</>;

  const approved = controls?.approved.has(approvalKey(record.source_url, field)) ?? false;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "cursor-default font-medium",
            approved
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 line-through decoration-red-600/40 dark:text-red-400",
          )}
        >
          {value}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex items-center gap-2">
          <span>{approved ? "Will be saved" : "Looks fake — won't be saved"}</span>
          {controls ? (
            <button
              type="button"
              onClick={() => controls.onToggle(record, field)}
              className="rounded bg-background px-2 py-0.5 text-[11px] font-medium text-foreground hover:opacity-80"
            >
              {approved ? "Remove" : "Add to sheet"}
            </button>
          ) : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Contact-table columns: a select checkbox, the data columns, and an optional
 * "Move to no-data" action (only shown for unchecked rows, so it's a deliberate
 * two-step: uncheck to skip from save, then optionally push it to no-data).
 */
export function buildResultColumns(
  onExclude?: (record: BusinessRecord) => void,
  approvals?: ApprovalControls,
): ColumnDef<BusinessRecord>[] {
  const selectCol: ColumnDef<BusinessRecord> = {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllRowsSelected()}
        indeterminate={table.getIsSomeRowsSelected()}
        onChange={table.getToggleAllRowsSelectedHandler()}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
      />
    ),
    enableSorting: false,
  };

  const competitorCol: ColumnDef<BusinessRecord> = {
    id: "competitor",
    accessorFn: (r) => r.competitor ?? "",
    header: "Competitor",
    cell: ({ row }) => {
      const c = row.original.competitor;
      return c ? (
        <span className="font-medium whitespace-nowrap">{c}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  };

  const dataCols: ColumnDef<BusinessRecord>[] = RESULT_COLUMNS.map((c) => ({
    id: c.key,
    accessorKey: c.key,
    header: c.header,
    cell: ({ row, getValue }) => {
      const value = String(getValue() ?? "");
      if (!value) return <span className="text-muted-foreground">—</span>;
      if (c.key === "source_url") return <SourceLink value={value} />;
      if (c.key === "phone" || c.key === "email") {
        return (
          <ContactCell
            value={value}
            field={c.key}
            record={row.original}
            controls={approvals}
          />
        );
      }
      return value;
    },
  }));

  if (!onExclude) return [selectCol, competitorCol, ...dataCols];

  const actionCol: ColumnDef<BusinessRecord> = {
    id: "actions",
    header: "",
    enableSorting: false,
    cell: ({ row }) =>
      row.getIsSelected() ? null : (
        <button
          type="button"
          onClick={() => onExclude(row.original)}
          title="Remove from the list and add to the no-data URLs"
          className="whitespace-nowrap rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-amber-400 hover:text-amber-600"
        >
          Move to no-data
        </button>
      ),
  };

  return [selectCol, competitorCol, ...dataCols, actionCol];
}
