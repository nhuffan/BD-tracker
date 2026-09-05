import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

export function TransferFormSection({
  step,
  title,
  description,
  trailing,
  children,
}: {
  step: number;
  title: string;
  description: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-xs sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {step}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-base font-semibold leading-5 text-foreground">
                {title}
              </h3>
              <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
                {description}
              </p>
            </div>
            {trailing}
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

export function TransferFormField({
  id,
  label,
  required = false,
  optional = false,
  children,
}: {
  id?: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
        {optional && (
          <span className="text-[11px] font-medium text-muted-foreground">
            Optional
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
