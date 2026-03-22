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
  "h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm shadow-none";
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

function getStatusLabel(ticket?: QATicketVM | null, isDone?: boolean) {
  const done = typeof isDone === "boolean" ? isDone : ticket?.is_done;
  return done ? "DONE" : "IN REVIEW";
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ticket) return;
    setPriority(ticket.priority);
    setAdminAnswer(ticket.admin_answer ?? "");
    setIsDone(ticket.is_done);
  }, [ticket]);

  if (!ticket) return null;

  const requesterName = bdMap[ticket.asked_by_bd_id] ?? "—";

  async function handleSave() {
    if (!isAdmin || !ticket) return;

    setSaving(true);
    try {
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

      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[760px] overflow-hidden rounded-xl border bg-background p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogTitle className="sr-only">{ticket.title}</DialogTitle>

        <div className="flex items-start justify-between border-b px-6 py-5">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-primary">
                {getStatusLabel(ticket, isDone)}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                · {formatTicketCode(ticket)}
              </span>
            </div>

            <h2 className="max-w-[560px] text-2xl font-bold leading-tight tracking-tight text-foreground">
              {ticket.title}
            </h2>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                {getInitials(requesterName)}
              </div>

              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Requester
                </div>
                <div className="truncate text-base font-semibold text-foreground">
                  {requesterName}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className={labelClass}>Issue Description</div>

            <div className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground">
              <div
                className="max-h-[10em] overflow-y-auto whitespace-pre-wrap leading-7"
                style={{ scrollbarGutter: "stable" }}
              >
                {ticket.issue_detail || "—"}
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
                className="min-h-[150px]"
              />
            ) : (
              <div className="min-h-[150px] whitespace-pre-wrap rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground">
                {ticket.admin_answer || "No answer yet"}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                <div className="flex h-11 w-full min-w-0 items-center rounded-lg border border-input bg-background px-3 text-sm text-foreground">
                  {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className={labelClass}>Date Created</div>

              <div className="flex h-11 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-muted/40 px-3 text-sm text-foreground">
                <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{formatDate(ticket.created_at)}</span>
              </div>
            </div>
          </div>

          <div
            role={isAdmin ? "button" : undefined}
            tabIndex={isAdmin ? 0 : -1}
            onClick={() => {
              if (!isAdmin) return;
              setIsDone((prev) => !prev);
            }}
            onKeyDown={(e) => {
              if (!isAdmin) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsDone((prev) => !prev);
              }
            }}
            className={`rounded-lg border border-input bg-background p-4 transition ${
              isAdmin ? "cursor-pointer hover:bg-muted/30" : ""
            }`}
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
                  checked={isAdmin ? isDone : ticket.is_done}
                  disabled={!isAdmin}
                  onCheckedChange={(v) => setIsDone(Boolean(v))}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t bg-muted/30 px-6 py-4">
          {isAdmin && (
            <Button
              className="h-11 w-full rounded-lg"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Updating..." : "Update Ticket"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}