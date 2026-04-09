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
import { FileText, Search, RefreshCw, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import EditRecordDialog from "./dialogs/EditRecordDialog";

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
  onChanged: () => void;
  onRefresh: () => void;
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

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);

  function toggleRowSelection(id: string) {
    if (!selectionMode) return;

    setSelected((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function openEditDialog(record: RecordVM) {
    if (!isAdmin || selectionMode) return;
    setEditing(record);
    setEditOpen(true);
  }

  async function handleDelete() {
    if (!selectionMode) {
      setSelectionMode(true);
      return;
    }

    if (selectedIds.length === 0) {
      setSelectionMode(false);
      return;
    }

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
    onChanged();
    window.dispatchEvent(new Event("records-updated"));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <>
        <div className="border rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 p-2 border-b">
            <div className="relative w-[260px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search BD, customer or note..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-8 h-9"
              />
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              <Button
                className="cursor-pointer"
                variant="ghost"
                onClick={onRefresh}
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
                        setSelectionMode(false);
                        setSelected({});
                      }}
                    >
                      Cancel
                    </Button>
                  )}

                  <Button
                    className="cursor-pointer"
                    variant={selectionMode ? "destructive" : "secondary"}
                    onClick={handleDelete}
                  >
                    {selectionMode ? `Delete (${selectedIds.length})` : "Delete"}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur border-b shadow-sm">
                <tr>
                  <th className="p-2 text-left w-[80px]">Date</th>
                  <th className="p-2 text-left w-[100px]">BD Name</th>
                  <th className="p-2 text-left w-[100px]">BD Level</th>
                  <th className="p-2 text-left w-[180px]">Customer Name</th>
                  <th className="p-2 text-left w-[160px]">Customer Type</th>
                  <th className="p-2 text-left w-[200px]">Point Type</th>
                  <th className="p-2 text-left w-[100px]">Package Amount</th>
                  <th className="p-2 text-left w-[100px]">Points</th>
                  <th className="p-2 text-left w-[100px]">Bonus</th>
                  <th className="p-2 text-left w-[60px]">Note</th>
                  {selectionMode && (
                    <th className="p-2 w-[50px] text-right"></th>
                  )}
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => {
                  const isSelected = !!selected[r.id];

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
                        className="p-2 whitespace-nowrap overflow-hidden text-ellipsis"
                        title={bdMap[r.bd_id] ?? r.bd_id}
                      >
                        {bdMap[r.bd_id] ?? r.bd_id}
                      </td>

                      <td
                        className="p-2 whitespace-nowrap overflow-hidden text-ellipsis"
                        title={levelMap[r.bd_level_id] ?? r.bd_level_id}
                      >
                        {levelMap[r.bd_level_id] ?? r.bd_level_id}
                      </td>

                      <td
                        className="p-2 whitespace-nowrap overflow-hidden text-ellipsis"
                        title={r.customer_name}
                      >
                        {r.customer_name}
                      </td>

                      <td
                        className="p-2 whitespace-nowrap overflow-hidden text-ellipsis"
                        title={
                          customerTypeMap[r.customer_type_id] ??
                          r.customer_type_id
                        }
                      >
                        {customerTypeMap[r.customer_type_id] ??
                          r.customer_type_id}
                      </td>

                      <td
                        className="p-2 whitespace-nowrap overflow-hidden text-ellipsis"
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

                      <td className="p-2 text-left">
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
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {rows.length === 0 && (
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
            bdLevelOptions={Object.entries(levelMap).map(([id, label]) => ({ id, label }))}
          />
        )}
      </>
    </TooltipProvider>
  );
}