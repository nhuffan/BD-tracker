"use client";

import { useEffect, useState } from "react";
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
import { useMastersActive } from "@/lib/useMasters";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import type { TrackingRecordVM } from "../types";
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

export default function EditTrackingDialog({
    open,
    onOpenChange,
    record,
    onSaved,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    record: TrackingRecordVM | null;
    onSaved: () => Promise<void> | void;
}) {
    const bdList = useMastersActive("bd");

    const [form, setForm] = useState({
        customer_name: "",
        branch: 0,
        in_hot_list: 0,
        bd_id: "",
        combo_voucher: false,
        note: null as string | null,
        info: null as string | null,
    });

    const [branchInput, setBranchInput] = useState("0");
    const [hotListInput, setHotListInput] = useState("0");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!open || !record) return;

        setForm({
            customer_name: record.customer_name ?? "",
            branch: record.branch ?? 0,
            in_hot_list: record.in_hot_list ?? 0,
            bd_id: record.bd_id ?? "",
            combo_voucher: record.combo_voucher ?? false,
            note: record.note ?? null,
            info: record.info ?? null,
        });

        setBranchInput(
            record.branch !== null && record.branch !== undefined
                ? Number(record.branch).toLocaleString("en-US")
                : "0"
        );

        setHotListInput(
            record.in_hot_list !== null && record.in_hot_list !== undefined
                ? Number(record.in_hot_list).toLocaleString("en-US")
                : "0"
        );
    }, [open, record]);

    if (!record) return null;

    const currentRecord = record;

    const normalizedCustomerName = form.customer_name.trim();
    const normalizedNote = (form.note ?? "").trim();
    const normalizedInfo = (form.info ?? "").trim();

    const originalCustomerName = (currentRecord.customer_name ?? "").trim();
    const originalBranch = currentRecord.branch ?? 0;
    const originalHotList = currentRecord.in_hot_list ?? 0;
    const originalBdId = currentRecord.bd_id ?? "";
    const originalComboVoucher = currentRecord.combo_voucher ?? false;
    const originalNote = (currentRecord.note ?? "").trim();
    const originalInfo = (currentRecord.info ?? "").trim();

    const hasChanges =
        normalizedCustomerName !== originalCustomerName ||
        form.branch !== originalBranch ||
        form.in_hot_list !== originalHotList ||
        form.bd_id !== originalBdId ||
        form.combo_voucher !== originalComboVoucher ||
        normalizedNote !== originalNote ||
        normalizedInfo !== originalInfo;

    const isSaveDisabled =
        !normalizedCustomerName || !form.bd_id || !hasChanges || isLoading;

    async function handleSave() {
        if (isSaveDisabled) return;

        setIsLoading(true);

        try {
            const { error } = await supabase
                .from("customer_tracking")
                .update({
                    customer_name: normalizedCustomerName,
                    branch: form.branch,
                    in_hot_list: form.in_hot_list,
                    bd_id: form.bd_id,
                    combo_voucher: form.combo_voucher,
                    note: normalizedNote || null,
                    info: normalizedInfo || null,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", currentRecord.id);

            if (error) {
                toast.error("Failed to update record.");
                return;
            }

            onOpenChange(false);
            await onSaved();
            toast.success("Record updated successfully.");
        } finally {
            setIsLoading(false);
        }
    }

    function handleDialogOpenChange(nextOpen: boolean) {
        if (isLoading) return;
        onOpenChange(nextOpen);
    }

    return (
        <Dialog open={open} onOpenChange={handleDialogOpenChange}>
            <DialogContent
                className="max-w-lg"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold tracking-tight">
                        Edit Customer
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-3">
                    <div>
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

                    <div>
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
                        <p className="mb-1.5 text-sm font-medium text-foreground">Branches</p>
                        <Input
                            inputMode="numeric"
                            value={branchInput}
                            onChange={(e) => {
                                const formatted = formatNumberInput(e.target.value);
                                const parsed = parseNumberInput(e.target.value) ?? 0;

                                setBranchInput(formatted);
                                setForm((f) => ({
                                    ...f,
                                    branch: parsed,
                                }));
                            }}
                            placeholder="Enter branches"
                        />
                    </div>

                    <div>
                        <p className="mb-1.5 text-sm font-medium text-foreground">
                            In hot list
                        </p>
                        <Input
                            inputMode="numeric"
                            value={hotListInput}
                            onChange={(e) => {
                                const formatted = formatNumberInput(e.target.value);
                                const parsed = parseNumberInput(e.target.value) ?? 0;

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
                            value={form.combo_voucher ? "yes" : "none"}
                            onValueChange={(v) =>
                                setForm((f) => ({
                                    ...f,
                                    combo_voucher: v === "yes",
                                }))
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue>
                                    {form.combo_voucher ? (
                                        <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                                            YES
                                        </span>
                                    ) : (
                                        <span>—</span>
                                    )}
                                </SelectValue>
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem
                                    value="yes"
                                    className="font-semibold text-green-700 focus:bg-green-50 focus:text-green-700"
                                >
                                    <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                                        YES
                                    </span>
                                </SelectItem>

                                <SelectItem value="none">—</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <p className="mb-1.5 text-sm font-medium text-foreground">Note</p>
                        <Textarea
                            value={form.note ?? ""}
                            onChange={(e) =>
                                setForm((f) => ({ ...f, note: e.target.value || null }))
                            }
                            placeholder="Enter note"
                        />
                    </div>

                    <div>
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
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => handleDialogOpenChange(false)}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>

                    <Button
                        className="cursor-pointer"
                        onClick={handleSave}
                        disabled={isSaveDisabled}
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