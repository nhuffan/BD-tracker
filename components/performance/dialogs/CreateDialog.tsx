"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerDMY } from "@/components/ui/date-picker-dmy";
import { useMasters, useMastersActive } from "@/lib/useMasters";

import { db } from "@/lib/db";
import { syncPending } from "@/lib/sync";
import { toast } from "sonner";
import type { RecordRow } from "@/lib/types";
import { Loader2 } from "lucide-react";

function formatNumberInput(value: string) {
  if (!value) return "";
  const digitsOnly = value.replace(/[^\d]/g, "");
  if (!digitsOnly) return "";
  return Number(digitsOnly).toLocaleString("en-US");
}

function parseNumberInput(value: string): number | null {
  const digitsOnly = value.replace(/[^\d]/g, "");
  if (!digitsOnly) return null;
  return Number(digitsOnly);
}

export default function CreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => Promise<void> | void;
}) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const bdList = useMastersActive("bd");
  const { items: levelList } = useMasters("bd_level");
  const { items: customerTypes } = useMasters("customer_type");
  const { items: pointTypes } = useMasters("point_type");

  const [form, setForm] = useState<RecordRow>({
    id: "",
    event_date: today,
    bd_id: "",
    bd_level_id: "",
    customer_name: "",
    customer_type_id: "",
    point_type_id: "",
    category: "entertainment",
    points: 0,
    money: null,
    package_amount: null,
    note: null,
  });

  const [pointsInput, setPointsInput] = useState("");
  const [moneyInput, setMoneyInput] = useState("");
  const [packageAmountInput, setPackageAmountInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isSaveDisabled =
    !form.event_date ||
    !form.bd_id ||
    !form.bd_level_id ||
    !form.customer_name.trim() ||
    !form.customer_type_id ||
    !form.point_type_id ||
    !form.category;

  async function submit() {
    if (isSaveDisabled || isLoading) return;

    setIsLoading(true);

    try {
      const id = crypto.randomUUID();
      const row: RecordRow = { ...form, id };

      await db.records.put({
        ...row,
        sync_status: "pending",
        updated_at_local: Date.now(),
      });

      if (navigator.onLine) {
        await syncPending();
      }

      setForm({
        id: "",
        event_date: today,
        bd_id: "",
        bd_level_id: "",
        customer_name: "",
        customer_type_id: "",
        point_type_id: "",
        category: "entertainment",
        points: 0,
        money: null,
        package_amount: null,
        note: null,
      });
      setPointsInput("");
      setMoneyInput("");
      setPackageAmountInput("");

      onOpenChange(false);
      await onCreated();

      window.dispatchEvent(new Event("records-updated"));
      toast.success("Record created successfully.");
    } catch (e) {
      toast.error("Failed to create record.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isLoading) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Create Record
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <p className="mb-1.5 text-sm font-medium text-foreground">Date</p>
            <DatePickerDMY
              value={form.event_date}
              onChange={(iso) =>
                setForm((f) => ({ ...f, event_date: iso ?? f.event_date }))
              }
              placeholder="Select date"
            />
          </div>

          <div className="w-full">
            <p className="mb-1.5 text-sm font-medium text-foreground">BD Name</p>
            <Select
              value={form.bd_id || undefined}
              onValueChange={(v) => setForm((f) => ({ ...f, bd_id: v }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select BD name" />
              </SelectTrigger>
              <SelectContent>
                {bdList.map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    {x.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full">
            <p className="mb-1.5 text-sm font-medium text-foreground">BD Level</p>
            <Select
              value={form.bd_level_id || undefined}
              onValueChange={(v) => setForm((f) => ({ ...f, bd_level_id: v }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select BD level" />
              </SelectTrigger>
              <SelectContent>
                {levelList.map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    {x.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <p className="mb-1.5 text-sm font-medium text-foreground">
              Customer Name
            </p>
            <Input
              value={form.customer_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, customer_name: e.target.value }))
              }
              placeholder="Enter customer name"
            />
          </div>

          <div className="w-full">
            <p className="mb-1.5 text-sm font-medium text-foreground">Category</p>
            <Select
              value={form.category}
              onValueChange={(v: "entertainment" | "restaurant") =>
                setForm((f) => ({ ...f, category: v }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entertainment">Entertainment</SelectItem>
                <SelectItem value="restaurant">Restaurant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full">
            <p className="mb-1.5 text-sm font-medium text-foreground">
              Customer Type
            </p>
            <Select
              value={form.customer_type_id || undefined}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, customer_type_id: v }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select customer type" />
              </SelectTrigger>
              <SelectContent>
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
              value={form.point_type_id || undefined}
              onValueChange={(v) => setForm((f) => ({ ...f, point_type_id: v }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select point type" />
              </SelectTrigger>
              <SelectContent>
                {pointTypes.map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    {x.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full min-w-0">
            <p className="mb-1.5 text-sm font-medium text-foreground">
              Package Amount (optional)
            </p>
            <Input
              inputMode="numeric"
              value={packageAmountInput}
              onChange={(e) => {
                const formatted = formatNumberInput(e.target.value);
                const parsed = parseNumberInput(e.target.value);

                setPackageAmountInput(formatted);
                setForm((f) => ({
                  ...f,
                  package_amount: parsed,
                }));
              }}
              placeholder="Enter package amount"
            />
          </div>

          <div className="w-full min-w-0">
            <p className="mb-1.5 text-sm font-medium text-foreground">Points</p>
            <Input
              inputMode="numeric"
              value={pointsInput}
              onChange={(e) => {
                const formatted = formatNumberInput(e.target.value);
                const parsed = parseNumberInput(e.target.value);

                setPointsInput(formatted);
                setForm((f) => ({
                  ...f,
                  points: parsed ?? 0,
                }));
              }}
              placeholder="Enter points"
            />
          </div>

          <div className="w-full min-w-0">
            <p className="mb-1.5 text-sm font-medium text-foreground">Bonus (optional)</p>
            <Input
              inputMode="numeric"
              value={moneyInput}
              onChange={(e) => {
                const formatted = formatNumberInput(e.target.value);
                const parsed = parseNumberInput(e.target.value);

                setMoneyInput(formatted);
                setForm((f) => ({
                  ...f,
                  money: parsed,
                }));
              }}
              placeholder="Enter bonus"
            />
          </div>

          <div className="col-span-2">
            <p className="mb-1.5 text-sm font-medium text-foreground">Note (optional)</p>
            <Textarea
              value={form.note ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, note: e.target.value || null }))
              }
              placeholder="Enter note"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            className="cursor-pointer"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            className="cursor-pointer"
            onClick={submit}
            disabled={isSaveDisabled || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}