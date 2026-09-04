import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { QAPriority } from "../utils/types";

export function QAFormSection({
  step,
  title,
  description,
  optional = false,
  children,
}: {
  step: number;
  title: string;
  description: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-xs sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {step}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-5 text-foreground">
            {title}
          </h3>
          <div className="mt-0.5 flex items-center justify-between gap-3">
            <p className="text-xs leading-4 text-muted-foreground">
              {description}
            </p>
            {optional && (
              <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                Optional
              </span>
            )}
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

export function QAFormField({
  id,
  label,
  optional = false,
  children,
}: {
  id?: string;
  label: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
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

const priorityStyles: Record<QAPriority, string> = {
  low: "bg-slate-400",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

export function QAPriorityOption({ priority }: { priority: QAPriority }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn("size-2.5 shrink-0 rounded-full", priorityStyles[priority])}
        aria-hidden="true"
      />
      <span>{priority.charAt(0).toUpperCase() + priority.slice(1)}</span>
    </span>
  );
}
