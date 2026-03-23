"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, CheckCircle2, Clock3, Plus, Search } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { QAPriority, QATicket, QATicketVM } from "./types";
import CreateQATicketDialog from "./dialogs/CreateQATicketDialog";
import QATicketDetailDialog from "./dialogs/QATicketDetailDialog";

type QAViewTab = "active" | "done" | "archive";

function getPriorityBadgeClass(priority: QAPriority) {
  switch (priority) {
    case "urgent":
      return "bg-red-50 text-red-600";
    case "high":
      return "bg-orange-50 text-orange-600";
    case "medium":
      return "bg-blue-50 text-blue-600";
    case "low":
    default:
      return "bg-slate-100 text-slate-500";
  }
}

function getPriorityFooterClass(priority: QAPriority) {
  switch (priority) {
    case "urgent":
      return "bg-red-50/70 border-red-100";
    case "high":
      return "bg-orange-50/70 border-orange-100";
    case "medium":
      return "bg-blue-50/70 border-blue-100";
    case "low":
    default:
      return "bg-slate-50 border-slate-100";
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
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function formatRelativeTime(value?: string | null) {
  if (!value) return "—";

  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diffMs / 1000 / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
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

      setTickets((data ?? []) as QATicket[]);
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

      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [tickets, search, bdMap]);

  const activeTickets = filteredTickets.filter((t) => !t.is_done && !t.is_archived);
  const doneTickets = filteredTickets.filter((t) => t.is_done && !t.is_archived);
  const archivedTickets = filteredTickets.filter((t) => t.is_archived);

  const displayTickets =
    viewTab === "active"
      ? activeTickets
      : viewTab === "done"
        ? doneTickets
        : archivedTickets;

  const selectedIds = displayTickets
    .filter((ticket) => selected[ticket.id])
    .map((ticket) => ticket.id);

  const stats = useMemo(() => {
    return {
      total: tickets.length,
      active: activeTickets.length,
      done: doneTickets.length,
      archive: archivedTickets.length,
    };
  }, [tickets, activeTickets, doneTickets, archivedTickets]);

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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-[32px] font-extrabold tracking-tight text-slate-950">
            Question Board <span className="text-slate-950">({stats.total})</span>
          </h1>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <Button
            className="ml-2 h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            Create Question
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-[320px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search question, priority, BD..."
              className="h-10 rounded-lg border-slate-200 pl-9 shadow-none"
            />
          </div>

          <div className="flex items-center gap-2 sm:ml-2">
            <button
              type="button"
              onClick={() => {
                setViewTab("active");
                setSelectionMode(false);
                setSelected({});
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${viewTab === "active"
                ? "bg-primary/10 text-primary"
                : "text-slate-500 hover:bg-slate-100"
                }`}
            >
              Active ({stats.active})
            </button>

            <button
              type="button"
              onClick={() => {
                setViewTab("done");
                setSelectionMode(false);
                setSelected({});
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${viewTab === "done"
                ? "bg-primary/10 text-primary"
                : "text-slate-500 hover:bg-slate-100"
                }`}
            >
              Done ({stats.done})
            </button>

            <button
              type="button"
              onClick={() => {
                setViewTab("archive");
                setSelectionMode(false);
                setSelected({});
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${viewTab === "archive"
                ? "bg-primary/10 text-primary"
                : "text-slate-500 hover:bg-slate-100"
                }`}
            >
              Archive ({stats.archive})
            </button>
          </div>

          <div className="flex-1" />

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
              variant={selectionMode ? "destructive" : "secondary"}
              className="rounded-lg cursor-pointer"
              onClick={handleDelete}
            >
              {selectionMode ? `Delete (${selectedIds.length})` : "Delete"}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="p-5 text-sm text-slate-500">Loading...</div>
        ) : displayTickets.length === 0 ? (
          <div className="p-5 text-sm text-slate-500">No tickets found</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
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
                  className={`relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${isSelected ? "border-primary bg-primary/5" : ""
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

                  <div className="flex-1 px-4 pt-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-[11px] font-semibold tracking-wide text-muted-foreground">
                          {ticket.ticket_code}
                        </div>
                      </div>

                      {!selectionMode && (
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold uppercase ${getPriorityBadgeClass(
                            ticket.priority
                          )}`}
                        >
                          <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                          {ticket.priority}
                        </span>
                      )}
                    </div>

                    <div className="mb-2 line-clamp-2 text-[20px] font-bold leading-tight text-slate-950">
                      {ticket.title}
                    </div>

                    <div className="mb-4 line-clamp-3 min-h-[72px] text-sm leading-6 text-slate-500">
                      {ticket.admin_answer || ticket.issue_detail || "—"}
                    </div>
                  </div>

                  <div
                    className={`mt-auto flex items-center justify-between border-t px-4 py-3 ${getPriorityFooterClass(
                      ticket.priority
                    )}`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                        {getInitials(bdName)}
                      </div>
                      <span className="truncate text-sm font-medium text-slate-800">
                        {bdName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      {ticket.is_archived ? (
                        <>
                          <Archive className="h-3.5 w-3.5" />
                          <span>Archived</span>
                        </>
                      ) : ticket.is_done ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Done</span>
                        </>
                      ) : (
                        <>
                          <Clock3 className="h-3.5 w-3.5" />
                          <span>{formatRelativeTime(ticket.created_at)}</span>
                        </>
                      )}
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