"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
      return "bg-primary/10 text-primary";
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
  const [isDone, setIsDone] = useState(false);
  const [additionalDescription, setAdditionalDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ticket) return;
    setPriority(ticket.priority);
    setAdminAnswer(ticket.admin_answer ?? "");
    setIsDone(ticket.is_done);
    setAdditionalDescription("");
  }, [ticket]);

  if (!ticket) return null;

  const requesterName = bdMap[ticket.asked_by_bd_id] ?? "—";

  const isDisabledSave = isAdmin
    ? saving
    : saving || !additionalDescription.trim();

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
    if (!ticket) return;

    setSaving(true);
    try {
      if (isAdmin) {
        const payload: Record<string, unknown> = {
          priority,
          admin_answer: adminAnswer.trim() || null,
          is_done: isDone,
          answered_by_user_id: adminAnswer.trim() ? currentUserId : null,
          updated_at: new Date().toISOString(),
          done_at: isDone ? new Date().toISOString() : null,
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

            <h2 className="min-w-0 max-w-full whitespace-pre-wrap break-all text-2xl font-bold leading-tight tracking-tight text-foreground">
              {ticket.title}
            </h2>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6">
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
                className="h-[3.5rem] max-h-[3.5rem] resize-none overflow-y-auto break-all whitespace-pre-wrap leading-7"
              />
            </div>
          )}

          {isAdmin && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsDone((prev) => !prev)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsDone((prev) => !prev);
                }
              }}
              className="cursor-pointer rounded-lg border border-input bg-background p-4 transition hover:bg-muted/30"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-base font-semibold text-foreground">
                    Mark as Resolved
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {isDone
                      ? "This ticket is currently marked as resolved."
                      : "Ticket will remain active until resolved."}
                  </div>
                </div>

                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isDone}
                    onCheckedChange={(v) => setIsDone(Boolean(v))}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t bg-muted/30 px-6 py-4">
          <Button
            className="h-11 w-full rounded-lg"
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