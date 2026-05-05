"use client";

import { FileText, Pencil, Trash2, Sparkles, Store, Loader2 } from "lucide-react";
import { getAdsTrackingStatus } from "@/lib/adsTracking";
import { formatDMY } from "@/lib/date";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import type { AdTrackingRow } from "./AdsTrackingPage";

export default function AdsTrackingTable({
  rows,
  loading,
  pointTypeMap,
  bdMap,
  customerTypeMap,
  isAdmin,
  onEdit,
  onDelete,
  onView,
}: {
  rows: AdTrackingRow[];
  loading: boolean;
  pointTypeMap: Record<string, string>;
  bdMap: Record<string, string>;
  customerTypeMap: Record<string, string>;
  isAdmin: boolean;
  onEdit: (row: AdTrackingRow) => void;
  onDelete: (row: AdTrackingRow) => void;
  onView: (row: AdTrackingRow) => void;
}) {
  function renderStatus(startDate: string | null, endDate: string | null) {
    const status = getAdsTrackingStatus(startDate, endDate);

    if (status === "not_started") {
      return (
        <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          Not Started
        </span>
      );
    }

    if (status === "active") {
      return (
        <span className="inline-flex rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          Active
        </span>
      );
    }

    if (status === "expiring_soon") {
      return (
        <span className="inline-flex rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
          Expiring Soon
        </span>
      );
    }

    return (
      <span className="inline-flex rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
        Expired
      </span>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border">
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/55 backdrop-blur-[1px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="w-full overflow-x-auto">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-[180px] p-3 text-left">Customer Name</th>
              <th className="w-[140px] p-3 text-left">Branch Name</th>
              <th className="w-[120px] p-3 text-left">BD Name</th>
              <th className="w-[200px] p-3 text-left">Customer Type</th>
              <th className="w-[180px] p-3 text-left">Point Type</th>
              <th className="w-[100px] p-3 text-left">Start Date</th>
              <th className="w-[100px] p-3 text-left">End Date</th>
              <th className="w-[120px] p-3 text-center">Status</th>
              <th className="w-[60px] p-3 text-center">Note</th>
              {isAdmin && (
                <th className="w-[100px] p-3 pr-5 text-right">Action</th>
              )}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const isRestaurant = row.category === "restaurant";

              return (
                <tr
                  key={row.id}
                  className="border-t odd:bg-muted/30 even:bg-background cursor-default"
                  onDoubleClick={() => onView(row)}
                >
                  <td
                    className="overflow-hidden whitespace-nowrap p-3 text-ellipsis"
                    title={row.customer_name}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <TooltipProvider>
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
                      </TooltipProvider>

                      <span className="truncate">{row.customer_name}</span>
                    </div>
                  </td>

                  <td
                    className="overflow-hidden whitespace-nowrap p-3 text-ellipsis"
                    title={row.branch_name || "—"}
                  >
                    {row.branch_name?.trim() ? row.branch_name : "—"}
                  </td>

                  <td
                    className="overflow-hidden whitespace-nowrap p-3 text-ellipsis"
                    title={row.bd_id ? bdMap[row.bd_id] ?? row.bd_id : "—"}
                  >
                    {row.bd_id ? bdMap[row.bd_id] ?? row.bd_id : "—"}
                  </td>

                  <td
                    className="overflow-hidden whitespace-nowrap p-3 text-ellipsis"
                    title={
                      row.customer_type_id
                        ? customerTypeMap[row.customer_type_id] ?? row.customer_type_id
                        : "—"
                    }
                  >
                    {row.customer_type_id
                      ? customerTypeMap[row.customer_type_id] ?? row.customer_type_id
                      : "—"}
                  </td>

                  <td
                    className="overflow-hidden whitespace-nowrap p-3 text-ellipsis"
                    title={pointTypeMap[row.point_type_id] ?? row.point_type_id}
                  >
                    {pointTypeMap[row.point_type_id] ?? row.point_type_id}
                  </td>

                  <td className="p-3">
                    {row.start_date ? formatDMY(row.start_date) : "—"}
                  </td>

                  <td className="p-3">
                    {row.end_date ? formatDMY(row.end_date) : "—"}
                  </td>

                  <td className="p-3 text-center">
                    {renderStatus(row.start_date, row.end_date)}
                  </td>

                  <td className="p-3 text-center">
                    {row.note ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center rounded-md p-1 hover:bg-muted"
                            >
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs whitespace-normal break-words">
                            {row.note}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {isAdmin && (
                    <td className="p-3 pr-5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 cursor-pointer"
                                disabled={loading}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (loading) return;
                                  onEdit(row);
                                }}
                              >
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 cursor-pointer"
                                disabled={loading}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (loading) return;
                                  onDelete(row);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {rows.length === 0 && !loading && (
          <div className="p-4 text-sm text-muted-foreground">
            No ad records found
          </div>
        )}
      </div>
    </div>
  );
}
