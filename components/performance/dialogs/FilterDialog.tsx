"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Filters } from "../RecordsPage";
import { DatePickerDMY } from "@/components/ui/date-picker-dmy";
import { useMasters } from "@/lib/useMasters";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function monthToRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

function toggleMultiValue(
  current: string[] | undefined,
  value: string
): string[] {
  const arr = current ?? [];
  return arr.includes(value)
    ? arr.filter((x) => x !== value)
    : [...arr, value];
}

export default function FilterDialog({
  open,
  onOpenChange,
  filters,
  onApply,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  filters: Filters;
  onApply: (f: Filters) => void;
}) {
  const [draft, setDraft] = useState<Filters>(filters);
  const ALL = "__all__";

  const { items: bdList } = useMasters("bd");
  const { items: customerTypes } = useMasters("customer_type");
  const { items: pointTypes } = useMasters("point_type");

  useEffect(() => setDraft(filters), [filters]);

  const monthRange = useMemo(() => {
    if (!draft.month) return null;
    return monthToRange(draft.month);
  }, [draft.month]);

  useEffect(() => {
    if (!monthRange) return;
    setDraft((d) => ({ ...d, from: monthRange.from, to: monthRange.to }));
  }, [monthRange?.from, monthRange?.to]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Filter
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="w-full">
            <p className="mb-1.5 text-sm font-medium text-foreground">Month</p>
            <Input
              type="month"
              value={draft.month ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, month: e.target.value || undefined }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="w-full">
              <p className="mb-1.5 text-sm font-medium text-foreground">From Date</p>
              <DatePickerDMY
                value={draft.from}
                onChange={(iso) =>
                  setDraft((d) => ({ ...d, from: iso, month: undefined }))
                }
                placeholder="Select from date"
              />
            </div>

            <div className="w-full">
              <p className="mb-1.5 text-sm font-medium text-foreground">To Date</p>
              <DatePickerDMY
                value={draft.to}
                onChange={(iso) =>
                  setDraft((d) => ({ ...d, to: iso, month: undefined }))
                }
                placeholder="Select to date"
              />
            </div>
          </div>

          <div className="w-full">
            <p className="mb-1.5 text-sm font-medium text-foreground">BD Name</p>
            <Select
              value={draft.bd_id ?? ALL}
              onValueChange={(v) =>
                setDraft((d) => ({ ...d, bd_id: v === ALL ? undefined : v }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select BD" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                {bdList.map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    {x.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full">
            <p className="mb-1.5 text-sm font-medium text-foreground">Customer Name</p>
            <Input
              placeholder="Search customer name"
              value={draft.customer_name ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  customer_name: e.target.value || undefined,
                }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="w-full">
              <p className="mb-1.5 text-sm font-medium text-foreground">Customer Type</p>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate text-left">
                      {!draft.customer_type_ids?.length
                        ? "All"
                        : draft.customer_type_ids.length === 1
                        ? customerTypes.find((x) => x.id === draft.customer_type_ids?.[0])?.label
                        : `${draft.customer_type_ids.length} selected`}
                    </span>
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer">
                      <Checkbox
                        checked={!draft.customer_type_ids?.length}
                        onCheckedChange={() =>
                          setDraft((d) => ({
                            ...d,
                            customer_type_ids: undefined,
                          }))
                        }
                      />
                      <span className="text-sm">All</span>
                    </label>

                    {customerTypes.map((x) => {
                      const checked = !!draft.customer_type_ids?.includes(x.id);

                      return (
                        <label
                          key={x.id}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() =>
                              setDraft((d) => ({
                                ...d,
                                customer_type_ids: toggleMultiValue(d.customer_type_ids, x.id),
                              }))
                            }
                          />
                          <span className="text-sm">{x.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="w-full">
              <p className="mb-1.5 text-sm font-medium text-foreground">Point Type</p>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate text-left">
                      {!draft.point_type_ids?.length
                        ? "All"
                        : draft.point_type_ids.length === 1
                        ? pointTypes.find((x) => x.id === draft.point_type_ids?.[0])?.label
                        : `${draft.point_type_ids.length} selected`}
                    </span>
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer">
                      <Checkbox
                        checked={!draft.point_type_ids?.length}
                        onCheckedChange={() =>
                          setDraft((d) => ({
                            ...d,
                            point_type_ids: undefined,
                          }))
                        }
                      />
                      <span className="text-sm">All</span>
                    </label>

                    {pointTypes.map((x) => {
                      const checked = !!draft.point_type_ids?.includes(x.id);

                      return (
                        <label
                          key={x.id}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() =>
                              setDraft((d) => ({
                                ...d,
                                point_type_ids: toggleMultiValue(d.point_type_ids, x.id),
                              }))
                            }
                          />
                          <span className="text-sm">{x.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            className="cursor-pointer"
            variant="secondary"
            onClick={() => {
              onApply({});
              onOpenChange(false);
            }}
          >
            Clear
          </Button>

          <Button
            className="cursor-pointer"
            onClick={() => {
              onApply(draft);
              onOpenChange(false);
            }}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}