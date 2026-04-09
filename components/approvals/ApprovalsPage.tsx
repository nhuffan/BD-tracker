"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleX,
  Plus,
  Search,
  Pencil,
  Trash2,
  Clock3,
  History,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMasters } from "@/lib/useMasters";
import type { ApprovalRequest, ApprovalRequestVM, ApprovalImage } from "./utils/types";
import CreateApprovalRequestDialog from "./ApprovalRequestDialog";
import ApprovalRequestDetailPanel from "./ApprovalRequestPanel";
import { AttachmentIcon, isImageFile } from "@/components/qa/utils/AttachmentIcon";
import {
  formatFileSize,
  truncateMiddleFileName,
} from "@/components/qa/utils/attachmentHelpers";
import { FileText } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ApprovalViewTab = "pending" | "archive";
type ArchiveFilter = "all" | "pending" | "approved" | "rejected";

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

function formatNumber(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-US");
}

function getInitials(name?: string) {
  if (!name) return "—";

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function upsertRequest(list: ApprovalRequest[], next: ApprovalRequest) {
  const index = list.findIndex((item) => item.id === next.id);
  if (index === -1) return [next, ...list];

  const clone = [...list];
  clone[index] = next;
  return clone;
}

function getResultBadgeClass(status: ApprovalRequest["status"]) {
  if (status === "approved") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200";
  }

  if (status === "rejected") {
    return "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200";
  }

  if (status === "pending") {
    return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200";
  }

  return "bg-muted text-muted-foreground";
}

function getArchiveTabClass(active: boolean) {
  return [
    "rounded-md px-3 py-1.5 text-xs font-semibold transition cursor-pointer",
    active
      ? "bg-primary/10 text-primary"
      : "text-slate-500 hover:bg-slate-100",
  ].join(" ");
}

function getAttachmentOpenUrl(item: ApprovalImage) {
  const baseUrl = item.secure_url || item.url || item.thumbnail_url || null;
  if (!baseUrl) return null;

  if (isImageFile(item.type || "")) {
    return baseUrl;
  }

  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}fl_attachment=${encodeURIComponent(item.name)}`;
}

function getTopTabClass(active: boolean) {
  return [
    "group inline-flex h-12 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition cursor-pointer whitespace-nowrap",
    active
      ? "bg-background text-foreground shadow-sm ring-1 ring-border"
      : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
  ].join(" ");
}

function getTopTabIconClass(active: boolean) {
  return active
    ? "text-primary"
    : "text-muted-foreground group-hover:text-foreground";
}

function AttachmentPreviewCell({
  attachments,
}: {
  attachments?: ApprovalImage[] | null;
}) {
  const items = attachments ?? [];
  const previewItems = items
    .filter((item) => getAttachmentOpenUrl(item))
    .slice(0, 4);

  if (previewItems.length === 0) {
    return (
      <div className="flex h-[116px] w-[360px] items-center justify-start text-sm text-muted-foreground">
        —
      </div>
    );
  }

  const isSingleRow = previewItems.length <= 2;

  return (
    <div
      className={[
        "w-[360px] h-[116px] overflow-hidden",
        isSingleRow ? "flex items-center" : "block",
      ].join(" ")}
    >
      <div className="grid w-full grid-cols-2 gap-2">
        {previewItems.map((item) => {
          const openUrl = getAttachmentOpenUrl(item);
          const image = isImageFile(item.type || "");

          if (!openUrl) return null;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                window.open(openUrl, "_blank", "noopener,noreferrer")
              }
              className="flex h-[54px] w-full items-center gap-2 overflow-hidden rounded-lg border bg-background px-2.5 py-2 text-left transition hover:border-primary/40 hover:bg-muted/40"
              title={item.name}
            >
              {image ? (
                <img
                  src={item.thumbnail_url || item.secure_url || item.url || openUrl}
                  alt={item.name}
                  className="h-9 w-9 shrink-0 rounded-md object-cover"
                />
              ) : (
                <AttachmentIcon
                  type={item.type || ""}
                  name={item.name}
                  className="h-9 w-9 shrink-0"
                />
              )}

              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-foreground">
                  {truncateMiddleFileName(item.name, 14)}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatFileSize(item.size ?? 0)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
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
  const [viewTab, setViewTab] = useState<ApprovalViewTab>(
    isAdmin ? "pending" : "archive"
  );
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequestVM | null>(null);
  const [editingRequest, setEditingRequest] = useState<ApprovalRequestVM | null>(null);

  const { items: bdList, loading: bdLoading } = useMasters("bd");

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
    setViewTab(isAdmin ? "pending" : "archive");
  }, [isAdmin]);

  function openEditRequest(request: ApprovalRequestVM) {
    setEditingRequest(request);
    setCreateOpen(true);
  }

  async function handleDeleteRequest(id: string) {
    const ok = window.confirm("Are you sure you want to delete this request?");
    if (!ok) return;

    const { error } = await supabase
      .from("approval_requests")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Failed to delete approval request:", error);
      alert("Failed to delete request.");
      return;
    }

    setSelectedRequest((prev) => (prev?.id === id ? null : prev));
    await refresh();
  }

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
            if (next.status !== "pending") return null;

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
    setSelectedRequest((prev) => {
      if (prev?.id === request.id) return null;
      return request;
    });
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="min-w-0">
            {isAdmin ? (
              <div className="w-full max-w-[520px]">
                <div className="flex items-center gap-6 border-b">
                  <button
                    type="button"
                    onClick={() => setViewTab("pending")}
                    className={[
                      "inline-flex h-12 items-center gap-2 border-b-2 px-1 text-sm font-semibold transition",
                      viewTab === "pending"
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    <Clock3
                      className={[
                        "h-4 w-4 shrink-0",
                        viewTab === "pending" ? "text-primary" : "text-muted-foreground",
                      ].join(" ")}
                    />
                    <span>Pending Review</span>
                    <span
                      className={[
                        "ml-1 inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold",
                        viewTab === "pending"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                      ].join(" ")}
                    >
                      {pendingRequests.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewTab("archive")}
                    className={[
                      "inline-flex h-12 items-center gap-2 border-b-2 px-1 text-sm font-semibold transition",
                      viewTab === "archive"
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    <History
                      className={[
                        "h-4 w-4 shrink-0",
                        viewTab === "archive" ? "text-primary" : "text-muted-foreground",
                      ].join(" ")}
                    />
                    <span>Recent History</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-[30px] font-extrabold tracking-tight text-slate-950">
                  Recent History
                </h1>
              </div>
            )}
          </div>

          <div className="flex-1" />

          <Button
            onClick={() => setCreateOpen(true)}
            className="h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </div>

        {isAdmin && viewTab === "pending" ? (
          <div className="overflow-hidden rounded-2xl bg-muted/10">
            <div className="grid lg:grid-cols-[360px_minmax(0,1fr)] bg-muted/10">
              <aside className="bg-muted/10">
                <div className="p-4">
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

                <div className="space-y-3 pl-3 pr-3 pb-3">
                  {(loading || bdLoading) && (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}

                  {!loading && !bdLoading && pendingRequests.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground">
                      No pending request.
                    </div>
                  )}

                  {!loading && !bdLoading && pendingRequests.map((request) => {
                    const active = selectedRequest?.id === request.id;

                    return (
                      <div
                        key={request.id}
                        className={active ? "-mr-3 relative z-20" : ""}
                      >

                        <button
                          type="button"
                          onClick={() => openDetail(request)}
                          className={[
                            "w-full p-4 text-left transition hover:border-primary/40 hover:shadow-sm",
                            active
                              ? "rounded-l-2xl rounded-r-none border border-r-0 border-border bg-primary/[0.03]"
                              : "rounded-2xl border border-border bg-background"
                          ].join(" ")}
                        >

                          <div className="flex gap-3">
                            <div className="w-1 shrink-0 rounded-full bg-primary" />

                            <div className="min-w-0 flex-1">
                              <div className="line-clamp-2 text-lg font-bold text-foreground">
                                {request.store_name}
                              </div>

                              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                                  {getInitials(request.asked_by_name)}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-medium text-foreground">
                                    {request.asked_by_name ?? "—"}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-2 text-sm text-muted-foreground">
                                {formatRelativeTime(request.created_at)}
                              </div>
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </aside>

              <section
                className={[
                  "relative h-fit overflow-hidden transition-all",
                  selectedRequest
                    ? "rounded-2xl border border-l-0 border-border bg-muted/20"
                    : "bg-transparent",
                ].join(" ")}
              >

                <ApprovalRequestDetailPanel
                  request={selectedRequest}
                  isAdmin={isAdmin}
                  bdMap={bdNameMap}
                  currentUserId={currentUserId}
                  pendingCount={pendingRequests.length}
                  onSaved={async () => {
                    setSelectedRequest(null);
                    await refresh();
                  }}
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
          <div className="rounded-xl border overflow-hidden">
            <div className="flex flex-col gap-3 border-b p-2 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-[320px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search requests..."
                  className="h-9 pl-9"
                />
              </div>

              <div className="flex items-center gap-2 sm:ml-2">
                <button
                  type="button"
                  onClick={() => setArchiveFilter("all")}
                  className={getArchiveTabClass(archiveFilter === "all")}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setArchiveFilter("pending")}
                  className={getArchiveTabClass(archiveFilter === "pending")}
                >
                  Pending
                </button>
                <button
                  type="button"
                  onClick={() => setArchiveFilter("approved")}
                  className={getArchiveTabClass(archiveFilter === "approved")}
                >
                  Approved
                </button>
                <button
                  type="button"
                  onClick={() => setArchiveFilter("rejected")}
                  className={getArchiveTabClass(archiveFilter === "rejected")}
                >
                  Rejected
                </button>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full table-fixed text-sm">
                <thead className="sticky top-0 z-10 border-b bg-muted/90 shadow-sm backdrop-blur">
                  <tr>
                    <th className="w-[120px] p-2 text-left text-sm font-semibold text-foreground">
                      Created At
                    </th>
                    <th className="w-[100px] p-2 text-left text-sm font-semibold text-foreground">
                      BD Name
                    </th>
                    <th className="w-[180px] p-2 text-left text-sm font-semibold text-foreground">
                      Store Name
                    </th>
                    <th className="w-[360px] p-2 text-left text-sm font-semibold text-foreground">
                      Attachments
                    </th>
                    <th className="w-[120px] p-2 text-left text-sm font-semibold text-foreground">
                      Status
                    </th>
                    <th className="w-[120px] p-2 text-left text-sm font-semibold text-foreground">
                      KPI Awarded
                    </th>
                    <th className="w-[120px] p-2 text-left text-sm font-semibold text-foreground">
                      Bonus
                    </th>
                    <th className="w-[110px] p-2 text-left text-sm font-semibold text-foreground">
                      Admin Remark
                    </th>
                    {isAdmin && (
                      <th className="w-[100px] p-2 text-right text-sm font-semibold text-foreground">
                        Action
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {archiveRequests.map((request) => (
                    <tr
                      key={request.id}
                      className="border-t odd:bg-muted/40 even:bg-background transition-colors"
                    >
                      <td className="p-2 text-foreground">
                        {formatDate(
                          request.reviewed_at ?? request.updated_at ?? request.created_at
                        )}
                      </td>

                      <td className="p-2 text-foreground">
                        {request.asked_by_name}
                      </td>

                      <td className="p-2 text-foreground">
                        {request.store_name}
                      </td>

                      <td className="p-2 align-middle">
                        <AttachmentPreviewCell attachments={request.images} />
                      </td>

                      <td className="p-2 align-middle">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                            getResultBadgeClass(request.status),
                          ].join(" ")}
                        >
                          {request.status === "approved" ? (
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          ) : request.status === "rejected" ? (
                            <CircleX className="mr-1 h-3.5 w-3.5" />
                          ) : (
                            <Clock3 className="mr-1 h-3.5 w-3.5" />
                          )}
                          {request.status}
                        </span>
                      </td>

                      <td className="p-2 text-foreground">
                        {formatNumber(request.kpi_point_award)}
                      </td>

                      <td className="p-2 text-foreground">
                        {formatNumber(request.bonus_amount)}
                      </td>

                      <td className="p-2 text-left align-middle">
                        {request.admin_note?.trim() ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center justify-center rounded-md p-1 hover:bg-muted"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              </button>
                            </TooltipTrigger>

                            <TooltipContent className="max-w-xs whitespace-normal break-words">
                              {request.admin_note}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {isAdmin && (
                        <td className="p-2 text-right">
                          <div className="inline-flex items-center gap-2">
                            {request.status !== "pending" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 cursor-pointer"
                                onClick={() => openEditRequest(request)}
                              >
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            )}

                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 cursor-pointer"
                              onClick={() => handleDeleteRequest(request.id)}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}

                  {!loading && archiveRequests.length === 0 && (
                    <tr>
                      <td
                        colSpan={isAdmin ? 9 : 8}
                        className="p-5 text-sm text-muted-foreground"
                      >
                        No records found.
                      </td>
                    </tr>
                  )}

                  {(loading || bdLoading) && (
                    <tr>
                      <td
                        colSpan={isAdmin ? 9 : 8}
                        className="p-5 text-center"
                      >
                        <Loader2 className="inline-block h-5 w-5 animate-spin text-muted-foreground" />
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
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) setEditingRequest(null);
          }}
          request={editingRequest}
          onSaved={async () => {
            setEditingRequest(null);
            await refresh();
          }}
        />
      </div>
    </TooltipProvider>
  );
}