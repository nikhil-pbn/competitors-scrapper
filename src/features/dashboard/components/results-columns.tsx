import type { ColumnDef } from "@tanstack/react-table";

import type { BusinessRecord } from "@/lib/types";
import { stripProtocol } from "@/lib/format";

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

export const RESULT_CSV_HEADERS = RESULT_COLUMNS.map((c) => c.header);

export function resultCsvRow(r: BusinessRecord): string[] {
  return RESULT_COLUMNS.map((c) => String(r[c.key] ?? ""));
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
 * Contact-table columns: a select checkbox, the data columns, and an optional
 * "Move to no-data" action (only shown for unchecked rows, so it's a deliberate
 * two-step: uncheck to skip from save, then optionally push it to no-data).
 */
export function buildResultColumns(
  onExclude?: (record: BusinessRecord) => void,
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

  const dataCols: ColumnDef<BusinessRecord>[] = RESULT_COLUMNS.map((c) => ({
    id: c.key,
    accessorKey: c.key,
    header: c.header,
    cell: ({ getValue }) => {
      const value = String(getValue() ?? "");
      if (!value) return <span className="text-muted-foreground">—</span>;
      if (c.key === "source_url") return <SourceLink value={value} />;
      return value;
    },
  }));

  if (!onExclude) return [selectCol, ...dataCols];

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

  return [selectCol, ...dataCols, actionCol];
}
