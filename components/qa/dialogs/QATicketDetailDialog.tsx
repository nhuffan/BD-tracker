"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, CalendarDays, CheckCircle2 } from "lucide-react";
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
import type { QAPriority, QATicketVM } from "../types";

const fieldClass =
  "!h-11 h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm shadow-none";
const readonlyFieldClass =
  "rounded-lg border border-input bg-muted/60 px-3 py-2 text-sm text-foreground";
const infoFieldClass =
  "flex h-11 w-full min-w-0 items-center rounded-lg border border-input bg-muted/60 px-3 text-sm text-foreground";
const labelClass =
  "mb-2 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground";

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

export default function QATicketDetailDialog({
  open,
  onOpenChange,
  ticket,
  isAdmin,
  bdMap,
  currentUserId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: QATicketVM | null;
  isAdmin: boolean;
  bdMap: Record<string, string>;
  currentUserId: string;
  onSaved: () => void;
}) {
  const [priority, setPriority] = useState<QAPriority>("medium");
  const [adminAnswer, setAdminAnswer] = useState("");
  const [statusAction, setStatusAction] = useState<"active" | "done" | "archive">("active");
  const [additionalDescription, setAdditionalDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const titleWrapperRef = useRef<HTMLDivElement | null>(null);
  const titlePopoverRef = useRef<HTMLDivElement | null>(null);
  const [showFullTitle, setShowFullTitle] = useState(false);
  const [isTitleOverflowing, setIsTitleOverflowing] = useState(false);

  useEffect(() => {
    if (!ticket) return;
    setPriority(ticket.priority);

    setAdminAnswer(ticket.admin_answer ?? "");
    setAdditionalDescription("");
    setShowFullTitle(false);
    setIsTitleOverflowing(false);

    if (ticket.is_archived) {
      setStatusAction("archive");
    } else if (ticket.is_done) {
      setStatusAction("done");
    } else {
      setStatusAction("active");
    }
  }, [ticket]);

  useEffect(() => {
    if (!open) return;

    let frame1 = 0;
    let frame2 = 0;

    const checkTitleOverflow = () => {
      const el = titleRef.current;
      if (!el) return;
      setIsTitleOverflowing(el.scrollHeight > el.clientHeight + 1);
    };

    frame1 = window.requestAnimationFrame(() => {
      frame2 = window.requestAnimationFrame(() => {
        checkTitleOverflow();
      });
    });

    const observer = new ResizeObserver(() => {
      checkTitleOverflow();
    });

    if (titleRef.current) {
      observer.observe(titleRef.current);
    }

    window.addEventListener("resize", checkTitleOverflow);

    return () => {
      window.cancelAnimationFrame(frame1);
      window.cancelAnimationFrame(frame2);
      observer.disconnect();
      window.removeEventListener("resize", checkTitleOverflow);
    };
  }, [ticket?.title, open]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!showFullTitle) return;

      const target = event.target as Node;
      if (
        titleWrapperRef.current?.contains(target) ||
        titlePopoverRef.current?.contains(target)
      ) {
        return;
      }

      setShowFullTitle(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFullTitle]);

  const originalStatusAction = useMemo<"active" | "done" | "archive">(() => {
    if (!ticket) return "active";
    if (ticket.is_archived) return "archive";
    if (ticket.is_done) return "done";
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

  const requesterName = bdMap[ticket.asked_by_bd_id] ?? "—";

  const isDisabledSave = isAdmin
    ? saving || !hasAdminChanges
    : saving || !hasNonAdminChanges;

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

  async function handleSave() {
    if (!ticket || isDisabledSave) return;

    setSaving(true);
    try {
      if (isAdmin) {
        const payload: Record<string, unknown> = {
          priority,
          admin_answer: trimmedAdminAnswer || null,
          is_done: statusAction === "done",
          is_archived: statusAction === "archive",
          answered_by_user_id: trimmedAdminAnswer ? currentUserId : null,
          updated_at: new Date().toISOString(),
          done_at: statusAction === "done" ? new Date().toISOString() : null,
        };

        const { error } = await supabase
          .from("qa_tickets")
          .update(payload)
          .eq("id", ticket.id);

        if (error) {
          console.error("Failed to update qa ticket:", error);
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

        const { error } = await supabase
          .from("qa_tickets")
          .update({
            issue_detail: mergedIssueDetail,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ticket.id);

        if (error) {
          console.error("Failed to append issue detail:", error);
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
        className="w-[66vw] max-w-none min-w-[900px] overflow-hidden rounded-xl border bg-background p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{ticket.title}</DialogTitle>

        <div className="flex items-start justify-between border-b px-6 py-5">
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

            <div ref={titleWrapperRef} className="relative max-w-full">
              <div className="flex max-w-full items-end gap-1">
                <h2
                  ref={titleRef}
                  className="min-w-0 flex-1 line-clamp-1 break-all text-2xl font-bold leading-tight tracking-tight text-foreground"
                >
                  {ticket.title}
                </h2>

                {isTitleOverflowing && (
                  <button
                    type="button"
                    className="shrink-0 text-sm font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700"
                    onClick={() => setShowFullTitle(true)}
                  >
                    view more
                  </button>
                )}
              </div>

              {showFullTitle && (
                <>
                  <div
                    className="fixed inset-0 z-10 bg-black/10"
                    onClick={() => setShowFullTitle(false)}
                  />

                  <div
                    ref={titlePopoverRef}
                    className="absolute left-0 top-full z-20 mt-2 w-full max-w-[720px] rounded-xl border border-input bg-background p-4 shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="max-h-[240px] overflow-y-auto whitespace-pre-wrap break-all text-base font-semibold leading-7 text-foreground">
                      {ticket.title}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6">
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
              <div
                className="max-h-28 overflow-y-auto whitespace-pre-wrap break-all leading-7"
                style={{ scrollbarGutter: "stable" }}
              >
                {renderIssueDetail(ticket.issue_detail)}
              </div>
            </div>
          </div>

          <div>
            <div className={labelClass}>Admin Response</div>

            {isAdmin ? (
              <Textarea
                value={adminAnswer}
                onChange={(e) => setAdminAnswer(e.target.value)}
                placeholder="Type your response here..."
                wrap="soft"
                className="h-28 max-h-28 resize-none overflow-y-auto break-all whitespace-pre-wrap leading-7"
              />
            ) : (
              <div className={readonlyFieldClass}>
                <div
                  className="max-h-28 overflow-y-auto whitespace-pre-wrap break-all leading-7"
                  style={{ scrollbarGutter: "stable" }}
                >
                  {ticket.admin_answer || "No answer yet"}
                </div>
              </div>
            )}
          </div>

          {!isAdmin && (
            <div>
              <div className={labelClass}>Additional Description</div>
              <Textarea
                value={additionalDescription}
                onChange={(e) => setAdditionalDescription(e.target.value)}
                placeholder="Add more details to help clarify your issue..."
                wrap="soft"
                className="h-28 max-h-28 resize-none overflow-y-auto break-all whitespace-pre-wrap leading-7"
              />
            </div>
          )}

          {isAdmin && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className={`h-10 flex-1 rounded-md border border-input bg-background text-sm font-medium shadow-none cursor-pointer ${statusAction === "done"
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted/50"
                  }`}
                onClick={() =>
                  setStatusAction((prev) => (prev === "done" ? "active" : "done"))
                }
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Mark as Done
              </Button>

              <Button
                type="button"
                variant="outline"
                className={`h-10 flex-1 rounded-md border border-input bg-background text-sm font-medium shadow-none cursor-pointer ${statusAction === "archive"
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted/50"
                  }`}
                onClick={() =>
                  setStatusAction((prev) =>
                    prev === "archive" ? "active" : "archive"
                  )
                }
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </Button>
            </div>
          )}
        </div>

        <div className="border-t bg-muted/30 px-6 py-4">
          <Button
            className="h-11 w-full rounded-lg cursor-pointer"
            onClick={handleSave}
            disabled={isDisabledSave}
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