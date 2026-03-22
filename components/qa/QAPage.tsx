"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Plus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { QAPriority, QATicket, QATicketVM } from "./types";
import CreateQATicketDialog from "./dialogs/CreateQATicketDialog";
import QATicketDetailDialog from "./dialogs/QATicketDetailDialog";

type QAViewTab = "active" | "done";

function getPriorityBadgeClass(priority: QAPriority) {
  switch (priority) {
    case "urgent":
      return "bg-destructive/10 text-destructive";
    case "high":
      return "bg-destructive/10 text-destructive";
    case "medium":
      return "bg-primary/10 text-primary";
    case "low":
    default:
      return "bg-muted text-muted-foreground";
  }
}

function priorityOrder(priority: QAPriority) {
  switch (priority) {
    case "urgent":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
    default:
      return 1;
  }
}

function formatTicketCode(index: number) {
  return `#QA-${String(index + 1).padStart(4, "0")}`;
}

function getInitials(name?: string) {
  if (!name) return "—";

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default function QAPage({
  isAdmin,
  bdMap,
  currentUserId,
}: {
  isAdmin: boolean;
  bdMap: Record<string, string>;
  currentUserId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<QATicket[]>([]);
  const [search, setSearch] = useState("");
  const [viewTab, setViewTab] = useState<QAViewTab>("active");

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<QATicketVM | null>(null);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  async function refresh() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("qa_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load qa tickets:", error);
        return;
      }

      setTickets(data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const filteredTickets = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const list: QATicketVM[] = tickets.map((t, index) => ({
      ...t,
      asked_by_name: bdMap[t.asked_by_bd_id] ?? "—",
      ticket_code: formatTicketCode(index),
    }));

    const result = !keyword
      ? list
      : list.filter((t) => {
          return (
            t.title.toLowerCase().includes(keyword) ||
            (t.issue_detail ?? "").toLowerCase().includes(keyword) ||
            (t.admin_answer ?? "").toLowerCase().includes(keyword) ||
            (t.asked_by_name ?? "").toLowerCase().includes(keyword) ||
            t.priority.toLowerCase().includes(keyword) ||
            (t.ticket_code ?? "").toLowerCase().includes(keyword)
          );
        });

    return [...result].sort((a, b) => {
      const priorityDiff = priorityOrder(b.priority) - priorityOrder(a.priority);
      if (priorityDiff !== 0) return priorityDiff;

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [tickets, search, bdMap]);

  const activeTickets = filteredTickets.filter((t) => !t.is_done);
  const doneTickets = filteredTickets.filter((t) => t.is_done);
  const displayTickets = viewTab === "active" ? activeTickets : doneTickets;

  const selectedIds = displayTickets
    .filter((ticket) => selected[ticket.id])
    .map((ticket) => ticket.id);

  function openDetail(ticket: QATicketVM) {
    if (selectionMode) return;
    setSelectedTicket(ticket);
    setDetailOpen(true);
  }

  function toggleSelection(id: string) {
    if (!selectionMode) return;

    setSelected((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  async function handleDelete() {
    if (!isAdmin) return;

    if (!selectionMode) {
      setSelectionMode(true);
      return;
    }

    if (selectedIds.length === 0) {
      setSelectionMode(false);
      setSelected({});
      return;
    }

    const { error } = await supabase
      .from("qa_tickets")
      .delete()
      .in("id", selectedIds);

    if (error) {
      console.error("Failed to delete qa tickets:", error);
      return;
    }

    setSelected({});
    setSelectionMode(false);
    await refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setViewTab("active");
            setSelectionMode(false);
            setSelected({});
          }}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            viewTab === "active"
              ? "bg-primary text-primary-foreground"
              : "border bg-background text-muted-foreground hover:bg-muted"
          }`}
        >
          Active ({activeTickets.length})
        </button>

        <button
          type="button"
          onClick={() => {
            setViewTab("done");
            setSelectionMode(false);
            setSelected({});
          }}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            viewTab === "done"
              ? "bg-primary text-primary-foreground"
              : "border bg-background text-muted-foreground hover:bg-muted"
          }`}
        >
          Done ({doneTickets.length})
        </button>

        <div className="flex-1" />

        <Button
          className="flex h-9 items-center gap-2 rounded-lg"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Create Question
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
        <div className="flex items-center border-b bg-muted/50 px-4 py-2">
          <div className="text-sm font-medium text-foreground">
            {viewTab === "active" ? "Active Tickets" : "Done Tickets"}
          </div>

          <div className="flex-1" />

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
            <div className="relative w-full sm:w-[320px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ticket, BD, summary..."
                className="h-9 rounded-lg pl-9"
              />
            </div>

            {isAdmin && selectionMode && (
              <Button
                variant="ghost"
                className="rounded-lg"
                onClick={() => {
                  setSelectionMode(false);
                  setSelected({});
                }}
              >
                Cancel
              </Button>
            )}

            {isAdmin && (
              <Button
                className="rounded-lg"
                variant={selectionMode ? "destructive" : "secondary"}
                onClick={handleDelete}
              >
                {selectionMode ? `Delete (${selectedIds.length})` : "Delete"}
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-5 text-sm text-muted-foreground">Loading...</div>
        ) : displayTickets.length === 0 ? (
          <div className="p-5 text-sm text-muted-foreground">
            No tickets found
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-5 xl:grid-cols-2">
            {displayTickets.map((ticket) => {
              const bdName = ticket.asked_by_name ?? "—";
              const isSelected = !!selected[ticket.id];

              return (
                <div
                  key={ticket.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (selectionMode) {
                      toggleSelection(ticket.id);
                      return;
                    }
                    openDetail(ticket);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (selectionMode) {
                        toggleSelection(ticket.id);
                        return;
                      }
                      openDetail(ticket);
                    }
                  }}
                  className={`relative rounded-lg border bg-background p-4 text-left transition hover:bg-muted/40 hover:shadow-sm ${
                    isSelected ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  {selectionMode && (
                    <div
                      className="absolute right-3 top-3 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(value) =>
                          setSelected((prev) => ({
                            ...prev,
                            [ticket.id]: Boolean(value),
                          }))
                        }
                      />
                    </div>
                  )}

                  <div className="mb-3 flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-primary">
                        {ticket.ticket_code}
                      </div>

                      <div className="mt-1 line-clamp-1 text-base font-semibold text-foreground">
                        {ticket.title}
                      </div>
                    </div>

                    {!selectionMode && (
                      <span
                        className={`inline-flex rounded-md px-2 py-1 text-[11px] font-bold uppercase ${getPriorityBadgeClass(
                          ticket.priority
                        )}`}
                      >
                        {ticket.priority}
                      </span>
                    )}
                  </div>

                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                      {getInitials(bdName)}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        BD Name
                      </div>
                      <div className="truncate text-sm font-medium text-foreground">
                        {bdName}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                      Summary
                    </div>
                    <div className="line-clamp-2 text-sm text-muted-foreground">
                      {viewTab === "done"
                        ? ticket.admin_answer || ticket.issue_detail || "—"
                        : ticket.issue_detail || "—"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreateQATicketDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        bdMap={bdMap}
        onSaved={refresh}
      />

      <QATicketDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        ticket={selectedTicket}
        isAdmin={isAdmin}
        bdMap={bdMap}
        currentUserId={currentUserId}
        onSaved={refresh}
      />
    </div>
  );
}