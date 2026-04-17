"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { DatePickerDMY } from "@/components/ui/date-picker-dmy";
import { getAdsTrackingStatus } from "@/lib/adsTracking";

const infoFieldClass =
    "flex h-10 w-full min-w-0 items-center rounded-lg border border-input bg-muted/60 px-3 text-sm text-foreground";

const labelClass =
    "mb-2 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground";

export default function EditAdRecordDialog({
    open,
    onOpenChange,
    record,
    onSaved,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: {
        id: string;
        customer_name: string;
        point_type_id: string;
        point_type_label: string;
        start_date: string | null;
        end_date: string | null;
        note: string | null;
    } | null;
    onSaved: () => void | Promise<void>;
}) {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open || !record) {
            setStartDate("");
            setEndDate("");
            setNote("");
            setSaving(false);
            return;
        }

        setStartDate(record.start_date ?? "");
        setEndDate(record.end_date ?? "");
        setNote(record.note ?? "");
    }, [open, record]);

    if (!record) return null;

    const currentRecord = record;

    // 🔹 STATUS BADGE (no hook)
    function renderStatusBadge() {
        if (!currentRecord?.end_date) {
            return (
                <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    Not Started
                </span>
            );
        }

        const status = getAdsTrackingStatus(currentRecord.start_date, currentRecord.end_date);

        if (status === "not_started") {
            return (
                <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    Not Started
                </span>
            );
        }

        if (status === "active") {
            return (
                <span className="inline-flex rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    Active
                </span>
            );
        }

        if (status === "expiring_soon") {
            return (
                <span className="inline-flex rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    Expiring Soon
                </span>
            );
        }

        return (
            <span className="inline-flex rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                Expired
            </span>
        );
    }

    const normalizedInitialNote = (currentRecord.note ?? "").trim();
    const normalizedCurrentNote = note.trim();

    const hasChanges =
        startDate !== (currentRecord.start_date ?? "") ||
        endDate !== (currentRecord.end_date ?? "") ||
        normalizedCurrentNote !== normalizedInitialNote;

    const isDisabled = saving || !hasChanges;

    async function handleSave() {
        if (isDisabled) return;

        setSaving(true);

        const { error } = await supabase
            .from("ad_tracking_records")
            .update({
                start_date: startDate || null,
                end_date: endDate || null,
                note: normalizedCurrentNote || null,
                updated_at: new Date().toISOString(),
            })
            .eq("id", currentRecord.id);

        setSaving(false);

        if (error) {
            toast.error("Failed to update record.");
            return;
        }

        toast.success("Record updated successfully.");
        onOpenChange(false);
        await onSaved();
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-2xl rounded-xl p-0"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <DialogHeader className="border-b px-6 py-4">
                    <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
                        Edit Ad Record
                    </DialogTitle>

                    <div className="mt-1 flex items-center justify-between gap-3">
                        <DialogDescription className="m-0 text-sm text-muted-foreground">
                            Update ad record for {currentRecord.customer_name}.
                        </DialogDescription>

                        <div className="shrink-0">{renderStatusBadge()}</div>
                    </div>
                </DialogHeader>

                <div className="space-y-5 px-6 ">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className={labelClass}>Customer</label>
                            <div className={infoFieldClass}>
                                {currentRecord.customer_name}
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Point Type</label>
                            <div className={infoFieldClass}>
                                {currentRecord.point_type_label}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className={labelClass}>Start Date</label>
                            <DatePickerDMY
                                value={startDate || undefined}
                                onChange={(iso) => setStartDate(iso ?? "")}
                                placeholder="Select start date"
                                className="!h-10 h-10"
                            />
                        </div>

                        <div>
                            <label className={labelClass}>End Date</label>
                            <DatePickerDMY
                                value={endDate || undefined}
                                onChange={(iso) => setEndDate(iso ?? "")}
                                placeholder="Select end date"
                                className="!h-10 h-10"
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Note (optional)</label>
                        <Textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Add any notes for this ad record..."
                            rows={3}
                            className="min-h-[80px] max-h-[80px] resize-none overflow-y-auto whitespace-pre-wrap break-all"
                        />
                    </div>
                </div>

                <DialogFooter className="border-t px-6 py-4">
                    <div className="flex w-full justify-end gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            className="cursor-pointer"
                            onClick={() => onOpenChange(false)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="button"
                            className="cursor-pointer"
                            onClick={handleSave}
                            disabled={isDisabled}
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}