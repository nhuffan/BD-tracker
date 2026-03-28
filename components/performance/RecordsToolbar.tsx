"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { RecordRow } from "@/lib/types";
import type { Filters } from "./RecordsPage";
import FilterDialog from "./dialogs/FilterDialog";
import CreateDialog from "./dialogs/CreateDialog";
import { exportToExcel } from "./helpers/exportExcel";
import { useMasters } from "@/lib/useMasters";
import {
  Filter,
  Plus,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  CalendarDays
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function RecordsToolbar({
  filters,
  onChangeFilters,
  rowsForExport,
  onRefresh,
  isAdmin,
  monthOptions,
}: {
  filters: Filters;
  onChangeFilters: (f: Filters) => void;
  rowsForExport: RecordRow[];
  onRefresh: () => void;
  isAdmin: boolean;
  monthOptions: string[];
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

  function formatMonthLabel(value: string) {
    if (value === "__all__") return "All Time";
    const date = new Date(`${value}-01`);
    return date.toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    });
  }

  const ALL = "__all__";
  const currentMonth = filters.month ?? ALL;
  const currentIndex = monthOptions.indexOf(currentMonth);
  const isPrevDisabled =
    currentMonth === ALL || currentIndex === -1 || currentIndex >= monthOptions.length - 1;

  const isNextDisabled = currentMonth === ALL || currentIndex <= 1;

  function handlePrevMonth() {
    if (currentIndex === -1 || currentIndex >= monthOptions.length - 1) return;
    onChangeFilters({ ...filters, month: monthOptions[currentIndex + 1] });
  }

  function handleNextMonth() {
    if (currentIndex <= 1) return;
    onChangeFilters({ ...filters, month: monthOptions[currentIndex - 1] });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
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
          exportToExcel(rowsForExport, {
            bd: bdMap,
            level: levelMap,
            customerType: customerTypeMap,
            pointType: pointTypeMap,
          })
        }
      >
        <FileSpreadsheet className="h-4 w-4" />
        Export Data
      </Button>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={[
            "h-9 w-9 rounded-md border shadow-none transition-colors",
            isPrevDisabled
              ? "cursor-not-allowed border-primary/20 bg-primary/5 text-primary/30 opacity-100"
              : "cursor-pointer border-primary/30 bg-background text-primary hover:border-primary/50 hover:bg-primary/10",
          ].join(" ")}
          onClick={handlePrevMonth}
          disabled={isPrevDisabled}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Select
          value={currentMonth}
          onValueChange={(value) =>
            onChangeFilters({
              ...filters,
              month: value === ALL ? undefined : value,
            })
          }
        >
          <SelectTrigger
            className="
            inline-flex h-9 min-w-[160px] w-auto gap-2
            rounded-md border border-primary/30 bg-background
            px-3 text-primary shadow-none transition-colors
            hover:bg-primary/5 hover:border-primary/40
            focus:ring-1 focus:ring-primary/20 focus:ring-offset-0
          "
          >
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
            <SelectValue placeholder="All Time" />
          </SelectTrigger>

          <SelectContent className="min-w-[160px]">
            {monthOptions.map((month) => (
              <SelectItem
                key={month}
                value={month}
                className="cursor-pointer"
              >
                {formatMonthLabel(month)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className={[
            "h-9 w-9 rounded-md border shadow-none transition-colors",
            isNextDisabled
              ? "cursor-not-allowed border-primary/20 bg-primary/5 text-primary/30 opacity-100"
              : "cursor-pointer border-primary/30 bg-background text-primary hover:border-primary/50 hover:bg-primary/10",
          ].join(" ")}
          onClick={handleNextMonth}
          disabled={isNextDisabled}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <FilterDialog
        open={openFilter}
        onOpenChange={setOpenFilter}
        filters={filters}
        onApply={onChangeFilters}
      />
      <CreateDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onCreated={onRefresh}
      />
    </div>
  );
}