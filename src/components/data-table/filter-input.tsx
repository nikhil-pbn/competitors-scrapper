"use client";

import { Input } from "@/components/ui";

/** Search box shared by the data tables' global filter. */
export function FilterInput({
  value,
  onChange,
  placeholder = "Filter…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-56 max-w-full"
    />
  );
}
