"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Filter, FileSpreadsheet, Plus, RefreshCw } from "lucide-react";
import type { TrackingFilters, TrackingRecordRow } from "./types";
import TrackingFilterDialog from "./dialogs/TrackingFilterDialog";
import CreateTrackingDialog from "./dialogs/CreateTrackingDialog";
import { exportTrackingToExcel } from "./helpers/exportTrackingExcel";

export default function CustomerTrackingToolbar({
  filters,
  onChangeFilters,
  rowsForExport,
  onRefresh,
  isAdmin,
  bdMap,
}: {
  filters: TrackingFilters;
  onChangeFilters: (f: TrackingFilters) => void;
  rowsForExport: TrackingRecordRow[];
  onRefresh: () => void;
  isAdmin: boolean;
  bdMap: Record<string, string>;
}) {
  const [openFilter, setOpenFilter] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Button
        className="cursor-pointer"
        variant="secondary"
        onClick={() => setOpenFilter(true)}
      >
        <Filter className="h-4 w-4" />
        Filter
      </Button>

      {isAdmin && (
        <Button className="cursor-pointer" onClick={() => setOpenCreate(true)}>
          <Plus className="h-4 w-4" />
          Create
        </Button>
      )}

      <Button
        className="cursor-pointer"
        variant="outline"
        onClick={() =>
          exportTrackingToExcel(rowsForExport, {
            bd: bdMap,
          })
        }
      >
        <FileSpreadsheet className="h-4 w-4" />
        Export Data
      </Button>

      <div className="flex-1" />

      <Button className="cursor-pointer" variant="ghost" onClick={onRefresh}>
        <RefreshCw className="h-4 w-4" />
        Refresh
      </Button>

      <TrackingFilterDialog
        open={openFilter}
        onOpenChange={setOpenFilter}
        filters={filters}
        onApply={onChangeFilters}
      />

      <CreateTrackingDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onCreated={onRefresh}
      />
    </div>
  );
}