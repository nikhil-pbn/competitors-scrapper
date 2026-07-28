"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Select-style multi-select: a trigger showing a summary ("All" / "N selected")
 * that opens a checkbox list, with All / None shortcuts. Values are plain strings.
 */
export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select…",
  disabled,
  className,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const toggle = (value: string) =>
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );

  // Always list the selected values (comma-joined) so every choice stays
  // visible — never collapse to "N selected". "All" is a shorthand only when
  // literally everything is picked.
  const allSelected =
    options.length > 0 && selected.length === options.length;
  const summary =
    selected.length === 0
      ? placeholder
      : allSelected
        ? "All"
        : selected.join(", ");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          title={selected.length > 0 ? selected.join(", ") : undefined}
          className={cn(
            "flex min-h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <span
            className={cn(
              "text-left wrap-break-word",
              selected.length === 0 && "text-muted-foreground",
            )}
          >
            {summary}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        <div className="flex items-center justify-between px-2 py-1 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => onChange(options)}
            className="hover:text-foreground"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => onChange([])}
            className="hover:text-foreground"
          >
            Clear
          </button>
        </div>
        <div className="max-h-64 overflow-auto">
          {options.map((option) => {
            const active = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggle(option)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input",
                  )}
                >
                  {active ? <Check className="size-3" /> : null}
                </span>
                <span className="truncate">{option}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
