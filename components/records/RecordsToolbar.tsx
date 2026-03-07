"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { RecordRow } from "@/lib/types";
import type { Filters } from "./RecordsPage";
import FilterDialog from "./dialogs/FilterDialog";
import CreateDialog from "./dialogs/CreateDialog";
import { exportToExcel } from "../helpers/exportExcel";
import { useMasters } from "@/lib/useMasters";


export default function RecordsToolbar({
  filters,
  onChangeFilters,
  rowsForExport,
  onRefresh,
}: {
  filters: Filters;
  onChangeFilters: (f: Filters) => void;
  rowsForExport: RecordRow[];
  onRefresh: () => void;
}) {
  const [openFilter, setOpenFilter] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);

  const { items: bdList } = useMasters("bd");
  const { items: levelList } = useMasters("bd_level");
  const { items: customerTypes } = useMasters("customer_type");
  const { items: pointTypes } = useMasters("point_type");

  const bdMap = Object.fromEntries(bdList.map((x) => [x.id, x.label]));
  const levelMap = Object.fromEntries(levelList.map((x) => [x.id, x.label]));
  const customerTypeMap = Object.fromEntries(customerTypes.map((x) => [x.id, x.label]));
  const pointTypeMap = Object.fromEntries(pointTypes.map((x) => [x.id, x.label]));

  return (
    <div className="flex items-center gap-2">
      <Button className="cursor-pointer" variant="secondary" onClick={() => setOpenFilter(true)}>
        Filter
      </Button>
      <Button className="cursor-pointer" onClick={() => setOpenCreate(true)}>Create</Button>

    <Button
      className="cursor-pointer"
      variant="outline"
      onClick={() =>
        exportToExcel(rowsForExport, {
          bd: bdMap,
          level: levelMap,
          customerType: customerTypeMap,
          pointType: pointTypeMap,
        })
      }
    >
      Export Excel
    </Button>


      <div className="flex-1" />

      <Button className="cursor-pointer" variant="ghost" onClick={onRefresh}>
        Refresh
      </Button>

      <FilterDialog open={openFilter} onOpenChange={setOpenFilter} filters={filters} onApply={onChangeFilters} />
      <CreateDialog open={openCreate} onOpenChange={setOpenCreate} onCreated={onRefresh} />
    </div>
  );
}
