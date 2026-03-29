"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, CheckCircle2, CircleDashed, Clock3, Plus, Search, Paperclip } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { QAPriority, QATicket, QATicketVM } from "./utils/types";
import CreateQATicketDialog from "./dialogs/CreateQATicketDialog";
import QATicketDetailDialog from "./dialogs/QATicketDetailDialog";
import { saveAs } from "file-saver";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} from "docx";
import { Download } from "lucide-react";
import { useMasters } from "@/lib/useMasters";

type QAViewTab = "active" | "in_progress" | "done" | "archive";

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

function formatExportDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFooterTime(value?: string | null) {
  if (!value) return "—";

  const d = new Date(value);

  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const time = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${date} | ${time}`;
}

function upsertTicket(list: QATicket[], next: QATicket) {
  const index = list.findIndex((item) => item.id === next.id);
  if (index === -1) return [next, ...list];

  const clone = [...list];
  clone[index] = next;
  return clone;
}

export default function QAPage({
  isAdmin,
  currentUserId,
}: {
  isAdmin: boolean;
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
  const [adminNameMap, setAdminNameMap] = useState<Record<string, string>>({});

  const { items: bdList } = useMasters("bd");

  const bdNameMap = useMemo(() => {
    return Object.fromEntries(bdList.map((item) => [item.id, item.label]));
  }, [bdList]);


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
    const channel = supabase
      .channel("qa-tickets-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "qa_tickets",
        },
        (payload) => {
          const next = payload.new as QATicket;
          setTickets((prev) => upsertTicket(prev, next));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "qa_tickets",
        },
        (payload) => {
          const next = payload.new as QATicket;

          setTickets((prev) => upsertTicket(prev, next));

          setSelectedTicket((prev) => {
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
          table: "qa_tickets",
        },
        (payload) => {
          const oldRow = payload.old as { id: string };

          setTickets((prev) => prev.filter((item) => item.id !== oldRow.id));
          setSelectedTicket((prev) => (prev?.id === oldRow.id ? null : prev));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bdNameMap]);

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    async function loadAdmins() {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("role", "admin");

      if (error) {
        console.error("Failed to load admin profiles:", error);
        return;
      }

      const map: Record<string, string> = {};
      (data ?? []).forEach((item) => {
        map[item.id] = item.email;
      });

      setAdminNameMap(map);
    }

    loadAdmins();
  }, []);

  const filteredTickets = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const list: QATicketVM[] = tickets.map((t, index) => ({
      ...t,
      asked_by_name: bdNameMap[t.asked_by_bd_id] ?? "—",
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
  }, [tickets, search, bdNameMap]);

  const activeTickets = filteredTickets.filter(
    (t) => !t.is_in_progress && !t.is_done && !t.is_archived
  );

  const inProgressTickets = [...filteredTickets]
    .filter((t) => t.is_in_progress && !t.is_done && !t.is_archived)
    .sort(
      (a, b) =>
        new Date(b.in_progress_at ?? b.updated_at ?? b.created_at).getTime() -
        new Date(a.in_progress_at ?? a.updated_at ?? a.created_at).getTime()
    );

  const doneTickets = [...filteredTickets]
    .filter((t) => t.is_done && !t.is_archived)
    .sort(
      (a, b) =>
        new Date(b.done_at ?? 0).getTime() - new Date(a.done_at ?? 0).getTime()
    );

  const archivedTickets = [...filteredTickets]
    .filter((t) => t.is_archived)
    .sort(
      (a, b) =>
        new Date(b.archived_at ?? b.updated_at ?? b.created_at).getTime() -
        new Date(a.archived_at ?? a.updated_at ?? a.created_at).getTime()
    );

  const displayTickets =
    viewTab === "active"
      ? activeTickets
      : viewTab === "in_progress"
        ? inProgressTickets
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
      inProgress: inProgressTickets.length,
      done: doneTickets.length,
      archive: archivedTickets.length,
    };
  }, [tickets, activeTickets, inProgressTickets, doneTickets, archivedTickets]);

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

    try {
      const ticketsToDelete = tickets.filter((ticket) =>
        selectedIds.includes(ticket.id)
      );

      const attachmentItems = ticketsToDelete.flatMap((ticket) =>
        (ticket.attachments ?? [])
          .filter((item) => item.public_id)
          .map((item) => ({
            public_id: item.public_id,
            resource_type: item.resource_type,
          }))
      );

      if (attachmentItems.length > 0) {
        const deleteFilesRes = await fetch("/api/cloudinary/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: attachmentItems,
          }),
        });

        if (!deleteFilesRes.ok) {
          const err = await deleteFilesRes.json().catch(() => null);
          console.error("Failed to delete cloudinary files:", err);
          alert("Failed to delete attachments from Cloudinary.");
          return;
        }
      }

      const { error } = await supabase
        .from("qa_tickets")
        .delete()
        .in("id", selectedIds);

      if (error) {
        console.error("Failed to delete qa tickets:", error);
        alert("Failed to delete tickets.");
        return;
      }

      setSelected({});
      setSelectionMode(false);
      await refresh();
    } catch (error) {
      console.error("Delete flow failed:", error);
      alert("Delete failed.");
    }
  }

  async function handleExportArchive() {
    if (archivedTickets.length === 0) return;

    const paragraphs: Paragraph[] = [
      new Paragraph({
        text: "Archived Q&A Tickets",
        heading: HeadingLevel.TITLE,
        spacing: { after: 300 },
      }),
    ];

    archivedTickets.forEach((ticket) => {
      paragraphs.push(
        // 🔥 dòng trống trước -----
        new Paragraph({
          text: "",
          spacing: { after: 60 },
        }),

        // 🔥 separator
        new Paragraph({
          children: [
            new TextRun({
              text: `----- ${ticket.ticket_code} | ${formatExportDateTime(
                ticket.created_at
              )} -----`,
              bold: true,
            }),
          ],
          spacing: { after: 200 },
        }),

        // Title
        new Paragraph({
          children: [
            new TextRun({
              text: ticket.title || "—",
              bold: true,
              size: 28,
            }),
          ],
          spacing: { after: 200 },
        }),

        // Asked by
        new Paragraph({
          children: [
            new TextRun({ text: "Asked by: ", bold: true }),
            new TextRun(ticket.asked_by_name || "—"),
          ],
          spacing: { after: 120 },
        }),

        // Issue
        new Paragraph({
          children: [
            new TextRun({ text: "Issue Description: ", bold: true }),
          ],
          spacing: { after: 80 },
        }),

        new Paragraph({
          text: ticket.issue_detail || "—",
          spacing: { after: 160 },
        }),

        // Admin response
        new Paragraph({
          children: [
            new TextRun({ text: "Admin Response: ", bold: true }),
          ],
          spacing: { after: 80 },
        }),

        new Paragraph({
          text: ticket.admin_answer || "—",
          spacing: { after: 200 },
        })
      );
    });

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `archived-qa-tickets-${new Date().toISOString().slice(0, 10)}.docx`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-[32px] font-extrabold tracking-tight text-slate-950">
            Ticket Dashboard <span className="text-slate-950">({stats.active})</span>
          </h1>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          {viewTab === "archive" && (
            <Button
              variant="outline"
              className="h-10 rounded-lg cursor-pointer"
              onClick={handleExportArchive}
              disabled={archivedTickets.length === 0}
            >
              <Download className="mr-1 h-4 w-4" />
              Export
            </Button>
          )}

          <Button
            className="h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
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
                setViewTab("in_progress");
                setSelectionMode(false);
                setSelected({});
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${viewTab === "in_progress"
                ? "bg-primary/10 text-primary"
                : "text-slate-500 hover:bg-slate-100"
                }`}
            >
              In Progress ({stats.inProgress})
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

                  <div className="flex-1 px-4 pt-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-2">
                        <div className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-[12px] font-bold tracking-wide text-muted-foreground">
                          {ticket.ticket_code}
                        </div>

                        {(ticket.attachments?.length ?? 0) > 0 && (
                          <div className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[12px] font-bold tracking-wide text-muted-foreground">
                            <Paperclip className="h-3 w-3 shrink-0" />
                            <span>{ticket.attachments?.length}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-bold uppercase ${getPriorityBadgeClass(
                            ticket.priority
                          )}`}
                        >
                          <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                          {ticket.priority}
                        </span>

                        {selectionMode && (
                          <div
                            className="flex h-[20px] w-[20px] items-center justify-center"
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
                              className="h-4 w-4"
                            />
                          </div>
                        )}
                      </div>
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

                    <div className="flex items-end gap-1.5 text-[11px] font-medium text-slate-500">
                      {ticket.is_archived ? (
                        <>
                          <Archive className="h-[10px] w-[10px] shrink-0 text-slate-500" />
                          <span className="uppercase tracking-[0.04em] leading-none">
                            Archived:
                          </span>
                          <span className="font-semibold text-slate-700 leading-none">
                            {formatFooterTime(ticket.updated_at ?? ticket.archived_at)}
                          </span>
                        </>
                      ) : ticket.is_done ? (
                        <>
                          <CheckCircle2 className="h-[10px] w-[10px] shrink-0 text-slate-500" />
                          <span className="uppercase tracking-[0.04em] leading-none">
                            Done:
                          </span>
                          <span className="font-semibold text-slate-700 leading-none">
                            {formatFooterTime(ticket.updated_at ?? ticket.done_at)}
                          </span>
                        </>
                      ) : ticket.is_in_progress ? (
                        <>
                          <CircleDashed className="h-[10px] w-[10px] shrink-0 text-slate-500" />
                          <span className="uppercase tracking-[0.04em] leading-none">
                            Updated:
                          </span>
                          <span className="font-semibold text-slate-700 leading-none">
                            {formatFooterTime(ticket.updated_at ?? ticket.in_progress_at)}
                          </span>
                        </>
                      ) : (
                        <>
                          <Clock3 className="h-[10px] w-[10px] shrink-0 text-slate-500" />
                          <span className="uppercase tracking-[0.04em] leading-none">
                            Created:
                          </span>
                          <span className="font-semibold text-slate-700 leading-none">
                            {formatFooterTime(ticket.created_at)}
                          </span>
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
        onSaved={refresh}
      />

      <QATicketDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        ticket={selectedTicket}
        isAdmin={isAdmin}
        bdMap={bdNameMap}
        adminNameMap={adminNameMap}
        currentUserId={currentUserId}
        onSaved={refresh}
        onTicketChanged={(next) => {
          setTickets((prev) => upsertTicket(prev, next));
          setSelectedTicket((prev) => {
            if (!prev || prev.id !== next.id) return prev;

            return {
              ...prev,
              ...next,
              asked_by_name: bdNameMap[next.asked_by_bd_id] ?? "—",
            };
          });
        }}
      />
    </div>
  );
}