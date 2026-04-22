"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { formatDMY } from "@/lib/date";
import { getAdsTrackingStatus } from "@/lib/adsTracking";
import { Sparkles, Store } from "lucide-react";
import type { AdTrackingRow } from "./AdsTrackingPage";

function labelValueClass(value?: boolean) {
    return value
        ? "text-sm font-medium text-foreground"
        : "text-sm text-muted-foreground";
}

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="overflow-hidden rounded-xl border bg-background">
            <div className="border-b bg-muted/50 px-4 py-3 text-sm font-semibold text-foreground">
                {title}
            </div>
            <div className="p-4">{children}</div>
        </div>
    );
}

function InfoItem({
    label,
    value,
}: {
    label: string;
    value: React.ReactNode;
}) {
    const hasValue = value !== "—" && value !== null && value !== undefined;

    return (
        <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {label}
            </div>
            <div className={labelValueClass(Boolean(hasValue))}>{value ?? "—"}</div>
        </div>
    );
}

function renderStatus(startDate: string | null, endDate: string | null) {
    const status = getAdsTrackingStatus(startDate, endDate);

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

export default function AdsTrackingDetailDialog({
    open,
    onOpenChange,
    record,
    pointTypeMap,
    bdMap,
    bdLevelMap,
    customerTypeMap,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: AdTrackingRow | null;
    pointTypeMap: Record<string, string>;
    bdMap: Record<string, string>;
    bdLevelMap: Record<string, string>;
    customerTypeMap: Record<string, string>;
}) {
    const isRestaurant = record?.category === "restaurant";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] w-[88vw] max-w-[88vw] xl:w-[72vw] xl:max-w-[72vw] overflow-y-auto rounded-2xl p-0">
                <DialogHeader className="border-b px-6 py-4">
                    <DialogTitle className="text-2xl font-bold tracking-tight">
                        Ad Details
                    </DialogTitle>
                    <DialogDescription>
                        View ad tracking information and linked performance record details.
                    </DialogDescription>
                </DialogHeader>

                {!record ? null : (
                    <div className="space-y-5 px-6 py-5">
                        <Section title="Overview">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <InfoItem
                                    label="Customer"
                                    value={
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground">
                                                {isRestaurant ? (
                                                    <Store className="h-4 w-4" />
                                                ) : (
                                                    <Sparkles className="h-4 w-4" />
                                                )}
                                            </span>
                                            <span>{record.customer_name}</span>
                                        </div>
                                    }
                                />
                                <InfoItem
                                    label="BD Name"
                                    value={record.bd_id ? bdMap[record.bd_id] ?? record.bd_id : "—"}
                                />
                                <InfoItem
                                    label="Customer Type"
                                    value={
                                        record.customer_type_id
                                            ? customerTypeMap[record.customer_type_id] ??
                                            record.customer_type_id
                                            : "—"
                                    }
                                />
                                <InfoItem
                                    label="Category"
                                    value={
                                        record.category
                                            ? record.category === "restaurant"
                                                ? "Restaurant"
                                                : "Entertainment"
                                            : "—"
                                    }
                                />
                            </div>
                        </Section>

                        <Section title="Ads Tracking">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <InfoItem
                                    label="Point Type"
                                    value={pointTypeMap[record.point_type_id] ?? record.point_type_id}
                                />
                                <InfoItem
                                    label="Start Date"
                                    value={record.start_date ? formatDMY(record.start_date) : "—"}
                                />
                                <InfoItem
                                    label="End Date"
                                    value={record.end_date ? formatDMY(record.end_date) : "—"}
                                />
                                <InfoItem
                                    label="Status"
                                    value={renderStatus(record.start_date, record.end_date)}
                                />
                            </div>

                            <div className="mt-4">
                                <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                                    Ads Note
                                </div>
                                <div className="mt-1 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-foreground whitespace-pre-wrap break-words">
                                    {record.note || "—"}
                                </div>
                            </div>
                        </Section>

                        <Section title="Performance Record">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <InfoItem
                                    label="Date"
                                    value={record.event_date ? formatDMY(record.event_date) : "—"}
                                />
                                <InfoItem
                                    label="BD Name"
                                    value={record.bd_id ? bdMap[record.bd_id] ?? record.bd_id : "—"}
                                />
                                <InfoItem
                                    label="BD Level"
                                    value={
                                        record.bd_level_id
                                            ? bdLevelMap[record.bd_level_id] ?? record.bd_level_id
                                            : "—"
                                    }
                                />
                                <InfoItem
                                    label="Customer Type"
                                    value={
                                        record.customer_type_id
                                            ? customerTypeMap[record.customer_type_id] ??
                                            record.customer_type_id
                                            : "—"
                                    }
                                />
                                <InfoItem
                                    label="Point Type"
                                    value={pointTypeMap[record.point_type_id] ?? record.point_type_id}
                                />
                                <InfoItem
                                    label="Package Amount"
                                    value={
                                        record.package_amount !== null &&
                                            record.package_amount !== undefined
                                            ? record.package_amount.toLocaleString("en-US")
                                            : "—"
                                    }
                                />
                                <InfoItem
                                    label="Points"
                                    value={
                                        record.points !== null && record.points !== undefined
                                            ? record.points.toLocaleString("en-US")
                                            : "—"
                                    }
                                />
                                <InfoItem
                                    label="Bonus"
                                    value={
                                        record.money !== null && record.money !== undefined
                                            ? record.money.toLocaleString("en-US")
                                            : "—"
                                    }
                                />
                            </div>

                            <div className="mt-4">
                                <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                                    Performance Note
                                </div>
                                <div className="mt-1 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-foreground whitespace-pre-wrap break-words">
                                    {record.performance_note || "—"}
                                </div>
                            </div>
                        </Section>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}