"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getAdsTrackingStatus } from "@/lib/adsTracking";
import { useMasters } from "@/lib/useMasters";
import CreateAdRecordDialog from "./CreateAdRecordDialog";
import EditAdRecordDialog from "./EditAdRecordDialog";
import AdsTrackingTable from "./AdsTrackingTable";

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
};

export default function AdsTrackingPage({
    isAdmin,
    currentUserId,
}: {
    isAdmin: boolean;
    currentUserId: string;
}) {
    const [rows, setRows] = useState<AdTrackingRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [openCreate, setOpenCreate] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [selectedRow, setSelectedRow] = useState<
        (AdTrackingRow & { point_type_label: string }) | null
    >(null);

    const { items: allMasters } = useMasters("point_type");
    const pointTypeMap = useMemo(() => {
        const map: Record<string, string> = {};
        for (const item of allMasters) {
            map[item.id] = item.label;
        }
        return map;
    }, [allMasters]);

    async function refresh() {
        setLoading(true);

        const { data, error } = await supabase
            .from("ad_tracking_records")
            .select("*")
            .order("created_at", { ascending: false });

        if (!error) {
            setRows((data ?? []) as AdTrackingRow[]);
        }

        setLoading(false);
    }

    useEffect(() => {
        refresh();

        const channel = supabase
            .channel("ad-tracking-realtime")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "ad_tracking_records" },
                () => {
                    refresh();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
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

        if (!nextOpen) {
            setSelectedRow(null);
        }
    }

    async function handleDelete(row: AdTrackingRow) {
        const confirmed = window.confirm(
            `Are you sure you want to delete ad record for "${row.customer_name}"?`
        );

        if (!confirmed) return;

        const { error } = await supabase
            .from("ad_tracking_records")
            .delete()
            .eq("id", row.id);

        if (error) {
            console.error("delete ad record error:", error);
            return;
        }

        await refresh();
    }

    const totalCampaigns = rows.length;
    const activeNow = rows.filter(
        (x) => x.end_date && getAdsTrackingStatus(x.start_date, x.end_date) === "active"
    ).length;
    const expiringSoon = rows.filter(
        (x) => x.end_date && getAdsTrackingStatus(x.start_date, x.end_date) === "expiring_soon"
    ).length;
    const expiredCount = rows.filter(
        (x) => getAdsTrackingStatus(x.start_date, x.end_date) === "expired"
    ).length;
    const statStyles = {
        total: "border-primary/30 bg-muted/40",
        active: "border-emerald-200 bg-emerald-50",
        expiring: "border-amber-200 bg-amber-50",
        expired: "border-red-200 bg-red-50",
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
                        Create Ad Record
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

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <AdsTrackingTable
                    rows={rows}
                    pointTypeMap={pointTypeMap}
                    isAdmin={isAdmin}
                    onEdit={handleOpenEdit}
                    onDelete={handleDelete}
                />
            )}

            <CreateAdRecordDialog
                open={openCreate}
                onOpenChange={setOpenCreate}
                onSaved={refresh}
                currentUserId={currentUserId}
            />

            <EditAdRecordDialog
                open={openEdit}
                onOpenChange={handleCloseEdit}
                record={selectedRow}
                onSaved={refresh}
            />
        </div>
    );
}