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

function monthToRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
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
              <Select
                value={draft.customer_type_id ?? ALL}
                onValueChange={(v) =>
                  setDraft((d) => ({
                    ...d,
                    customer_type_id: v === ALL ? undefined : v,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select customer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All</SelectItem>
                  {customerTypes.map((x) => (
                    <SelectItem key={x.id} value={x.id}>
                      {x.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full">
              <p className="mb-1.5 text-sm font-medium text-foreground">Point Type</p>
              <Select
                value={draft.point_type_id ?? ALL}
                onValueChange={(v) =>
                  setDraft((d) => ({
                    ...d,
                    point_type_id: v === ALL ? undefined : v,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select point type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All</SelectItem>
                  {pointTypes.map((x) => (
                    <SelectItem key={x.id} value={x.id}>
                      {x.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              onApply({});
              onOpenChange(false);
            }}
          >
            Clear
          </Button>

          <Button
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