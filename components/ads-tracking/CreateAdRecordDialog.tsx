"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ADS_TRACKING_POINT_TYPE_CODES,
    calculateAdsEndDate,
} from "@/lib/adsTracking";
import { formatDMY } from "@/lib/date";

const fieldClass =
    "!h-11 h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm shadow-none";

const infoFieldClass =
    "flex h-10 w-full min-w-0 items-center rounded-lg border border-input bg-muted/60 px-3 text-sm text-foreground";

const labelClass =
    "mb-2 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground";

type EligibleRecord = {
    id: string;
    customer_name: string;
    point_type_id: string;
    event_date: string | null;
};

type PointTypeMaster = {
    id: string;
    code: string;
    label: string;
};

export default function CreateAdRecordDialog({
    open,
    onOpenChange,
    onSaved,
    currentUserId,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void | Promise<void>;
    currentUserId: string;
}) {
    const [eligibleRecords, setEligibleRecords] = useState<EligibleRecord[]>([]);
    const [pointTypes, setPointTypes] = useState<PointTypeMaster[]>([]);
    const [selectedRecordId, setSelectedRecordId] = useState("");
    const [startDate, setStartDate] = useState("");
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;

        async function loadData() {
            const { data: masterRows, error: masterError } = await supabase
                .from("masters")
                .select("id, code, label")
                .eq("category", "point_type")
                .eq("is_active", true);

            if (masterError || !masterRows?.length) {
                setPointTypes([]);
                setEligibleRecords([]);
                return;
            }

            const filteredPointTypes = masterRows.filter((item) =>
                ADS_TRACKING_POINT_TYPE_CODES.includes(item.code)
            ) as PointTypeMaster[];

            setPointTypes(filteredPointTypes);

            const pointTypeIds = filteredPointTypes.map((x) => x.id);

            const { data: recordRows, error: recordError } = await supabase
                .from("records")
                .select("id, customer_name, point_type_id, event_date")
                .in("point_type_id", pointTypeIds)
                .order("event_date", { ascending: false });

            if (recordError) {
                setEligibleRecords([]);
                return;
            }

            const deduped = Array.from(
                new Map(
                    ((recordRows ?? []) as EligibleRecord[])
                        .slice()
                        .reverse()
                        .map((item) => [item.customer_name, item])
                ).values()
            );

            setEligibleRecords(deduped);
        }

        loadData();
    }, [open]);

    useEffect(() => {
        if (!open) {
            setSelectedRecordId("");
            setStartDate("");
            setNote("");
            setSaving(false);
        }
    }, [open]);

    const selectedRecord = useMemo(() => {
        return eligibleRecords.find((item) => item.id === selectedRecordId) ?? null;
    }, [eligibleRecords, selectedRecordId]);

    const selectedPointType = useMemo(() => {
        if (!selectedRecord) return null;
        return pointTypes.find((item) => item.id === selectedRecord.point_type_id) ?? null;
    }, [pointTypes, selectedRecord]);

    const endDate = useMemo(() => {
        if (!startDate || !selectedPointType?.code) return "";
        return calculateAdsEndDate(startDate, selectedPointType.code);
    }, [startDate, selectedPointType]);

    const durationText = useMemo(() => {
        if (!startDate || !selectedPointType?.code) return "—";
        // database bị ngược
        if (selectedPointType.code === "LEN_QC_COMBO_1_NAM") return "90 Days";
        if (selectedPointType.code === "LEN_QC_COMBO_3_THANG") return "1 Year";
        return "—";
    }, [startDate, selectedPointType]);

    const isDisabled = saving || !selectedRecord;

    async function handleSave() {
        if (isDisabled || !selectedRecord) return;

        setSaving(true);

        const { error } = await supabase.from("ad_tracking_records").insert({
            source_record_id: selectedRecord.id,
            customer_name: selectedRecord.customer_name,
            point_type_id: selectedRecord.point_type_id,
            start_date: startDate || null,
            end_date: endDate || null,
            note: note.trim() || null,
            created_by_user_id: currentUserId || null,
            updated_at: new Date().toISOString(),
        });

        setSaving(false);

        if (error) {
            console.error("create ad record error:", error);
            toast.error(error.message || "Failed to create ad record.");
            return;
        }

        toast.success("Ad record created successfully.");
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
                        Create Ad Record
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-sm text-muted-foreground">
                        Initialize a new advertising tracking sequence.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 px-6 py-2">
                    <div>
                        <label className={labelClass}>Select Customer</label>
                        <Select value={selectedRecordId} onValueChange={(v) => { setSelectedRecordId(v); setStartDate(""); }}>
                            <SelectTrigger className={fieldClass}>
                                <SelectValue placeholder="Select customer" />
                            </SelectTrigger>
                            <SelectContent>
                                {eligibleRecords.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                        {item.customer_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                            
                        </Select>

                        <p className="mt-2 text-xs text-muted-foreground">
                            Customer must exist in performance records with eligible package.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className={labelClass}>Point Type</label>
                            <div className={infoFieldClass}>{selectedPointType?.label ?? "—"}</div>
                        </div>

                        <div>
                            <label className={labelClass}>Start Date</label>
                            <DatePickerDMY
                                value={startDate || undefined}
                                onChange={(iso) => setStartDate(iso ?? "")}
                                placeholder="Select start date"
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

                    <div className="grid grid-cols-1 gap-4 rounded-xl border bg-muted/30 p-4 md:grid-cols-2">
                        <div>
                            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                                Calculated Term End
                            </div>
                            <div className="mt-2 text-lg font-semibold text-foreground">
                                {endDate ? formatDMY(endDate) : "—"}
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                                Duration
                            </div>
                            <div className="mt-2 text-sm font-semibold text-primary">
                                {durationText}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="border-t px-6 py-4">
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
                        Create Record
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}