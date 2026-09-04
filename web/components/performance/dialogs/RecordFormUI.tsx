"use client";

import type { ComponentType, ReactNode } from "react";
import { Check, Sparkles, Store } from "lucide-react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Category = "entertainment" | "restaurant";

export function RecordFormSection({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-xs sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {step}
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-5 text-foreground">
            {title}
          </h3>
          {description && (
            <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

export function FormField({
  id,
  label,
  optional = false,
  hint,
  className,
  children,
}: {
  id?: string;
  label: string;
  optional?: boolean;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {optional && (
          <span className="text-[11px] font-medium text-muted-foreground">
            Optional
          </span>
        )}
      </div>
      {children}
      {hint && <p className="text-xs leading-5 text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function CategoryPicker({
  value,
  onChange,
}: {
  value: Category;
  onChange: (value: Category) => void;
}) {
  const options: Array<{
    value: Category;
    label: string;
    description: string;
    icon: ComponentType<{ className?: string }>;
  }> = [
    {
      value: "entertainment",
      label: "Entertainment",
      description: "Leisure & activities",
      icon: Sparkles,
    },
    {
      value: "restaurant",
      label: "Restaurant",
      description: "Dining & F&B",
      icon: Store,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Category">
      {options.map((option) => {
        const selected = value === option.value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative cursor-pointer rounded-lg border px-3 py-3 text-left shadow-xs transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              selected
                ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/10"
                : "border-border bg-card text-foreground hover:-translate-y-px hover:border-primary/40 hover:bg-accent/70 hover:shadow-sm"
            )}
          >
            <span className="flex items-start gap-2.5 pr-5">
              <Icon className="mt-0.5 size-4 shrink-0" />
              <span>
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </span>
            {selected && (
              <span className="absolute right-2.5 top-2.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function OptionalDetails({ children }: { children: ReactNode }) {
  return (
    <RecordFormSection
      step={4}
      title="Optional details"
      description="Add branch, package amount, bonus or a note when needed."
    >
      {children}
    </RecordFormSection>
  );
}
