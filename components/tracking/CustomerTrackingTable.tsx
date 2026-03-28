"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw } from "lucide-react";
import type { TrackingRecordVM } from "./types";
import { formatDMY } from "@/lib/date";
import {
    TooltipProvider,
} from "@/components/ui/tooltip";
import EditTrackingDialog from "./dialogs/EditTrackingDialog";
import { supabase } from "@/lib/supabaseClient";

export default function CustomerTrackingTable({
    rows,
    loading,
    onChanged,
    isAdmin,
    search,
    onSearchChange,
    onRefresh,
    bdMap,
    stats,
}: {
    rows: TrackingRecordVM[];
    loading: boolean;
    onChanged: () => void;
    onRefresh: () => void;
    isAdmin: boolean;
    search: string;
    onSearchChange: (value: string) => void;
    bdMap: Record<string, string>;
    stats: {
        totalCustomers: number;
        totalBranches: number;
        totalHotList: number;
    };
}) {
    const [selectionMode, setSelectionMode] = useState(false);
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const [editing, setEditing] = useState<TrackingRecordVM | null>(null);
    const [editOpen, setEditOpen] = useState(false);

    const selectedIds = Object.keys(selected).filter((id) => selected[id]);

    function toggleRowSelection(id: string) {
        if (!selectionMode) return;

        setSelected((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    }

    function openEditDialog(record: TrackingRecordVM) {
        if (!isAdmin || selectionMode) return;
        setEditing(record);
        setEditOpen(true);
    }

    async function handleDelete() {
        if (!selectionMode) {
            setSelectionMode(true);
            return;
        }

        if (selectedIds.length === 0) {
            setSelectionMode(false);
            return;
        }

        const { error } = await supabase
            .from("customer_tracking")
            .delete()
            .in("id", selectedIds);

        if (error) {
            console.error("Failed to delete customer records:", error);
            return;
        }

        setSelected({});
        setSelectionMode(false);
        onChanged();
    }

    if (loading) {
        return <div className="text-sm text-muted-foreground">Loading...</div>;
    }

    return (
        <TooltipProvider>
            <>
                <div className="border rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 p-2 border-b">
                        <div className="relative w-[280px]">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search customer, BD, note or info..."
                                value={search}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="pl-8 h-9"
                            />
                        </div>

                        <div className="flex-1" />

                        <div className="flex items-center gap-2">
                            <Button
                                className="cursor-pointer"
                                variant="ghost"
                                onClick={onRefresh}
                            >
                                <RefreshCw className="h-4 w-4" />
                                Refresh
                            </Button>


                            {isAdmin && (
                                <div className="flex items-center gap-2">
                                    {selectionMode && (
                                        <Button
                                            className="cursor-pointer"
                                            variant="ghost"
                                            onClick={() => {
                                                setSelectionMode(false);
                                                setSelected({});
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    )}

                                    <Button
                                        className="cursor-pointer"
                                        variant={selectionMode ? "destructive" : "secondary"}
                                        onClick={handleDelete}
                                    >
                                        {selectionMode ? `Delete (${selectedIds.length})` : "Delete"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-full overflow-x-auto">
                        <table className="w-full min-w-[1200px] text-sm table-fixed text-center">
                            <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur border-b shadow-sm">
                                <tr>
                                    <th className="w-[120px] p-2 pl-5 text-left">Date</th>

                                    <th className="p-2 w-[240px] ">
                                        Customers
                                        <span className="ml-2 inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                            {stats.totalCustomers.toLocaleString("en-US")}
                                        </span>
                                    </th>

                                    <th className="p-2 w-[120px]">
                                        Branches
                                        <span className="ml-2 inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                            {stats.totalBranches.toLocaleString("en-US")}
                                        </span>
                                    </th>

                                    <th className="p-2 w-[120px]">
                                        In hot list
                                        <span className="ml-2 inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                            {stats.totalHotList.toLocaleString("en-US")}
                                        </span>
                                    </th>

                                    <th className="p-2 w-[120px]">BD Name</th>
                                    <th className="p-2 w-[140px]">Combo/Voucher</th>
                                    <th className="p-2 w-[140px]">Note</th>
                                    <th className="p-2 w-[140px]">Information</th>

                                    {selectionMode && (
                                        <th className="p-2 w-[60px] text-right"></th>
                                    )}
                                </tr>
                            </thead>

                            <tbody>
                                {rows.map((r) => {
                                    const isSelected = !!selected[r.id];

                                    return (
                                        <tr
                                            key={r.id}
                                            className={`border-t ${selectionMode ? "cursor-pointer" : "cursor-default"
                                                } ${isSelected ? "bg-muted/40" : ""}`}
                                            onClick={() => toggleRowSelection(r.id)}
                                            onDoubleClick={() => openEditDialog(r)}
                                        >
                                            <td className="p-2 pl-5 text-left">
                                                <div className="flex items-center justify-start gap-2">
                                                    <span>{formatDMY(r.event_date)}</span>
                                                    {r._sync_status === "pending" && (
                                                        <Badge variant="secondary">Pending</Badge>
                                                    )}
                                                    {r._sync_status === "failed" && (
                                                        <Badge variant="destructive">Failed</Badge>
                                                    )}
                                                </div>
                                            </td>

                                            <td
                                                className={`p-2 whitespace-nowrap overflow-hidden text-ellipsis ${(r.in_hot_list ?? 0) === 0
                                                    ? "text-muted-foreground opacity-60"
                                                    : ""
                                                    }`}
                                                title={r.customer_name}
                                            >
                                                {r.customer_name}
                                            </td>

                                            <td className="p-2">
                                                {r.branch != null
                                                    ? r.branch.toLocaleString("en-US")
                                                    : "—"}
                                            </td>

                                            <td className="p-2">
                                                {r.in_hot_list != null
                                                    ? r.in_hot_list.toLocaleString("en-US")
                                                    : "—"}
                                            </td>

                                            <td
                                                className="p-2 whitespace-nowrap overflow-hidden text-ellipsis"
                                                title={bdMap[r.bd_id ?? ""] ?? ""}
                                            >
                                                {bdMap[r.bd_id ?? ""] ?? "—"}
                                            </td>

                                            <td className="p-2">
                                                {r.combo_voucher ? (
                                                    <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                                                        YES
                                                    </span>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>

                                            <td
                                                className="p-2 whitespace-nowrap overflow-hidden text-ellipsis"
                                                title={r.note ?? ""}
                                            >
                                                {r.note ?? "—"}
                                            </td>

                                            <td
                                                className="p-2 whitespace-nowrap overflow-hidden text-ellipsis"
                                                title={r.info ?? ""}
                                            >
                                                {r.info ?? "—"}
                                            </td>

                                            {selectionMode && (
                                                <td
                                                    className="p-2 text-right"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={(v) =>
                                                            setSelected((s) => ({
                                                                ...s,
                                                                [r.id]: Boolean(v),
                                                            }))
                                                        }
                                                    />
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {rows.length === 0 && (
                            <div className="p-4 text-sm text-muted-foreground">
                                No records found
                            </div>
                        )}
                    </div>
                </div>

                {isAdmin && (
                    <EditTrackingDialog
                        open={editOpen}
                        onOpenChange={setEditOpen}
                        record={editing}
                        onSaved={onChanged}
                    />
                )}
            </>
        </TooltipProvider>
    );
}