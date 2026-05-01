"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getAdsTrackingStatus } from "@/lib/adsTracking";
import { useMasters } from "@/lib/useMasters";
import CreateAdRecordDialog from "./CreateAdRecordDialog";
import EditAdRecordDialog from "./EditAdRecordDialog";
import AdsTrackingTable from "./AdsTrackingTable";
import AdsTrackingDetailDialog from "./AdsTrackingDetailDialog";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export type AdTrackingRow = {
    id: string;
    source_record_id: string | null;
    customer_name: string;
    point_type_id: string;
    start_date: string | null;
    end_date: string | null;
    note: string | null;
    created_at: string;
    updated_at: string;

    event_date?: string | null;
    bd_id?: string | null;
    bd_level_id?: string | null;
    customer_type_id?: string | null;
    category?: string | null;
    package_amount?: number | null;
    points?: number | null;
    money?: number | null;
    performance_note?: string | null;
};

type SourceRecordLite = {
    id: string;
    customer_name: string;
    point_type_id: string;
    event_date: string | null;
    bd_id: string | null;
    bd_level_id: string | null;
    customer_type_id: string | null;
    category: string | null;
    package_amount: number | null;
    points: number | null;
    money: number | null;
    note: string | null;
};

function mergePerformanceIntoAdRow(
    row: AdTrackingRow,
    source?: Partial<SourceRecordLite> | null
): AdTrackingRow {
    if (!source) return row;

    return {
        ...row,
        customer_name: source.customer_name ?? row.customer_name,
        point_type_id: source.point_type_id ?? row.point_type_id,
        event_date: source.event_date ?? null,
        bd_id: source.bd_id ?? null,
        bd_level_id: source.bd_level_id ?? null,
        customer_type_id: source.customer_type_id ?? null,
        category: source.category ?? null,
        package_amount: source.package_amount ?? null,
        points: source.points ?? null,
        money: source.money ?? null,
        performance_note: source.note ?? null,
    };
}

export default function AdsTrackingPage({
    isAdmin,
    currentUserId,
}: {
    isAdmin: boolean;
    currentUserId: string;
}) {
    const [rows, setRows] = useState<AdTrackingRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMutating, setIsMutating] = useState(false);
    const [openCreate, setOpenCreate] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [openView, setOpenView] = useState(false);

    const [selectedRow, setSelectedRow] = useState<
        (AdTrackingRow & { point_type_label: string }) | null
    >(null);
    const [viewRow, setViewRow] = useState<AdTrackingRow | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<AdTrackingRow | null>(null);

    const { items: allPointTypes, loading: pointTypesLoading } = useMasters("point_type");
    const { items: allBds, loading: bdsLoading } = useMasters("bd");
    const { items: allBdLevels, loading: bdLevelsLoading } = useMasters("bd_level");
    const { items: allCustomerTypes, loading: customerTypesLoading } = useMasters("customer_type");

    const pointTypeMap = useMemo(() => {
        const map: Record<string, string> = {};
        for (const item of allPointTypes) map[item.id] = item.label;
        return map;
    }, [allPointTypes]);

    const bdMap = useMemo(() => {
        const map: Record<string, string> = {};
        for (const item of allBds) map[item.id] = item.label;
        return map;
    }, [allBds]);

    const bdLevelMap = useMemo(() => {
        const map: Record<string, string> = {};
        for (const item of allBdLevels) map[item.id] = item.label;
        return map;
    }, [allBdLevels]);

    const customerTypeMap = useMemo(() => {
        const map: Record<string, string> = {};
        for (const item of allCustomerTypes) map[item.id] = item.label;
        return map;
    }, [allCustomerTypes]);

    const mastersLoading =
        pointTypesLoading || bdsLoading || bdLevelsLoading || customerTypesLoading;

    async function refresh() {
        setLoading(true);

        const { data, error } = await supabase
            .from("ad_tracking_records")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            setLoading(false);
            return;
        }

        const baseRows = (data ?? []) as AdTrackingRow[];
        const sourceRecordIds = Array.from(
            new Set(baseRows.map((row) => row.source_record_id).filter(Boolean))
        ) as string[];

        let sourceRecordMap: Record<string, SourceRecordLite> = {};

        if (sourceRecordIds.length > 0) {
            const { data: sourceRecords, error: sourceError } = await supabase
                .from("records")
                .select(
                    "id, customer_name, point_type_id, event_date, bd_id, bd_level_id, customer_type_id, category, package_amount, points, money, note"
                )
                .in("id", sourceRecordIds);

            if (!sourceError) {
                sourceRecordMap = Object.fromEntries(
                    ((sourceRecords ?? []) as SourceRecordLite[]).map((item) => [
                        item.id,
                        item,
                    ])
                );
            }
        }

        const mergedRows: AdTrackingRow[] = baseRows.map((row) =>
            mergePerformanceIntoAdRow(
                row,
                row.source_record_id ? sourceRecordMap[row.source_record_id] : null
            )
        );

        setRows(mergedRows);
        setLoading(false);
    }

    useEffect(() => {
        refresh();
    }, []);

    function handleOpenEdit(row: AdTrackingRow) {
        setSelectedRow({
            ...row,
            point_type_label: pointTypeMap[row.point_type_id] ?? row.point_type_id,
        });
        setOpenEdit(true);
    }

    function handleCloseEdit(nextOpen: boolean) {
        setOpenEdit(nextOpen);
        if (!nextOpen) setSelectedRow(null);
    }

    function handleOpenView(row: AdTrackingRow) {
        setViewRow(row);
        setOpenView(true);
    }

    function handleCloseView(nextOpen: boolean) {
        setOpenView(nextOpen);
        if (!nextOpen) setViewRow(null);
    }

    async function handleDelete(row: AdTrackingRow) {
        if (loading || isMutating) return;

        setDeleteTarget(row);
    }

    async function handleDeleteConfirmed() {
        if (!deleteTarget || loading || isMutating) return;

        setIsMutating(true);

        try {
            const { error } = await supabase
                .from("ad_tracking_records")
                .delete()
                .eq("id", deleteTarget.id);

            if (error) {
                console.error("delete ad record error:", error);
                toast.error(error.message || "Failed to delete ad record.");
                return;
            }

            toast.success("Ad record deleted successfully.");
            setDeleteTarget(null);
            await refresh();
        } finally {
            setIsMutating(false);
        }
    }

    async function handleSaved() {
        setIsMutating(true);

        try {
            await refresh();
        } finally {
            setIsMutating(false);
        }
    }

    useEffect(() => {
        const adChannel = supabase
            .channel("ad-tracking-records-changes")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "ad_tracking_records",
                },

                async (payload) => {
                    const next = payload.new as AdTrackingRow;

                    let merged = next;

                    if (next.source_record_id) {
                        const { data: source } = await supabase
                            .from("records")
                            .select(
                                "id, customer_name, point_type_id, event_date, bd_id, bd_level_id, customer_type_id, category, package_amount, points, money, note"
                            )
                            .eq("id", next.source_record_id)
                            .maybeSingle();

                        merged = mergePerformanceIntoAdRow(
                            next,
                            (source as SourceRecordLite | null) ?? null
                        );
                    }

                    setRows((prev) => [merged, ...prev.filter((x) => x.id !== merged.id)]);
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "ad_tracking_records",
                },
                async (payload) => {
                    const next = payload.new as AdTrackingRow;

                    let merged = next;

                    if (next.source_record_id) {
                        const { data: source } = await supabase
                            .from("records")
                            .select(
                                "id, customer_name, point_type_id, event_date, bd_id, bd_level_id, customer_type_id, category, package_amount, points, money, note"
                            )
                            .eq("id", next.source_record_id)
                            .maybeSingle();

                        merged = mergePerformanceIntoAdRow(
                            next,
                            (source as SourceRecordLite | null) ?? null
                        );
                    }

                    setRows((prev) =>
                        prev.map((item) => (item.id === merged.id ? merged : item))
                    );

                    setSelectedRow((prev) => {
                        if (!prev || prev.id !== merged.id) return prev;
                        return {
                            ...prev,
                            ...merged,
                            point_type_label:
                                pointTypeMap[merged.point_type_id] ?? merged.point_type_id,
                        };
                    });

                    setViewRow((prev) => {
                        if (!prev || prev.id !== merged.id) return prev;
                        return { ...prev, ...merged };
                    });
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "DELETE",
                    schema: "public",
                    table: "ad_tracking_records",
                },
                (payload) => {
                    const oldRow = payload.old as { id: string };

                    setRows((prev) => prev.filter((item) => item.id !== oldRow.id));
                    setSelectedRow((prev) => (prev?.id === oldRow.id ? null : prev));
                    setViewRow((prev) => (prev?.id === oldRow.id ? null : prev));
                }
            )
            .subscribe();

        const performanceChannel = supabase
            .channel("ads-tracking-source-records-changes")
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "records",
                },
                (payload) => {
                    const next = payload.new as SourceRecordLite;

                    setRows((prev) =>
                        prev.map((item) =>
                            item.source_record_id === next.id
                                ? mergePerformanceIntoAdRow(item, next)
                                : item
                        )
                    );

                    setSelectedRow((prev) => {
                        if (!prev || prev.source_record_id !== next.id) return prev;

                        const merged = mergePerformanceIntoAdRow(prev, next);
                        return {
                            ...prev,
                            ...merged,
                            point_type_label:
                                pointTypeMap[merged.point_type_id] ?? merged.point_type_id,
                        };
                    });

                    setViewRow((prev) => {
                        if (!prev || prev.source_record_id !== next.id) return prev;
                        return mergePerformanceIntoAdRow(prev, next);
                    });
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "DELETE",
                    schema: "public",
                    table: "records",
                },
                (payload) => {
                    const oldRow = payload.old as { id: string };

                    setRows((prev) =>
                        prev.map((item) =>
                            item.source_record_id === oldRow.id
                                ? {
                                    ...item,
                                    event_date: null,
                                    bd_id: null,
                                    bd_level_id: null,
                                    customer_type_id: null,
                                    category: null,
                                    package_amount: null,
                                    points: null,
                                    money: null,
                                    performance_note: null,
                                }
                                : item
                        )
                    );

                    setSelectedRow((prev) => {
                        if (!prev || prev.source_record_id !== oldRow.id) return prev;
                        return {
                            ...prev,
                            event_date: null,
                            bd_id: null,
                            bd_level_id: null,
                            customer_type_id: null,
                            category: null,
                            package_amount: null,
                            points: null,
                            money: null,
                            performance_note: null,
                        };
                    });

                    setViewRow((prev) => {
                        if (!prev || prev.source_record_id !== oldRow.id) return prev;
                        return {
                            ...prev,
                            event_date: null,
                            bd_id: null,
                            bd_level_id: null,
                            customer_type_id: null,
                            category: null,
                            package_amount: null,
                            points: null,
                            money: null,
                            performance_note: null,
                        };
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(adChannel);
            supabase.removeChannel(performanceChannel);
        };
    }, [pointTypeMap]);

    const totalCampaigns = rows.length;

    const activeNow = rows.filter(
        (x) => x.end_date && getAdsTrackingStatus(x.start_date, x.end_date) === "active"
    ).length;

    const expiringSoon = rows.filter(
        (x) =>
            x.end_date &&
            getAdsTrackingStatus(x.start_date, x.end_date) === "expiring_soon"
    ).length;

    const expiredCount = rows.filter(
        (x) => getAdsTrackingStatus(x.start_date, x.end_date) === "expired"
    ).length;

    const baseStatStyle =
        "transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-md cursor-pointer";

    const statStyles = {
        total: `${baseStatStyle} border-primary/10 bg-muted/40 hover:border-primary/30`,
        active: `${baseStatStyle} border-emerald-200 bg-emerald-50 hover:border-emerald-400`,
        expiring: `${baseStatStyle} border-amber-200 bg-amber-50 hover:border-amber-400`,
        expired: `${baseStatStyle} border-red-200 bg-red-50 hover:border-red-400`,
    };

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Ads Tracking</h1>
                    <p className="text-sm text-muted-foreground">
                        Real-time oversight of customer promotional campaigns.
                    </p>
                </div>

                {isAdmin && (
                    <Button
                        className="h-10 cursor-pointer"
                        onClick={() => setOpenCreate(true)}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Ad
                    </Button>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
                <div className={`rounded-xl border ${statStyles.total} p-5`}>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Total Campaigns
                    </div>
                    <div className="mt-2 text-3xl font-bold">{totalCampaigns}</div>
                </div>

                <div className={`rounded-xl border ${statStyles.active} p-5`}>
                    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        Active Now
                    </div>
                    <div className="mt-2 text-3xl font-bold text-emerald-700">
                        {activeNow}
                    </div>
                </div>

                <div className={`rounded-xl border ${statStyles.expiring} p-5`}>
                    <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                        Expiring Soon
                    </div>
                    <div className="mt-2 text-3xl font-bold text-amber-700">
                        {expiringSoon}
                    </div>
                </div>

                <div className={`rounded-xl border ${statStyles.expired} p-5`}>
                    <div className="text-xs font-semibold uppercase tracking-wide text-red-700">
                        Expired
                    </div>
                    <div className="mt-2 text-3xl font-bold text-red-700">
                        {expiredCount}
                    </div>
                </div>
            </div>

            <AdsTrackingTable
                rows={rows}
                loading={loading || mastersLoading || isMutating}
                pointTypeMap={pointTypeMap}
                bdMap={bdMap}
                customerTypeMap={customerTypeMap}
                isAdmin={isAdmin}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
                onView={handleOpenView}
            />

            <CreateAdRecordDialog
                open={openCreate}
                onOpenChange={setOpenCreate}
                onSaved={handleSaved}
                currentUserId={currentUserId}
            />

            <EditAdRecordDialog
                open={openEdit}
                onOpenChange={handleCloseEdit}
                record={selectedRow}
                onSaved={handleSaved}
            />

            <AdsTrackingDetailDialog
                open={openView}
                onOpenChange={handleCloseView}
                record={viewRow}
                pointTypeMap={pointTypeMap}
                bdMap={bdMap}
                bdLevelMap={bdLevelMap}
                customerTypeMap={customerTypeMap}
            />

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(open) => {
                    if (!open && !isMutating) setDeleteTarget(null);
                }}
                title="Confirm Delete"
                description={`Are you sure you want to delete ad tracking record for "${deleteTarget?.customer_name}"? This action cannot be undone.`}
                onConfirm={handleDeleteConfirmed}
                loading={isMutating}
            />
        </div>
    );
}
