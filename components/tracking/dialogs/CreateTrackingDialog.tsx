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
import { useMasters } from "@/lib/useMasters";
import { supabase } from "@/lib/supabaseClient";

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

export default function CreateTrackingDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { items: bdList } = useMasters("bd");

  const [form, setForm] = useState({
    event_date: today,
    customer_name: "",
    branch: null as number | null,
    in_hot_list: null as number | null,
    bd_id: "",
    combo_voucher: false,
    note: null as string | null,
    info: null as string | null,
  });

  const [branchInput, setBranchInput] = useState("");
  const [hotListInput, setHotListInput] = useState("");

  const isSaveDisabled =
    !form.event_date || !form.customer_name.trim() || !form.bd_id;

  async function submit() {
    if (isSaveDisabled) return;

    const { error } = await supabase.from("customer_tracking").insert({
      event_date: form.event_date,
      customer_name: form.customer_name.trim(),
      branch: form.branch,
      in_hot_list: form.in_hot_list,
      bd_id: form.bd_id,
      combo_voucher: form.combo_voucher,
      note: form.note,
      info: form.info,
    });

    if (error) {
      console.error("Failed to create tracking record:", error);
      return;
    }

    onOpenChange(false);
    onCreated();

    setForm({
      event_date: today,
      customer_name: "",
      branch: null,
      in_hot_list: null,
      bd_id: "",
      combo_voucher: false,
      note: null,
      info: null,
    });
    setBranchInput("");
    setHotListInput("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Create Customer
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

          <div className="col-span-2">
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

          <div>
            <p className="mb-1.5 text-sm font-medium text-foreground">Branch</p>
            <Input
              inputMode="numeric"
              value={branchInput}
              onChange={(e) => {
                const formatted = formatNumberInput(e.target.value);
                const parsed = parseNumberInput(e.target.value);

                setBranchInput(formatted);
                setForm((f) => ({
                  ...f,
                  branch: parsed,
                }));
              }}
              placeholder="Enter branch number"
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-foreground">
              In Hot List
            </p>
            <Input
              inputMode="numeric"
              value={hotListInput}
              onChange={(e) => {
                const formatted = formatNumberInput(e.target.value);
                const parsed = parseNumberInput(e.target.value);

                setHotListInput(formatted);
                setForm((f) => ({
                  ...f,
                  in_hot_list: parsed,
                }));
              }}
              placeholder="Enter hot list number"
            />
          </div>

          <div className="col-span-2">
            <p className="mb-1.5 text-sm font-medium text-foreground">
              Combo/Voucher
            </p>
            <Select
              value={String(form.combo_voucher)}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  combo_voucher: v === "true",
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select combo/voucher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">—</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <p className="mb-1.5 text-sm font-medium text-foreground">Note</p>
            <Textarea
              value={form.note ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, note: e.target.value || null }))
              }
              placeholder="Enter note"
            />
          </div>

          <div className="col-span-2">
            <p className="mb-1.5 text-sm font-medium text-foreground">Info</p>
            <Textarea
              value={form.info ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, info: e.target.value || null }))
              }
              placeholder="Enter info"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            className="cursor-pointer"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="cursor-pointer"
            onClick={submit}
            disabled={isSaveDisabled}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}