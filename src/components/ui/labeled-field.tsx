import type { ReactNode } from "react";

import {
  Field as FieldRoot,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";

/**
 * Thin label + hint wrapper over shadcn's Field primitives, preserving the
 * simple `{ label, children, hint }` API the forms use.
 */
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <FieldRoot>
      <FieldLabel>{label}</FieldLabel>
      {children}
      {hint ? <FieldDescription>{hint}</FieldDescription> : null}
    </FieldRoot>
  );
}
