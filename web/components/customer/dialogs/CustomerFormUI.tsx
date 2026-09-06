"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, Megaphone, Minus, TicketCheck } from "lucide-react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function CustomerFormSection({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description: string;
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
          <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function CustomerFormField({
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

function OfferFlagPicker({
  value,
  onChange,
  ariaLabel,
  yesDescription,
  noDescription,
  yesIcon: YesIcon,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  ariaLabel: string;
  yesDescription: string;
  noDescription: string;
  yesIcon: LucideIcon;
}) {
  const options = [
    {
      value: true,
      label: "Yes",
      description: yesDescription,
      icon: YesIcon,
    },
    {
      value: false,
      label: "No",
      description: noDescription,
      icon: Minus,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => {
        const selected = value === option.value;
        const Icon = option.icon;

        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative cursor-pointer rounded-lg border px-3 py-3 text-left shadow-xs transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              selected
                ? option.value
                  ? "border-emerald-600 bg-emerald-500/10 text-foreground ring-1 ring-emerald-500/10"
                  : "border-primary bg-primary/10 text-foreground ring-1 ring-primary/10"
                : "border-border bg-card text-foreground hover:-translate-y-px hover:border-primary/40 hover:bg-accent/70 hover:shadow-sm"
            )}
          >
            <span className="flex items-start gap-2.5 pr-5">
              <Icon
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  selected && option.value && "text-emerald-600 dark:text-emerald-400"
                )}
              />
              <span>
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground lg:whitespace-nowrap">
                  {option.description}
                </span>
              </span>
            </span>
            {selected && (
              <span
                className={cn(
                  "absolute right-2.5 top-2.5 flex size-4 items-center justify-center rounded-full text-white",
                  option.value ? "bg-emerald-600" : "bg-primary"
                )}
              >
                <Check className="size-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function VoucherPicker({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <OfferFlagPicker
      value={value}
      onChange={onChange}
      ariaLabel="Combo or voucher"
      yesDescription="Uses combo or voucher"
      noDescription="No combo or voucher"
      yesIcon={TicketCheck}
    />
  );
}

export function AdvertisingPicker({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <OfferFlagPicker
      value={value}
      onChange={onChange}
      ariaLabel="Advertising"
      yesDescription="Includes advertising"
      noDescription="No advertising"
      yesIcon={Megaphone}
    />
  );
}
