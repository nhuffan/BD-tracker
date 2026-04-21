"use client";

import { useState } from "react";
import type { RecordVM } from "./RecordsPage";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/db";
import { syncPending } from "@/lib/sync";
import { formatDMY } from "@/lib/date";
import {
  FileText,
  Search,
  RefreshCw,
  Loader2,
  Sparkles,
  Store,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import EditRecordDialog from "./dialogs/EditRecordDialog";
import { toast } from "sonner";

export default function RecordsTable({
  rows,
  loading,
  onChanged,
  onRefresh,
  bdMap,
  levelMap,
  customerTypeMap,
  pointTypeMap,
  isAdmin,
  search,
  onSearchChange,
}: {
  rows: RecordVM[];
  loading: boolean;
  onChanged: () => Promise<void> | void;
  onRefresh: () => Promise<void> | void;
  bdMap: Record<string, string>;
  levelMap: Record<string, string>;
  customerTypeMap: Record<string, string>;
  pointTypeMap: Record<string, string>;
  isAdmin: boolean;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<RecordVM | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const isBusy = loading || isDeleting;

  function toggleRowSelection(id: string) {
    if (!selectionMode || isBusy) return;

    setSelected((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function openEditDialog(record: RecordVM) {
    if (!isAdmin || selectionMode || isBusy) return;
    setEditing(record);
    setEditOpen(true);
  }

  async function handleDelete() {
    if (isBusy) return;

    if (!selectionMode) {
      setSelectionMode(true);
      return;
    }

    if (selectedIds.length === 0) {
      setSelectionMode(false);
      return;
    }

    setIsDeleting(true);

    try {
      for (const id of selectedIds) {
        const existing = await db.records.get(id);

        if (existing) {
          await db.records.put({
            ...existing,
            deleted: true,
            sync_status: "pending",
            updated_at_local: Date.now(),
          });
        } else {
          const found = rows.find((r) => r.id === id);
          if (!found) continue;

          await db.records.put({
            ...(found as any),
            deleted: true,
            sync_status: "pending",
            updated_at_local: Date.now(),
          });
        }
      }

      if (navigator.onLine) {
        await syncPending();
      }

      setSelected({});
      setSelectionMode(false);

      await onChanged();
      window.dispatchEvent(new Event("records-updated"));
      toast.success(
        selectedIds.length === 1
          ? "Record deleted successfully."
          : `${selectedIds.length} records deleted successfully.`
      );
    } catch (e) {
      toast.error("Failed to delete record.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <TooltipProvider>
      <>
        <div className="relative overflow-hidden rounded-xl border">
          {isBusy && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/55 backdrop-blur-[1px]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          <div className="flex items-center gap-3 border-b p-2">
            <div className="relative w-[320px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search BD, customer, category or note..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-9 pl-8"
                disabled={isBusy}
              />
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              <Button
                className="cursor-pointer"
                variant="ghost"
                onClick={onRefresh}
                disabled={isBusy}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>

              {isAdmin && (
                <>
                  {selectionMode && (
                    <Button
                      className="cursor-pointer"
                      variant="ghost"
                      onClick={() => {
                        if (isBusy) return;
                        setSelectionMode(false);
                        setSelected({});
                      }}
                      disabled={isBusy}
                    >
                      Cancel
                    </Button>
                  )}

                  <Button
                    className="cursor-pointer"
                    variant={selectionMode ? "destructive" : "secondary"}
                    onClick={handleDelete}
                    disabled={isBusy}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : selectionMode ? (
                      `Delete (${selectedIds.length})`
                    ) : (
                      "Delete"
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <thead className="sticky top-0 z-10 border-b bg-muted/90 shadow-sm backdrop-blur">
                <tr>
                  <th className="w-[80px] p-2 text-left">Date</th>
                  <th className="w-[100px] p-2 text-left">BD Name</th>
                  <th className="w-[100px] p-2 text-left">BD Level</th>
                  <th className="w-[220px] p-2 text-left">Customer Name</th>
                  <th className="w-[160px] p-2 text-left">Customer Type</th>
                  <th className="w-[200px] p-2 text-left">Point Type</th>
                  <th className="w-[100px] p-2 text-left">Package Amount</th>
                  <th className="w-[100px] p-2 text-left">Points</th>
                  <th className="w-[100px] p-2 text-left">Bonus</th>
                  <th className="w-[60px] p-2 text-center">Note</th>
                  {selectionMode && (
                    <th className="w-[50px] p-2 text-right"></th>
                  )}
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => {
                  const isSelected = !!selected[r.id];
                  const isRestaurant = r.category === "restaurant";

                  return (
                    <tr
                      key={r.id}
                      className={`border-t ${selectionMode ? "cursor-pointer" : "cursor-default"
                        } ${isSelected ? "bg-muted/40" : ""}`}
                      onClick={() => toggleRowSelection(r.id)}
                      onDoubleClick={() => openEditDialog(r)}
                    >
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <span>{formatDMY(r.event_date)}</span>
                          {r._sync_status === "pending" && (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                          {r._sync_status === "failed" && (
                            <Badge variant="destructive">Failed</Badge>
                          )}
                        </div>
                      </td>

                      <td
                        className="overflow-hidden whitespace-nowrap p-2 text-ellipsis"
                        title={bdMap[r.bd_id] ?? r.bd_id}
                      >
                        {bdMap[r.bd_id] ?? r.bd_id}
                      </td>

                      <td
                        className="overflow-hidden whitespace-nowrap p-2 text-ellipsis"
                        title={levelMap[r.bd_level_id] ?? r.bd_level_id}
                      >
                        {levelMap[r.bd_level_id] ?? r.bd_level_id}
                      </td>

                      <td
                        className="overflow-hidden whitespace-nowrap p-2 text-ellipsis"
                        title={r.customer_name}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="shrink-0 text-muted-foreground">
                                {isRestaurant ? (
                                  <Store className="h-4 w-4" />
                                ) : (
                                  <Sparkles className="h-4 w-4" />
                                )}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {isRestaurant ? "Restaurant" : "Entertainment"}
                            </TooltipContent>
                          </Tooltip>

                          <span className="truncate">{r.customer_name}</span>
                        </div>
                      </td>

                      <td
                        className="overflow-hidden whitespace-nowrap p-2 text-ellipsis"
                        title={
                          customerTypeMap[r.customer_type_id] ??
                          r.customer_type_id
                        }
                      >
                        {customerTypeMap[r.customer_type_id] ??
                          r.customer_type_id}
                      </td>

                      <td
                        className="overflow-hidden whitespace-nowrap p-2 text-ellipsis"
                        title={pointTypeMap[r.point_type_id] ?? r.point_type_id}
                      >
                        {pointTypeMap[r.point_type_id] ?? r.point_type_id}
                      </td>

                      <td className="p-2">
                        {r.package_amount?.toLocaleString("en-US") ?? "—"}
                      </td>

                      <td className="p-2">
                        {r.points?.toLocaleString("en-US")}
                      </td>

                      <td className="p-2">
                        {r.money !== null && r.money !== undefined
                          ? r.money.toLocaleString("en-US")
                          : "—"}
                      </td>

                      <td className="p-2 text-center">
                        {r.note ? (
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
                              {r.note}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {selectionMode && (
                        <td
                          className="p-2 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(v) =>
                              setSelected((s) => ({
                                ...s,
                                [r.id]: Boolean(v),
                              }))
                            }
                            disabled={isBusy}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {rows.length === 0 && !isBusy && (
              <div className="p-4 text-sm text-muted-foreground">
                No records found
              </div>
            )}
          </div>
        </div>

        {isAdmin && (
          <EditRecordDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            record={editing}
            onSaved={onChanged}
            bdLevelOptions={Object.entries(levelMap).map(([id, label]) => ({
              id,
              label,
            }))}
          />
        )}
      </>
    </TooltipProvider>
  );
}