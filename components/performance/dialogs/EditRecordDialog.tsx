"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { db } from "@/lib/db";
import { syncPending } from "@/lib/sync";
import type { RecordVM } from "../RecordsPage";
import type { LocalRecord } from "@/lib/db";

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

export default function EditRecordDialog({
  open,
  onOpenChange,
  record,
  onSaved,
  bdLevelOptions,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  record: RecordVM | null;
  onSaved: () => void;
  bdLevelOptions: Array<{ id: string; label: string }>;
}) {
  const [bdLevelId, setBdLevelId] = useState("");
  const [pointsInput, setPointsInput] = useState("");
  const [moneyInput, setMoneyInput] = useState("");
  const [note, setNote] = useState("");
  const [packageAmountInput, setPackageAmountInput] = useState("");

  function resetFormFromRecord(target: RecordVM | null) {
    if (!target) {
      setBdLevelId("");
      setPointsInput("");
      setMoneyInput("");
      setPackageAmountInput("");
      setNote("");
      return;
    }

    setBdLevelId(target.bd_level_id ?? "");

    setPointsInput(
      target.points !== null && target.points !== undefined
        ? Number(target.points).toLocaleString("en-US")
        : ""
    );

    setMoneyInput(
      target.money !== null && target.money !== undefined
        ? Number(target.money).toLocaleString("en-US")
        : ""
    );

    setPackageAmountInput(
      target.package_amount !== null && target.package_amount !== undefined
        ? Number(target.package_amount).toLocaleString("en-US")
        : ""
    );

    setNote(target.note ?? "");
  }

  useEffect(() => {
    if (open) {
      resetFormFromRecord(record);
    }
  }, [open, record]);

  const parsedPoints = parseNumberInput(pointsInput) ?? 0;
  const parsedMoney = parseNumberInput(moneyInput);
  const parsedPackageAmount = parseNumberInput(packageAmountInput);

  const originalBdLevelId = record?.bd_level_id ?? "";
  const originalPoints = record?.points ?? 0;
  const originalMoney = record?.money ?? null;
  const originalPackageAmount = record?.package_amount ?? null;
  const originalNote = record?.note ?? "";

  const hasChanges =
    !!record &&
    (
      bdLevelId !== originalBdLevelId ||
      parsedPoints !== originalPoints ||
      parsedMoney !== originalMoney ||
      parsedPackageAmount !== originalPackageAmount ||
      note !== originalNote
    );

  const isSaveDisabled =
    !record || !bdLevelId || parsedPoints <= 0 || !hasChanges;

  async function handleSave() {
    if (!record || isSaveDisabled) return;

    const existing = await db.records.get(record.id);

    const baseRecord: LocalRecord = existing
      ? existing
      : {
        id: record.id,
        event_date: record.event_date,
        bd_id: record.bd_id,
        bd_level_id: record.bd_level_id,
        customer_name: record.customer_name,
        customer_type_id: record.customer_type_id,
        point_type_id: record.point_type_id,
        points: record.points,
        money: record.money,
        package_amount: record.package_amount,
        note: record.note,
        created_at: record.created_at,
        updated_at: record.updated_at,
        sync_status: "pending",
        updated_at_local: Date.now(),
      };

    const updatedRecord: LocalRecord = {
      ...baseRecord,
      bd_level_id: bdLevelId,
      points: parsedPoints,
      money: parsedMoney,
      package_amount: parsedPackageAmount,
      note: note || null,
      sync_status: "pending",
      updated_at_local: Date.now(),
      last_error: undefined,
    };

    await db.records.put(updatedRecord);

    if (navigator.onLine) {
      await syncPending();
    }

    onOpenChange(false);
    onSaved();
    window.dispatchEvent(new Event("records-updated"));
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetFormFromRecord(record);
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-md"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Edit Record
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-sm font-medium text-foreground">
              BD Level
            </p>
            <Select value={bdLevelId} onValueChange={setBdLevelId}>
              <SelectTrigger>
                <SelectValue placeholder="Select BD level" />
              </SelectTrigger>
              <SelectContent>
                {bdLevelOptions.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-foreground">
              Package Amount
            </p>
            <Input
              inputMode="numeric"
              value={packageAmountInput}
              onChange={(e) =>
                setPackageAmountInput(formatNumberInput(e.target.value))
              }
              placeholder="Enter package amount"
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-foreground">
              Points
            </p>
            <Input
              inputMode="numeric"
              value={pointsInput}
              onChange={(e) =>
                setPointsInput(formatNumberInput(e.target.value))
              }
              placeholder="Enter points"
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-foreground">
              Bonus
            </p>
            <Input
              inputMode="numeric"
              value={moneyInput}
              onChange={(e) =>
                setMoneyInput(formatNumberInput(e.target.value))
              }
              placeholder="Enter bonus"
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-foreground">
              Note
            </p>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter note"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            className="cursor-pointer"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>

          <Button
            className="cursor-pointer"
            onClick={handleSave}
            disabled={isSaveDisabled}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}