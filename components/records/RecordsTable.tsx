"use client";

import { useState } from "react";
import type { RecordVM } from "./RecordsPage";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { syncPending } from "@/lib/sync";
import { formatDMY } from "@/lib/date";
import { FileText } from "lucide-react";
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
  bdMap,
  levelMap,
  customerTypeMap,
  pointTypeMap,
  isAdmin,
}: {
  rows: RecordVM[];
  loading: boolean;
  onChanged: () => void;
  bdMap: Record<string, string>;
  levelMap: Record<string, string>;
  customerTypeMap: Record<string, string>;
  pointTypeMap: Record<string, string>;
  isAdmin: boolean;
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
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <TooltipProvider>
      <>
        <div className="border rounded-xl overflow-hidden">
          <div className="flex items-center p-2 border-b">
            <div className="flex-1" />
              {isAdmin && (
                <div className="flex items-center gap-2">
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
                </div>
              )}
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left w-[120px]">Date</th>
                  <th className="p-2 text-left w-[140px]">BD Name</th>
                  <th className="p-2 text-left w-[120px]">BD Level</th>
                  <th className="p-2 text-left w-[220px]">Customer Name</th>
                  <th className="p-2 text-left w-[160px]">Customer Type</th>
                  <th className="p-2 text-left w-[220px]">Point Type</th>
                  <th className="p-2 text-left w-[110px]">Points</th>
                  <th className="p-2 text-left w-[130px]">Money</th>
                  <th className="p-2 text-left w-[60px]">Note</th>
                  {selectionMode && <th className="p-2 w-[50px] text-right"></th>}
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => {
                  const isSelected = !!selected[r.id];

                  return (
                    <tr
                      key={r.id}
                      className={`border-t ${
                        selectionMode ? "cursor-pointer" : "cursor-default"
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
                        title={customerTypeMap[r.customer_type_id] ?? r.customer_type_id}
                      >
                        {customerTypeMap[r.customer_type_id] ?? r.customer_type_id}
                      </td>

                      <td
                        className="p-2 whitespace-nowrap overflow-hidden text-ellipsis"
                        title={pointTypeMap[r.point_type_id] ?? r.point_type_id}
                      >
                        {pointTypeMap[r.point_type_id] ?? r.point_type_id}
                      </td>

                      <td className="p-2">{r.points?.toLocaleString("en-US")}</td>

                      <td className="p-2">
                        {r.money?.toLocaleString("en-US") ?? ""}
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
          />
        )}
      </>
    </TooltipProvider>
  );
}