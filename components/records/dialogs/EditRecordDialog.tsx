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
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  record: RecordVM | null;
  onSaved: () => void;
}) {
  const [pointsInput, setPointsInput] = useState("");
  const [moneyInput, setMoneyInput] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!record) return;

    setPointsInput(
      record.points !== null && record.points !== undefined
        ? Number(record.points).toLocaleString("en-US")
        : ""
    );

    setMoneyInput(
      record.money !== null && record.money !== undefined
        ? Number(record.money).toLocaleString("en-US")
        : ""
    );

    setNote(record.note ?? "");
  }, [record]);

  const parsedPoints = parseNumberInput(pointsInput) ?? 0;
  const parsedMoney = parseNumberInput(moneyInput);

  const isSaveDisabled =
    !record || parsedPoints <= 0 || parsedMoney == null || parsedMoney <= 0;

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
          note: record.note,
          created_at: record.created_at,
          updated_at: record.updated_at,
          sync_status: "pending",
          updated_at_local: Date.now(),
        };

    const updatedRecord: LocalRecord = {
      ...baseRecord,
      points: parsedPoints,
      money: parsedMoney,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Edit Record
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
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
              Money
            </p>
            <Input
              inputMode="numeric"
              value={moneyInput}
              onChange={(e) =>
                setMoneyInput(formatNumberInput(e.target.value))
              }
              placeholder="Enter money"
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
            onClick={() => onOpenChange(false)}
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