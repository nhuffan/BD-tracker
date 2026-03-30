"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleX, Plus, Search } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMasters } from "@/lib/useMasters";
import type { ApprovalRequest, ApprovalRequestVM } from "./utils/types";
import CreateApprovalRequestDialog from "./dialogs/CreateApprovalRequestDialog";
import ApprovalRequestDetailPanel from "./ApprovalRequestPanel";

type ApprovalViewTab = "queue" | "archive";
type ArchiveFilter = "all" | "approved" | "rejected";

function formatRequestCode(index: number) {
    return `#APR-${String(index + 1).padStart(4, "0")}`;
}

function formatRelativeTime(value?: string | null) {
    if (!value) return "—";

    const now = Date.now();
    const target = new Date(value).getTime();
    const diff = Math.max(0, now - target);

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes || 1} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
}

function formatDate(value?: string | null) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function upsertRequest(list: ApprovalRequest[], next: ApprovalRequest) {
    const index = list.findIndex((item) => item.id === next.id);
    if (index === -1) return [next, ...list];

    const clone = [...list];
    clone[index] = next;
    return clone;
}

export default function ApprovalsPage({
    isAdmin,
    currentUserId,
}: {
    isAdmin: boolean;
    currentUserId: string;
}) {
    const [loading, setLoading] = useState(false);
    const [requests, setRequests] = useState<ApprovalRequest[]>([]);
    const [search, setSearch] = useState("");
    const [viewTab, setViewTab] = useState<ApprovalViewTab>("queue");
    const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("all");
    const [createOpen, setCreateOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<ApprovalRequestVM | null>(null);

    const { items: bdList } = useMasters("bd");

    const bdNameMap = useMemo(() => {
        return Object.fromEntries(bdList.map((item) => [item.id, item.label]));
    }, [bdList]);

    async function refresh() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("approval_requests")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Failed to load approval requests:", error);
                return;
            }

            setRequests((data ?? []) as ApprovalRequest[]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refresh();
    }, []);

    useEffect(() => {
        const channel = supabase
            .channel("approval-requests-changes")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "approval_requests",
                },
                (payload) => {
                    const next = payload.new as ApprovalRequest;
                    setRequests((prev) => upsertRequest(prev, next));
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "approval_requests",
                },
                (payload) => {
                    const next = payload.new as ApprovalRequest;

                    setRequests((prev) => upsertRequest(prev, next));

                    setSelectedRequest((prev) => {
                        if (!prev || prev.id !== next.id) return prev;

                        return {
                            ...prev,
                            ...next,
                            asked_by_name: bdNameMap[next.asked_by_bd_id] ?? "—",
                        };
                    });
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "DELETE",
                    schema: "public",
                    table: "approval_requests",
                },
                (payload) => {
                    const oldRow = payload.old as { id: string };
                    setRequests((prev) => prev.filter((item) => item.id !== oldRow.id));
                    setSelectedRequest((prev) => (prev?.id === oldRow.id ? null : prev));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [bdNameMap]);

    const mappedRequests = useMemo(() => {
        return requests.map((r, index) => ({
            ...r,
            asked_by_name: bdNameMap[r.asked_by_bd_id] ?? "—",
            request_code: formatRequestCode(index),
        }));
    }, [requests, bdNameMap]);

    const keyword = search.trim().toLowerCase();

    const pendingRequests = mappedRequests.filter((r) => {
        if (r.status !== "pending") return false;
        if (!keyword) return true;

        return (
            r.store_name.toLowerCase().includes(keyword) ||
            (r.user_note ?? "").toLowerCase().includes(keyword) ||
            (r.admin_note ?? "").toLowerCase().includes(keyword) ||
            (r.asked_by_name ?? "").toLowerCase().includes(keyword) ||
            (r.request_code ?? "").toLowerCase().includes(keyword)
        );
    });

    const archiveRequests = mappedRequests.filter((r) => {
        if (r.status === "pending") return false;
        if (archiveFilter !== "all" && r.status !== archiveFilter) return false;

        if (!keyword) return true;

        return (
            r.store_name.toLowerCase().includes(keyword) ||
            (r.user_note ?? "").toLowerCase().includes(keyword) ||
            (r.admin_note ?? "").toLowerCase().includes(keyword) ||
            (r.asked_by_name ?? "").toLowerCase().includes(keyword) ||
            (r.request_code ?? "").toLowerCase().includes(keyword)
        );
    });

    function openDetail(request: ApprovalRequestVM) {
        setSelectedRequest(request);
    }

    function getArchiveFilterClass(active: boolean) {
        return [
            "inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition",
            active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
        ].join(" ");
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="w-full max-w-[320px]">
                    <div className="grid w-full grid-cols-2 rounded-lg  bg-muted/30 p-1">
                        <button
                            type="button"
                            onClick={() => setViewTab("queue")}
                            className={[
                                "inline-flex h-10 w-full items-center justify-center rounded-md px-4 text-sm font-medium transition",
                                viewTab === "queue"
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground",
                            ].join(" ")}
                        >
                            Queue
                        </button>

                        <button
                            type="button"
                            onClick={() => setViewTab("archive")}
                            className={[
                                "inline-flex h-10 w-full items-center justify-center rounded-md px-4 text-sm font-medium transition",
                                viewTab === "archive"
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground",
                            ].join(" ")}
                        >
                            Recent History
                        </button>
                    </div>
                </div>

                <Button onClick={() => setCreateOpen(true)} className="ml-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    New Request
                </Button>
            </div>
            {viewTab === "queue" ? (
                <div className="overflow-hidden rounded-xl border bg-background/60">
                    <div className="grid min-h-[720px] lg:grid-cols-[320px_minmax(0,1fr)]">
                        <aside className="bg-muted/30">
                            <div className="p-4">
                                <div className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                    Pending Approvals ({pendingRequests.length})
                                </div>

                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search store, BD, note..."
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 px-3 pb-3">
                                {loading && (
                                    <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">
                                        Loading...
                                    </div>
                                )}

                                {!loading && pendingRequests.length === 0 && (
                                    <div className="p-2 text-sm text-muted-foreground">
                                        No pending request.
                                    </div>
                                )}

                                {pendingRequests.map((request) => {
                                    const active = selectedRequest?.id === request.id;

                                    return (
                                        <button
                                            key={request.id}
                                            type="button"
                                            onClick={() => openDetail(request)}
                                            className={`w-full rounded-2xl border bg-background p-4 text-left transition hover:border-primary/40 hover:shadow-sm ${active
                                                    ? "border-primary bg-primary/[0.03] ring-1 ring-primary/15"
                                                    : "border-border"
                                                }`}
                                        >
                                            <div className="flex gap-3">
                                                <div className="w-1 shrink-0 rounded-full bg-primary" />
                                                <div className="min-w-0 flex-1">
                                                    <div className="line-clamp-2 text-lg font-bold text-foreground">
                                                        {request.store_name}
                                                    </div>

                                                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                                                        <div className="font-medium text-foreground">
                                                            {request.asked_by_name ?? "—"}
                                                        </div>
                                                        <div>{formatRelativeTime(request.created_at)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </aside>

                        <section className="min-h-[720px] border-l border-border/60 bg-muted/10">
                            <ApprovalRequestDetailPanel
                                request={selectedRequest}
                                isAdmin={isAdmin}
                                bdMap={bdNameMap}
                                currentUserId={currentUserId}
                                pendingCount={pendingRequests.length}
                                onSaved={refresh}
                                onRequestChanged={(next) => {
                                    setRequests((prev) => upsertRequest(prev, next));
                                    setSelectedRequest({
                                        ...next,
                                        asked_by_name: bdNameMap[next.asked_by_bd_id] ?? "—",
                                    });
                                }}
                            />
                        </section>
                    </div>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border bg-background">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
                        <div className="relative w-full max-w-md">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search approved/reviewed requests..."
                                className="pl-9"
                            />
                        </div>

                        <div className="inline-flex items-center rounded-full border bg-background p-1">
                            <button
                                type="button"
                                onClick={() => setArchiveFilter("all")}
                                className={getArchiveFilterClass(archiveFilter === "all")}
                            >
                                All
                            </button>
                            <button
                                type="button"
                                onClick={() => setArchiveFilter("approved")}
                                className={getArchiveFilterClass(archiveFilter === "approved")}
                            >
                                Approved
                            </button>
                            <button
                                type="button"
                                onClick={() => setArchiveFilter("rejected")}
                                className={getArchiveFilterClass(archiveFilter === "rejected")}
                            >
                                Rejected
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-muted/40 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">BD Name</th>
                                    <th className="px-6 py-4">Store Name</th>
                                    <th className="px-6 py-4">Result</th>
                                    <th className="px-6 py-4">KPI Awarded</th>
                                    <th className="px-6 py-4">Bonus</th>
                                </tr>
                            </thead>

                            <tbody>
                                {archiveRequests.map((request) => (
                                    <tr key={request.id} className="border-t">
                                        <td className="px-6 py-4 font-medium text-foreground">
                                            {formatDate(
                                                request.reviewed_at ?? request.updated_at ?? request.created_at
                                            )}
                                        </td>
                                        <td className="px-6 py-4">{request.asked_by_name}</td>
                                        <td className="px-6 py-4">{request.store_name}</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-primary/10 text-primary">
                                                {request.status === "approved" ? (
                                                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                                ) : (
                                                    <CircleX className="mr-1 h-3.5 w-3.5" />
                                                )}
                                                {request.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-primary">
                                            {request.kpi_point_award != null ? `+${request.kpi_point_award}` : "0"}
                                        </td>
                                        <td className="px-6 py-4 font-medium">
                                            {request.bonus_amount != null ? request.bonus_amount : "0"}
                                        </td>
                                    </tr>
                                ))}

                                {!loading && archiveRequests.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                                            No archive records found.
                                        </td>
                                    </tr>
                                )}

                                {loading && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                                            Loading...
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <CreateApprovalRequestDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                onSaved={refresh}
            />
        </div>
    );
}