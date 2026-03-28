"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  Paperclip,
} from "lucide-react";
import { AttachmentIcon, isImageFile, isVideoFile } from "@/components/qa/utils/AttachmentIcon";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { QAPriority, QATicketVM, QATicketAttachment } from "../utils/types";

const fieldClass =
  "!h-11 h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm shadow-none";
const readonlyFieldClass =
  "rounded-lg border border-input bg-muted/60 px-3 py-2 text-sm text-foreground";
const infoFieldClass =
  "flex h-11 w-full min-w-0 items-center rounded-lg border border-input bg-muted/60 px-3 text-sm text-foreground";
const labelClass =
  "mb-2 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground";
const attachmentCardClass =
  "relative flex h-[72px] min-h-[72px] w-full min-w-0 items-center gap-3 overflow-hidden rounded-lg border border-input bg-background px-3 py-2 pr-[42px]";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTicketCode(ticket?: QATicketVM | null) {
  if (!ticket?.ticket_code) return "QA-TICKET";
  return ticket.ticket_code.replace("#", "");
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name?: string) {
  if (!name) return "—";

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function getPriorityLabel(priority?: QAPriority) {
  if (!priority) return "MEDIUM";
  return priority.toUpperCase();
}

function getPriorityBadgeClass(priority?: QAPriority) {
  switch (priority) {
    case "urgent":
      return "bg-destructive/10 text-destructive";
    case "high":
      return "bg-orange-100 text-orange-700";
    case "medium":
      return "bg-blue-50 text-blue-600";
    case "low":
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getAttachmentOpenUrl(item: QATicketAttachment) {
  const baseUrl = item.secure_url || item.url || null;
  if (!baseUrl) return null;

  const isPreviewable =
    isImageFile(item.type) || isVideoFile(item.type, item.name);

  if (isPreviewable) {
    return baseUrl;
  }

  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}fl_attachment=${encodeURIComponent(item.name)}`;
}

export default function QATicketDetailDialog({
  open,
  onOpenChange,
  ticket,
  isAdmin,
  bdMap,
  adminNameMap,
  currentUserId,
  onSaved,
  onTicketChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: QATicketVM | null;
  isAdmin: boolean;
  bdMap: Record<string, string>;
  adminNameMap?: Record<string, string>;
  currentUserId: string;
  onSaved: () => void;
  onTicketChanged: (ticket: QATicketVM) => void;
}) {
  const [priority, setPriority] = useState<QAPriority>("medium");
  const [adminAnswer, setAdminAnswer] = useState("");
  const [statusAction, setStatusAction] = useState<
    "active" | "in_progress" | "done" | "archive"
  >("active");
  const [additionalDescription, setAdditionalDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingUsers, setEditingUsers] = useState<
    Array<{
      userId: string;
      name: string;
      joinedAt: string;
      role: "admin" | "user";
    }>
  >([]);
  const [conflictMessage, setConflictMessage] = useState("");
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const currentAdminName = adminNameMap?.[currentUserId] ?? "Another admin";
  const requesterName = ticket ? bdMap[ticket.asked_by_bd_id] ?? "—" : "—";
  const attachments: QATicketAttachment[] = ticket?.attachments ?? [];
  const hasAttachments = attachments.length > 0;

  useEffect(() => {
    if (!open || !ticket) return;

    applyTicketToForm(ticket);
    setAdditionalDescription("");
  }, [ticket, open]);

  useEffect(() => {
    if (!open || !ticket?.id) return;

    const channel = supabase.channel(`qa-ticket:${ticket.id}`, {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{
          userId: string;
          name: string;
          joinedAt: string;
          role: "admin" | "user";
        }>();

        const users = Object.values(state)
          .flat()
          .map((item) => ({
            userId: item.userId,
            name: item.name,
            joinedAt: item.joinedAt,
            role: item.role,
          }))
          .filter((item, index, arr) => {
            return arr.findIndex((x) => x.userId === item.userId) === index;
          });

        setEditingUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId: currentUserId,
            name: isAdmin ? currentAdminName : requesterName,
            joinedAt: new Date().toISOString(),
            role: isAdmin ? "admin" : "user",
          });
        }
      });

    return () => {
      setEditingUsers([]);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [open, ticket?.id, currentUserId, currentAdminName, requesterName, isAdmin]);

  useEffect(() => {
    if (!open || !ticket?.id) return;

    const channel = supabase
      .channel(`qa-ticket-row:${ticket.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "qa_tickets",
          filter: `id=eq.${ticket.id}`,
        },
        (payload) => {
          const next = payload.new as QATicketVM;

          const nextVm: QATicketVM = {
            ...ticket,
            ...next,
            asked_by_name: bdMap[next.asked_by_bd_id] ?? "—",
          };

          onTicketChanged(nextVm);

          setConflictMessage("");
          applyTicketToForm(nextVm);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, ticket?.id, bdMap, onTicketChanged]);

  useEffect(() => {
    setConflictMessage("");
  }, [ticket?.id, open]);

  const originalStatusAction = useMemo<
    "active" | "in_progress" | "done" | "archive"
  >(() => {
    if (!ticket) return "active";
    if (ticket.is_archived) return "archive";
    if (ticket.is_done) return "done";
    if (ticket.is_in_progress) return "in_progress";
    return "active";
  }, [ticket]);

  const trimmedAdminAnswer = adminAnswer.trim();
  const originalAdminAnswer = (ticket?.admin_answer ?? "").trim();

  const hasAdminChanges = useMemo(() => {
    if (!ticket) return false;

    return (
      priority !== ticket.priority ||
      trimmedAdminAnswer !== originalAdminAnswer ||
      statusAction !== originalStatusAction
    );
  }, [
    ticket,
    priority,
    trimmedAdminAnswer,
    originalAdminAnswer,
    statusAction,
    originalStatusAction,
  ]);

  const hasNonAdminChanges = useMemo(() => {
    return additionalDescription.trim().length > 0;
  }, [additionalDescription]);

  if (!ticket) return null;

  const isDisabledSave = isAdmin
    ? saving || !hasAdminChanges
    : saving || !hasNonAdminChanges;

  const sortedEditors = [...editingUsers].sort(
    (a, b) =>
      new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
  );

  const adminEditors = sortedEditors.filter((user) => user.role === "admin");
  const activeAdminEditor = adminEditors[0] ?? null;
  const isCurrentUserActiveAdmin = activeAdminEditor?.userId === currentUserId;

  const lockedByOtherAdmin = !!activeAdminEditor && !isCurrentUserActiveAdmin;
  const lockOwnerLabel = activeAdminEditor?.name ?? "Another admin";

  const progressValue =
    statusAction === "done" || statusAction === "archive"
      ? 100
      : statusAction === "in_progress"
        ? 50
        : 0;

  function renderIssueDetail(content?: string | null) {
    if (!content) return "—";

    const lines = content.split("\n");

    return lines.map((line, index) => {
      const isAdditionalHeader =
        /^--- Additional description \(.+\) by .+ ---$/.test(line.trim());

      if (isAdditionalHeader) {
        return (
          <div key={index} className="font-bold text-foreground">
            {line}
          </div>
        );
      }

      if (!line.trim()) {
        return <div key={index} className="h-4" />;
      }

      return <div key={index}>{line}</div>;
    });
  }

  function applyTicketToForm(nextTicket: QATicketVM) {
    setPriority(nextTicket.priority);
    setAdminAnswer(nextTicket.admin_answer ?? "");

    if (nextTicket.is_archived) {
      setStatusAction("archive");
    } else if (nextTicket.is_done) {
      setStatusAction("done");
    } else if (nextTicket.is_in_progress) {
      setStatusAction("in_progress");
    } else {
      setStatusAction("active");
    }
  }

  async function handleSave() {
    if (!ticket || isDisabledSave || lockedByOtherAdmin) return;

    setSaving(true);
    setConflictMessage("");

    try {
      if (isAdmin) {
        const now = new Date().toISOString();

        const nextIsDone = statusAction === "done";
        const nextIsArchived = statusAction === "archive";
        const nextIsInProgress = statusAction === "in_progress";

        const movedToDone =
          statusAction === "done" && originalStatusAction !== "done";
        const movedToArchive =
          statusAction === "archive" && originalStatusAction !== "archive";
        const movedToInProgress =
          statusAction === "in_progress" && originalStatusAction !== "in_progress";

        const statusChanged = statusAction !== originalStatusAction;

        const payload: Record<string, unknown> = {
          priority,
          admin_answer: trimmedAdminAnswer || null,
          is_done: nextIsDone,
          is_archived: nextIsArchived,
          is_in_progress: nextIsInProgress,
          answered_by_user_id: trimmedAdminAnswer ? currentUserId : null,
          updated_by_user_id: currentUserId,
          status_updated_by_user_id: statusChanged ? currentUserId : ticket.status_updated_by_user_id ?? null,
          updated_at: now,
          version: (ticket.version ?? 1) + 1,

          in_progress_at: nextIsInProgress
            ? movedToInProgress
              ? now
              : ticket.in_progress_at
            : null,

          done_at: nextIsDone
            ? movedToDone
              ? now
              : ticket.done_at
            : null,

          archived_at: nextIsArchived
            ? movedToArchive
              ? now
              : ticket.archived_at
            : null,
        };

        const { data, error } = await supabase
          .from("qa_tickets")
          .update(payload)
          .eq("id", ticket.id)
          .eq("version", ticket.version ?? 1)
          .select("*");

        if (error) {
          console.error("Failed to update qa ticket:", error);
          return;
        }

        if (!data || data.length === 0) {
          setConflictMessage(
            "This ticket was updated by another admin. Please reopen it to load the latest data."
          );
          return;
        }
      } else {
        const extra = additionalDescription.trim();
        if (!extra) return;

        const now = new Date();

        const timeLabel = now.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        const mergedIssueDetail = [
          ticket.issue_detail?.trim() || "",
          "",
          `--- Additional description (${timeLabel}) by ${requesterName} ---`,
          "",
          extra,
        ]
          .filter(Boolean)
          .join("\n");

        const { data, error } = await supabase
          .from("qa_tickets")
          .update({
            issue_detail: mergedIssueDetail,
            updated_at: new Date().toISOString(),
            updated_by_user_id: currentUserId,
            version: (ticket.version ?? 1) + 1,
          })
          .eq("id", ticket.id)
          .eq("version", ticket.version ?? 1)
          .select("*");

        if (error) {
          console.error("Failed to append issue detail:", error);
          setConflictMessage(
            "This ticket was updated by an admin. Please reopen it to load the latest data."
          );
          return;
        }
        if (!data || data.length === 0) {
          setConflictMessage(
            "This ticket was updated by another admin. Please reopen it to load the latest data."
          );
          return;
        }
      }

      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] w-[66vw] max-w-none min-w-[900px] flex-col overflow-hidden rounded-xl border bg-background p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{ticket.title}</DialogTitle>

        <div className="border-b px-6 py-4">
          <div className="min-w-0">

            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${getPriorityBadgeClass(
                  priority
                )}`}
              >
                {getPriorityLabel(priority)}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                · {formatTicketCode(ticket)}
              </span>
            </div>

            {lockedByOtherAdmin && (
              <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <CircleDashed className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <div className="text-sm font-semibold text-amber-900">
                    Admin {lockOwnerLabel} is currently editing this ticket.
                  </div>
                  <div className="mt-0.5 text-sm text-amber-800">
                    Some fields are temporarily locked.
                  </div>
                </div>
              </div>
            )}

            {conflictMessage && (
              <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
                {conflictMessage}
              </div>
            )}

            <h2 className="break-words text-2xl font-bold leading-tight tracking-tight text-foreground">
              {ticket.title}
            </h2>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-stretch">
            <div className="min-w-0">
              <div className={labelClass}>Requester</div>
              <div className={`${infoFieldClass} gap-3`}>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                  {getInitials(requesterName)}
                </div>
                <span className="truncate font-medium">{requesterName}</span>
              </div>
            </div>

            <div className="min-w-0">
              <div className={labelClass}>Priority</div>

              {isAdmin ? (
                <Select
                  value={priority}
                  onValueChange={(value) => setPriority(value as QAPriority)}
                  disabled={lockedByOtherAdmin}
                >
                  <SelectTrigger className={fieldClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className={infoFieldClass}>
                  {ticket.priority.charAt(0).toUpperCase() +
                    ticket.priority.slice(1)}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className={labelClass}>Date Created</div>
              <div className={`${infoFieldClass} gap-2`}>
                <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{formatDate(ticket.created_at)}</span>
              </div>
            </div>
          </div>

          <div>
            <div className={labelClass}>Issue Description</div>

            <div className={readonlyFieldClass}>
              <div className="whitespace-pre-wrap break-all leading-7">
                {renderIssueDetail(ticket.issue_detail)}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">

              <div className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Attachments
              </div>
              <Paperclip className="h-4 w-4 text-muted-foreground" />
            </div>

            {hasAttachments ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {attachments.map((item) => {
                  const isImage = isImageFile(item.type);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        const targetUrl = getAttachmentOpenUrl(item);
                        if (targetUrl) {
                          window.open(targetUrl, "_blank", "noopener,noreferrer");
                        }
                      }}
                      className={`${attachmentCardClass} group cursor-pointer text-left transition-all duration-150 hover:border-primary/40 hover:bg-muted/50 hover:shadow-sm active:scale-[0.98]`}
                      title={item.name}
                    >
                      {isImage && (item.thumbnail_url || item.secure_url) ? (
                        <img
                          src={item.thumbnail_url || item.secure_url}
                          alt={item.name}
                          className="h-10 w-10 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <AttachmentIcon type={item.type} name={item.name} />
                      )}

                      <div className="min-w-0 flex-1 overflow-hidden pr-2">
                        <div className="truncate text-sm font-medium text-foreground">
                          {item.name}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatFileSize(item.size)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-primary">
                None
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Admin Response
              </div>

              {isAdmin && lockedByOtherAdmin && (
                <div className="text-[10px] font-medium uppercase tracking-wide text-amber-700">
                  Locked by {lockOwnerLabel}
                </div>
              )}
            </div>

            {isAdmin ? (
              <div className="space-y-2">
                <Textarea
                  value={adminAnswer}
                  onChange={(e) => setAdminAnswer(e.target.value)}
                  placeholder={
                    lockedByOtherAdmin
                      ? `Locked by ${lockOwnerLabel}`
                      : "Type your response here..."
                  }
                  wrap="soft"
                  disabled={lockedByOtherAdmin}
                  className={`min-h-[112px] resize-none break-all whitespace-pre-wrap leading-7 ${lockedByOtherAdmin
                    ? "cursor-not-allowed border-amber-200 bg-amber-50 text-muted-foreground opacity-100"
                    : ""
                    }`}
                />
              </div>
            ) : (
              <div className={readonlyFieldClass}>
                <div className="whitespace-pre-wrap break-all leading-7">
                  {ticket.admin_answer || "No answer yet"}
                </div>
              </div>
            )}
          </div>

          {!isAdmin && (
            <div>
              <div className="mb-2 flex items-end justify-between">
                <div className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Additional Description
                </div>

                {lockedByOtherAdmin && (
                  <div className="text-[10px] font-medium uppercase tracking-wide text-amber-700">
                    Locked by {lockOwnerLabel}
                  </div>
                )}
              </div>

              <Textarea
                value={additionalDescription}
                onChange={(e) => setAdditionalDescription(e.target.value)}
                placeholder={
                  lockedByOtherAdmin
                    ? `Locked by ${lockOwnerLabel}`
                    : "Add more details to help clarify your issue..."
                }
                wrap="soft"
                disabled={lockedByOtherAdmin}
                className={`min-h-[112px] resize-none break-all whitespace-pre-wrap leading-7 ${lockedByOtherAdmin
                  ? "cursor-not-allowed border-amber-200 bg-amber-50 text-muted-foreground opacity-100"
                  : ""
                  }`}
              />
            </div>
          )}

          {isAdmin && (
            <div className="space-y-3">
              <div>
                <div className={labelClass}>Progress</div>

                <div className="space-y-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-200"
                      style={{ width: `${progressValue}%` }}
                    />
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">
                    {progressValue}% complete
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={lockedByOtherAdmin}
                  className={`h-10 rounded-md border border-input bg-background text-sm font-medium shadow-none ${statusAction === "done"
                    ? "border-primary bg-primary/10 text-primary opacity-100"
                    : lockedByOtherAdmin
                      ? "cursor-not-allowed text-muted-foreground opacity-60"
                      : "cursor-pointer text-foreground hover:bg-muted/50"
                    }`}
                  onClick={() =>
                    setStatusAction((prev) => (prev === "done" ? "active" : "done"))
                  }
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Done
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={lockedByOtherAdmin}
                  className={`h-10 rounded-md border border-input bg-background text-sm font-medium shadow-none ${statusAction === "in_progress"
                    ? "border-primary bg-primary/10 text-primary opacity-100"
                    : lockedByOtherAdmin
                      ? "cursor-not-allowed text-muted-foreground opacity-60"
                      : "cursor-pointer text-foreground hover:bg-muted/50"
                    }`}
                  onClick={() =>
                    setStatusAction((prev) =>
                      prev === "in_progress" ? "active" : "in_progress"
                    )
                  }
                >
                  <CircleDashed className="mr-2 h-4 w-4" />
                  In Progress
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={lockedByOtherAdmin}
                  className={`h-10 rounded-md border border-input bg-background text-sm font-medium shadow-none ${statusAction === "archive"
                    ? "border-primary bg-primary/10 text-primary opacity-100"
                    : lockedByOtherAdmin
                      ? "cursor-not-allowed text-muted-foreground opacity-60"
                      : "cursor-pointer text-foreground hover:bg-muted/50"
                    }`}
                  onClick={() =>
                    setStatusAction((prev) => (prev === "archive" ? "active" : "archive"))
                  }
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t bg-muted/30 px-6 py-4">
          <Button
            className="h-11 w-full rounded-lg cursor-pointer"
            onClick={handleSave}
            disabled={isDisabledSave || lockedByOtherAdmin}
          >
            {saving
              ? isAdmin
                ? "Updating..."
                : "Submitting..."
              : "Update Ticket"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}