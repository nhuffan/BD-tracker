"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleX, Clock3 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ApprovalImage, ApprovalRequestVM } from "./utils/types";

const labelClass =
    "mb-2 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground";

const readonlyFieldClass =
    "rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm text-foreground";

function formatDate(value?: string | null) {
    if (!value) return "—";
    return new Date(value).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getImageUrl(item: ApprovalImage) {
    return item.secure_url || item.url || item.thumbnail_url || null;
}

export default function ApprovalRequestDetailPanel({
    request,
    isAdmin,
    bdMap,
    currentUserId,
    pendingCount,
    onSaved,
    onRequestChanged,
}: {
    request: ApprovalRequestVM | null;
    isAdmin: boolean;
    bdMap: Record<string, string>;
    currentUserId: string;
    pendingCount: number;
    onSaved: () => void;
    onRequestChanged: (request: ApprovalRequestVM) => void;
}) {
    const [adminNote, setAdminNote] = useState("");
    const [kpiPointAward, setKpiPointAward] = useState("");
    const [bonusAmount, setBonusAmount] = useState("");
    const [saving, setSaving] = useState(false);
    const [conflictMessage, setConflictMessage] = useState("");

    useEffect(() => {
        if (!request) return;

        setAdminNote(request.admin_note ?? "");
        setKpiPointAward(
            request.kpi_point_award != null ? String(request.kpi_point_award) : ""
        );
        setBonusAmount(
            request.bonus_amount != null ? String(request.bonus_amount) : ""
        );
        setConflictMessage("");
    }, [request]);

    useEffect(() => {
        if (!request?.id) return;

        const channel = supabase
            .channel(`approval-request-row:${request.id}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "approval_requests",
                    filter: `id=eq.${request.id}`,
                },
                (payload) => {
                    const next = payload.new as ApprovalRequestVM;

                    const nextVm: ApprovalRequestVM = {
                        ...request,
                        ...next,
                        asked_by_name: bdMap[next.asked_by_bd_id] ?? "—",
                    };

                    onRequestChanged(nextVm);
                    setConflictMessage("");
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [request, bdMap, onRequestChanged]);

    const images = useMemo(() => request?.images ?? [], [request]);

    if (!request) {
        return (
            <div className="flex h-full flex-col items-center justify-center px-10 py-12 text-center">
                <h2 className="text-4xl font-bold tracking-tight text-foreground">
                    Select a request to begin review
                </h2>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold tracking-wide">
                    <span className="text-primary">
                        {pendingCount} items awaiting review
                    </span>
                </div>
            </div>
        );
    }

    const isPending = request.status === "pending";

    async function handleReject() {
        const currentRequest = request;
        if (!currentRequest || !isAdmin || !isPending || saving) return;

        setSaving(true);
        try {
            const payload = {
                status: "rejected",
                admin_note: adminNote.trim() || null,
                rejected_by_user_id: currentUserId,
                reviewed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: (currentRequest.version ?? 1) + 1,
            };

            const { data, error } = await supabase
                .from("approval_requests")
                .update(payload)
                .eq("id", currentRequest.id)
                .eq("version", currentRequest.version ?? 1)
                .select("*");

            if (error) {
                setConflictMessage(error.message || "Failed to update request.");
                return;
            }

            if (!data || data.length === 0) {
                setConflictMessage(
                    "This request was updated by another admin. Please reload the latest data."
                );
                return;
            }

            onSaved();
        } finally {
            setSaving(false);
        }
    }

    async function handleApprove() {
        const currentRequest = request;
        if (!currentRequest || !isAdmin || !isPending || saving) return;

        if (!kpiPointAward.trim()) {
            alert("Please enter KPI Point Award.");
            return;
        }

        if (!bonusAmount.trim()) {
            alert("Please enter Bonus Amount.");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                status: "approved",
                admin_note: adminNote.trim() || null,
                approved_by_user_id: currentUserId,
                kpi_point_award: Number(kpiPointAward),
                bonus_amount: Number(bonusAmount),
                reviewed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: (currentRequest.version ?? 1) + 1,
            };

            const { data, error } = await supabase
                .from("approval_requests")
                .update(payload)
                .eq("id", currentRequest.id)
                .eq("version", currentRequest.version ?? 1)
                .select("*");

            if (error) {
                setConflictMessage(error.message || "Failed to update request.");
                return;
            }

            if (!data || data.length === 0) {
                setConflictMessage(
                    "This request was updated by another admin. Please reload the latest data."
                );
                return;
            }

            onSaved();
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="h-full overflow-y-auto bg-background">
            <div className="border-b px-6 py-5">
                <div className="text-2xl font-bold tracking-tight text-foreground">
                    {request.store_name}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span>BD: {bdMap[request.asked_by_bd_id] ?? "—"}</span>
                    <span>Created: {formatDate(request.created_at)}</span>
                    {request.reviewed_at && <span>Reviewed: {formatDate(request.reviewed_at)}</span>}
                </div>
            </div>

            <div className="grid gap-6 p-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-5">
                    <div>
                        <label className={labelClass}>BD Name</label>
                        <div className={readonlyFieldClass}>
                            {bdMap[request.asked_by_bd_id] ?? "—"}
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Store Name</label>
                        <div className={readonlyFieldClass}>{request.store_name}</div>
                    </div>

                    <div>
                        <label className={labelClass}>Description</label>
                        <div className={readonlyFieldClass}>
                            <div className="whitespace-pre-wrap break-all leading-7">
                                {request.user_note || "—"}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Attachments</label>
                        {images.length === 0 ? (
                            <div className="text-sm text-muted-foreground">No images uploaded.</div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {images.map((item) => {
                                    const openUrl = getImageUrl(item);
                                    if (!openUrl) return null;

                                    return (
                                        <a
                                            key={item.id}
                                            href={openUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block overflow-hidden rounded-xl border bg-muted"
                                        >
                                            <img
                                                src={item.thumbnail_url || openUrl}
                                                alt={item.name}
                                                className="h-40 w-full object-cover"
                                            />
                                        </a>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-5">
                    {conflictMessage && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            {conflictMessage}
                        </div>
                    )}

                    <div>
                        <label className={labelClass}>Status</label>
                        <div className={readonlyFieldClass}>{request.status}</div>
                    </div>

                    <div>
                        <label className={labelClass}>Admin Note</label>
                        {isAdmin && isPending ? (
                            <Textarea
                                value={adminNote}
                                onChange={(e) => setAdminNote(e.target.value)}
                                placeholder="Add note for approval or rejection..."
                                className="min-h-[120px]"
                            />
                        ) : (
                            <div className={readonlyFieldClass}>
                                <div className="whitespace-pre-wrap break-all leading-7">
                                    {request.admin_note || "—"}
                                </div>
                            </div>
                        )}
                    </div>

                    {(isAdmin && isPending) || request.status === "approved" ? (
                        <>
                            <div>
                                <label className={labelClass}>KPI Point Award</label>
                                {isAdmin && isPending ? (
                                    <Input
                                        type="number"
                                        value={kpiPointAward}
                                        onChange={(e) => setKpiPointAward(e.target.value)}
                                        placeholder="Enter KPI points"
                                    />
                                ) : (
                                    <div className={readonlyFieldClass}>
                                        {request.kpi_point_award ?? "—"}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className={labelClass}>Bonus Amount</label>
                                {isAdmin && isPending ? (
                                    <Input
                                        type="number"
                                        value={bonusAmount}
                                        onChange={(e) => setBonusAmount(e.target.value)}
                                        placeholder="Enter bonus amount"
                                    />
                                ) : (
                                    <div className={readonlyFieldClass}>
                                        {request.bonus_amount ?? "—"}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : null}

                    {isAdmin && isPending && (
                        <div className="flex items-center gap-3 pt-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={handleReject}
                                disabled={saving}
                            >
                                <CircleX className="mr-2 h-4 w-4" />
                                Reject
                            </Button>

                            <Button className="flex-1" onClick={handleApprove} disabled={saving}>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Approve
                            </Button>
                        </div>
                    )}

                    {!isPending && (
                        <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Clock3 className="h-4 w-4" />
                                This request has already been reviewed.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}