"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { Check, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Popover,
    PopoverAnchor,
    PopoverContent,
} from "@/components/ui/popover";
import {
    ADS_TRACKING_POINT_TYPE_CODES,
    calculateAdsEndDate,
} from "@/lib/adsTracking";
import { formatDMY } from "@/lib/date";

const fieldClass =
    "!h-11 h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm shadow-none transition-colors hover:border-border focus-visible:ring-1 focus-visible:ring-ring";

const customerInputClass =
    "h-11 w-full min-w-0 rounded-lg border border-input bg-background pl-9 pr-10 text-sm shadow-none outline-none transition-colors placeholder:text-muted-foreground hover:border-border focus:border-ring focus-visible:ring-1 focus-visible:ring-ring";

const infoFieldClass =
    "flex h-10 w-full min-w-0 items-center rounded-lg border border-input bg-muted/60 px-3 text-sm text-foreground";

const labelClass =
    "mb-2 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground";

const helperTextClass = "mt-2 text-xs leading-5 text-muted-foreground";

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
    const [customerQuery, setCustomerQuery] = useState("");
    const [startDate, setStartDate] = useState("");
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [customerOpen, setCustomerOpen] = useState(false);
    const [customerDropdownWidth, setCustomerDropdownWidth] = useState<number | null>(
        null
    );

    const customerInputRef = useRef<HTMLInputElement | null>(null);
    const customerAnchorRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!open) return;

        async function loadData() {
            setLoadingCustomers(true);

            const { data: masterRows, error: masterError } = await supabase
                .from("masters")
                .select("id, code, label")
                .eq("category", "point_type")
                .eq("is_active", true);

            if (masterError || !masterRows?.length) {
                setPointTypes([]);
                setEligibleRecords([]);
                setLoadingCustomers(false);
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
                setLoadingCustomers(false);
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
            setLoadingCustomers(false);
        }

        loadData();
    }, [open]);

    useEffect(() => {
        if (!open) {
            setSelectedRecordId("");
            setCustomerQuery("");
            setStartDate("");
            setNote("");
            setSaving(false);
            setCustomerOpen(false);
            setLoadingCustomers(false);
            setCustomerDropdownWidth(null);
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const updateWidth = () => {
            if (customerAnchorRef.current) {
                setCustomerDropdownWidth(customerAnchorRef.current.offsetWidth);
            }
        };

        updateWidth();

        const resizeObserver =
            typeof ResizeObserver !== "undefined"
                ? new ResizeObserver(() => updateWidth())
                : null;

        if (customerAnchorRef.current && resizeObserver) {
            resizeObserver.observe(customerAnchorRef.current);
        }

        window.addEventListener("resize", updateWidth);

        return () => {
            window.removeEventListener("resize", updateWidth);
            resizeObserver?.disconnect();
        };
    }, [open]);

    useEffect(() => {
        if (!customerOpen) return;

        const id = requestAnimationFrame(() => {
            customerInputRef.current?.focus();
            const len = customerInputRef.current?.value.length ?? 0;
            customerInputRef.current?.setSelectionRange(len, len);
        });

        return () => cancelAnimationFrame(id);
    }, [customerOpen]);

    const selectedRecord = useMemo(() => {
        return eligibleRecords.find((item) => item.id === selectedRecordId) ?? null;
    }, [eligibleRecords, selectedRecordId]);

    const selectedPointType = useMemo(() => {
        if (!selectedRecord) return null;
        return pointTypes.find((item) => item.id === selectedRecord.point_type_id) ?? null;
    }, [pointTypes, selectedRecord]);

    const filteredRecords = useMemo(() => {
        const q = customerQuery.trim().toLowerCase();
        if (!q) return eligibleRecords;

        return eligibleRecords.filter((item) =>
            item.customer_name.toLowerCase().includes(q)
        );
    }, [eligibleRecords, customerQuery]);

    const endDate = useMemo(() => {
        if (!startDate || !selectedPointType?.code) return "";
        return calculateAdsEndDate(startDate, selectedPointType.code);
    }, [startDate, selectedPointType]);

    const durationText = useMemo(() => {
        if (!startDate || !selectedPointType?.code) return "—";
        if (selectedPointType.code === "LEN_QC_COMBO_1_NAM") return "90 Days";
        if (selectedPointType.code === "LEN_QC_COMBO_3_THANG") return "1 Year";
        return "—";
    }, [startDate, selectedPointType]);

    const isDisabled = saving || !selectedRecord;

    function handleCustomerOpenChange(nextOpen: boolean) {
        setCustomerOpen(nextOpen);

        if (!nextOpen) {
            setCustomerQuery(selectedRecord?.customer_name ?? "");
        }
    }

    function handleCustomerInputFocus() {
        setCustomerOpen(true);
    }

    function handleCustomerInputChange(value: string) {
        setCustomerQuery(value);

        if (!customerOpen) {
            setCustomerOpen(true);
        }

        if (selectedRecord && value !== selectedRecord.customer_name) {
            setSelectedRecordId("");
            setStartDate("");
        }
    }

    function handleSelectCustomer(item: EligibleRecord) {
        setSelectedRecordId(item.id);
        setCustomerQuery(item.customer_name);
        setStartDate("");
        setCustomerOpen(false);
    }

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
                className="max-w-2xl overflow-hidden rounded-2xl border border-border bg-background p-0 shadow-xl"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <DialogHeader className="border-b border-border px-6 py-4">
                    <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
                        Create Ad Record
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-sm leading-6 text-muted-foreground">
                        Initialize a new advertising tracking sequence.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 px-6 py-5">
                    <div className="space-y-0">
                        <label className={labelClass}>Select Customer</label>

                        <Popover open={customerOpen} onOpenChange={handleCustomerOpenChange}>
                            <PopoverAnchor asChild>
                                <div ref={customerAnchorRef} className="w-full">
                                    <div className="relative w-full">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                                        <input
                                            ref={customerInputRef}
                                            value={customerQuery}
                                            onChange={(e) => handleCustomerInputChange(e.target.value)}
                                            onFocus={handleCustomerInputFocus}
                                            onClick={handleCustomerInputFocus}
                                            placeholder="Search customer..."
                                            className={customerInputClass}
                                        />

                                        {loadingCustomers && (
                                            <Loader2 className="pointer-events-none absolute right-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                                        )}
                                    </div>
                                </div>
                            </PopoverAnchor>

                            <PopoverContent
                                align="start"
                                sideOffset={6}
                                onOpenAutoFocus={(e) => e.preventDefault()}
                                onCloseAutoFocus={(e) => e.preventDefault()}
                                className="z-50 w-[var(--radix-popover-trigger-width)] min-w-[var(--radix-popover-trigger-width)] max-w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-xl border border-border bg-popover p-0 shadow-lg"
                            >
                                <div
                                    className="max-h-72 w-full overflow-y-auto overscroll-contain p-1"
                                    onWheel={(e) => e.stopPropagation()}
                                    onTouchMove={(e) => e.stopPropagation()}
                                >
                                    {filteredRecords.length === 0 ? (
                                        <div className="py-2 text-center text-sm text-muted-foreground">
                                            No customer found.
                                        </div>
                                    ) : (
                                        filteredRecords.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => handleSelectCustomer(item)}
                                                className="flex h-10 w-full min-w-0 items-center gap-2 rounded-md px-3 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                                            >
                                                <Check
                                                    className={cn(
                                                        "h-4 w-4 shrink-0",
                                                        selectedRecordId === item.id
                                                            ? "opacity-100 text-primary"
                                                            : "opacity-0"
                                                    )}
                                                />
                                                <span className="flex-1 truncate">{item.customer_name}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>

                        <p className={helperTextClass}>
                            Customer must exist in performance records with eligible package.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className={labelClass}>Point Type</label>
                            <div className={infoFieldClass}>
                                {selectedPointType?.label ?? "—"}
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Start Date</label>
                            <DatePickerDMY
                                value={startDate || undefined}
                                onChange={(iso) => setStartDate(iso ?? "")}
                                placeholder="Select start date"
                                className={cn(fieldClass, "!h-10 h-10")}
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
                            className="min-h-[88px] max-h-[88px] resize-none overflow-y-auto whitespace-pre-wrap break-all rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-none transition-colors hover:border-border focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-muted/30 p-4 md:grid-cols-2">
                        <div>
                            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                                Calculated Term End
                            </div>
                            <div className="mt-2 text-lg font-semibold text-foreground">
                                {endDate ? formatDMY(endDate) : "—"}
                            </div>
                        </div>

                        <div className="text-left md:text-right">
                            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                                Duration
                            </div>
                            <div className="mt-2 text-sm font-semibold text-primary">
                                {durationText}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="border-t border-border px-6 py-4">
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
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            "Create Record"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}