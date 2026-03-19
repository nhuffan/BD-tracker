"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { MasterCategory, MasterItem } from "@/lib/masters";
import {
  createMaster,
  deleteMaster,
  fetchMasters,
  updateMaster,
} from "@/lib/masters";
import { MASTER_CATEGORY_UI } from "@/lib/masterUi";
import { supabase } from "@/lib/supabaseClient";
import { invalidateMastersCache } from "@/lib/useMasters";
import { Pencil, Trash2, ArrowUpDown, CalendarDays, Plus } from "lucide-react";

function normalizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function generateCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function formatMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-");
  return `${monthNumber}/${year}`;
}

function getMedalByIndex(index: number) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return null;
}

type SortDirection = "asc" | "desc";
type BdSortField = "points" | "money" | "newCustomers" | "newHotList";

export default function MasterManager({
  category,
  isAdmin,
  title,
}: {
  category: MasterCategory;
  isAdmin: boolean;
  title: string;
}) {
  const ui = MASTER_CATEGORY_UI[category];
  const ALL_TIME = "__all__";

  const [items, setItems] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MasterItem | null>(null);

  const [label, setLabel] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [showInUseDialog, setShowInUseDialog] = useState(false);

  const [totals, setTotals] = useState<
    Record<string, { points: number; money: number; packageAmount: number | null }>
  >({});

  const [trackingTotals, setTrackingTotals] = useState<
    Record<string, { newCustomers: number; newHotList: number }>
  >({});

  const [monthOptions, setMonthOptions] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(ALL_TIME);

  const [bdSortField, setBdSortField] = useState<BdSortField>("points");
  const [bdSortDirection, setBdSortDirection] =
    useState<SortDirection>("desc");

  async function refresh() {
    setLoading(true);

    try {
      const data = await fetchMasters(category);
      data.sort((a, b) => a.label.localeCompare(b.label));
      setItems(data);

      if (category === "bd") {
        const { data: records } = await supabase
          .from("records")
          .select("bd_id, points, money, package_amount, event_date");

        const { data: trackingStats } = await supabase
          .from("bd_tracking_stats")
          .select("bd_id, new_customers, new_hot_list");

        const allRecords = records ?? [];

        const months = Array.from(
          new Set(
            allRecords
              .map((r) => r.event_date?.slice(0, 7))
              .filter(Boolean) as string[]
          )
        ).sort((a, b) => b.localeCompare(a));

        setMonthOptions(months);

        const filteredRecords =
          selectedMonth === ALL_TIME
            ? allRecords
            : allRecords.filter(
                (r) => r.event_date?.slice(0, 7) === selectedMonth
              );

        const map: Record<
          string,
          { points: number; money: number; packageAmount: number | null }
        > = {};

        filteredRecords.forEach((r) => {
          if (!r.bd_id) return;

          if (!map[r.bd_id]) {
            map[r.bd_id] = { points: 0, money: 0, packageAmount: null };
          }

          map[r.bd_id].points += r.points ?? 0;
          map[r.bd_id].money += r.money ?? 0;

          if (r.package_amount != null) {
            map[r.bd_id].packageAmount =
              (map[r.bd_id].packageAmount ?? 0) + r.package_amount;
          }
        });

        setTotals(map);

        const trackingMap: Record<
          string,
          { newCustomers: number; newHotList: number }
        > = {};

        (trackingStats ?? []).forEach((r) => {
          if (!r.bd_id) return;

          trackingMap[r.bd_id] = {
            newCustomers: r.new_customers ?? 0,
            newHotList: r.new_hot_list ?? 0,
          };
        });

        setTrackingTotals(trackingMap);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [category, selectedMonth]);

  useEffect(() => {
    const handler = () => refresh();

    window.addEventListener("records-updated", handler);

    return () => {
      window.removeEventListener("records-updated", handler);
    };
  }, [selectedMonth]);

  function openCreate() {
    setEditing(null);
    setLabel("");
    setErrorMessage("");
    setOpen(true);
  }

  function openEdit(item: MasterItem) {
    setEditing(item);
    setLabel(item.label);
    setErrorMessage("");
    setOpen(true);
  }

  const isDuplicateName = useMemo(() => {
    const normalized = normalizeName(label);
    if (!normalized) return false;

    return items.some((item) => {
      if (editing && item.id === editing.id) return false;
      return normalizeName(item.label) === normalized;
    });
  }, [items, label, editing]);

  useEffect(() => {
    if (!label.trim()) {
      setErrorMessage("");
      return;
    }

    if (isDuplicateName) {
      setErrorMessage(`${ui.singular} name already exists.`);
    } else {
      setErrorMessage("");
    }
  }, [label, isDuplicateName, ui.singular]);

  const isSaveDisabled = !label.trim() || isDuplicateName;

  const sortedItems = useMemo(() => {
    const arr = [...items];

    if (category !== "bd") {
      return arr;
    }

    function getSortValue(id: string, field: BdSortField) {
      switch (field) {
        case "newCustomers":
          return trackingTotals[id]?.newCustomers ?? 0;
        case "newHotList":
          return trackingTotals[id]?.newHotList ?? 0;
        case "money":
          return totals[id]?.money ?? 0;
        case "points":
        default:
          return totals[id]?.points ?? 0;
      }
    }

    arr.sort((a, b) => {
      const primaryA = getSortValue(a.id, bdSortField);
      const primaryB = getSortValue(b.id, bdSortField);

      if (primaryA !== primaryB) {
        return bdSortDirection === "desc"
          ? primaryB - primaryA
          : primaryA - primaryB;
      }

      const ALL_FIELDS = [
        "newCustomers",
        "newHotList",
        "points",
        "money",
      ] as const;

      const fallbackFields = ALL_FIELDS.filter(
        (field) => field !== bdSortField
      );

      for (const field of fallbackFields) {
        const fallbackA = getSortValue(a.id, field);
        const fallbackB = getSortValue(b.id, field);

        if (fallbackA !== fallbackB) {
          return bdSortDirection === "desc"
            ? fallbackB - fallbackA
            : fallbackA - fallbackB;
        }
      }

      return a.label.localeCompare(b.label);
    });

    return arr;
  }, [items, totals, trackingTotals, category, bdSortField, bdSortDirection]);

  const bdMedalMap = useMemo(() => {
    if (category !== "bd") return {};

    function getSortValue(id: string, field: BdSortField) {
      switch (field) {
        case "newCustomers":
          return trackingTotals[id]?.newCustomers ?? 0;
        case "newHotList":
          return trackingTotals[id]?.newHotList ?? 0;
        case "money":
          return totals[id]?.money ?? 0;
        case "points":
        default:
          return totals[id]?.points ?? 0;
      }
    }

    const map: Record<string, string> = {};

    const rankedItems = sortedItems.filter((item) => {
      const value = getSortValue(item.id, bdSortField);
      return value > 0;
    });

    const medalTargets =
      bdSortDirection === "desc"
        ? rankedItems.slice(0, 3)
        : rankedItems.slice(-3).reverse();

    medalTargets.forEach((item, index) => {
      const medal = getMedalByIndex(index);
      if (medal) {
        map[item.id] = medal;
      }
    });

    return map;
  }, [category, sortedItems, bdSortField, bdSortDirection, totals, trackingTotals]);

  async function onSave() {
    if (isSaveDisabled) return;

    const trimmedLabel = label.trim();

    if (editing) {
      await updateMaster(editing.id, {
        label: trimmedLabel,
      });
    } else {
      const generatedCode = generateCode(trimmedLabel);

      await createMaster({
        category,
        code: generatedCode,
        label: trimmedLabel,
        sort_order: items.length + 1,
        is_active: true,
      });
    }

    invalidateMastersCache(category);
    await refresh();
    window.dispatchEvent(new Event("masters-updated"));

    setOpen(false);
    setLabel("");
    setErrorMessage("");
  }

  async function onDelete(id: string) {
    const columnMap: Record<MasterCategory, string> = {
      bd: "bd_id",
      bd_level: "bd_level_id",
      customer_type: "customer_type_id",
      point_type: "point_type_id",
    };

    const column = columnMap[category];

    const { count, error } = await supabase
      .from("records")
      .select("*", { count: "exact", head: true })
      .eq(column, id);

    if (error) {
      console.error("Failed to check related records:", error);
      return;
    }

    if ((count ?? 0) > 0) {
      setShowInUseDialog(true);
      return;
    }

    await deleteMaster(id);

    invalidateMastersCache(category);
    await refresh();
    window.dispatchEvent(new Event("masters-updated"));
  }

  function renderTable(list: MasterItem[], startIndex: number) {
    return (
      <div className="overflow-hidden rounded-xl border">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[900px] table-fixed text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-[100px] p-2 text-left">#</th>
                <th className="w-[140px] p-2 text-left">Name</th>
                {category === "bd" && (
                  <>
                    <th className="w-[140px] p-2 text-right">New Customers</th>
                    <th className="w-[140px] p-2 text-right">New In Hot List</th>
                    <th className="w-[140px] p-2 text-right">Points</th>
                    <th className="w-[140px] p-2 text-right">Bonus</th>
                    <th className="w-[140px] p-2 text-right">Package Amount</th>
                  </>
                )}
                {isAdmin && <th className="w-[100px] p-2 text-right">Action</th>}
              </tr>
            </thead>

            <tbody>
              {list.map((it, index) => {
                const realIndex = startIndex + index;

                const displayRank =
                  category === "bd" && bdSortDirection === "asc"
                    ? sortedItems.length - realIndex
                    : realIndex + 1;

                return (
                  <tr key={it.id} className="border-t odd:bg-muted/30">
                    <td className="p-2 text-muted-foreground">
                      {category === "bd" && bdMedalMap[it.id] ? (
                        <span className="text-base leading-none">
                          {bdMedalMap[it.id]}
                        </span>
                      ) : (
                        displayRank
                      )}
                    </td>

                    <td className="truncate p-2" title={it.label}>
                      {it.label}
                    </td>

                    {category === "bd" && (
                      <>
                        <td className="truncate overflow-hidden whitespace-nowrap p-2 text-right tabular-nums">
                          {(trackingTotals[it.id]?.newCustomers ?? 0).toLocaleString("en-US")}
                        </td>

                        <td className="truncate overflow-hidden whitespace-nowrap p-2 text-right tabular-nums">
                          {(trackingTotals[it.id]?.newHotList ?? 0).toLocaleString("en-US")}
                        </td>

                        <td className="truncate overflow-hidden whitespace-nowrap p-2 text-right tabular-nums">
                          {(totals[it.id]?.points ?? 0).toLocaleString("en-US")}
                        </td>

                        <td className="truncate overflow-hidden whitespace-nowrap p-2 text-right tabular-nums">
                          {(totals[it.id]?.money ?? 0).toLocaleString("en-US")}
                        </td>

                        <td className="truncate overflow-hidden whitespace-nowrap p-2 text-right tabular-nums">
                          {(() => {
                            const packageAmount = totals[it.id]?.packageAmount;
                            return packageAmount != null
                              ? packageAmount.toLocaleString("en-US")
                              : "—";
                          })()}
                        </td>
                      </>
                    )}

                    {isAdmin && (
                      <td className="p-2 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 cursor-pointer"
                            onClick={() => openEdit(it)}
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 cursor-pointer"
                            onClick={() => onDelete(it.id)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {category === "bd" && (
            <>
              <div className="flex h-9 shrink-0 items-center gap-2 rounded-md border px-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />

                <div className="w-[140px]">
                  <Select
                    value={bdSortField}
                    onValueChange={(value) => setBdSortField(value as BdSortField)}
                  >
                    <SelectTrigger className="h-8 border-0 px-2 shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newCustomers">New Customers</SelectItem>
                      <SelectItem value="newHotList">New In Hot List</SelectItem>
                      <SelectItem value="points">Points</SelectItem>
                      <SelectItem value="money">Bonus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-[110px]">
                  <Select
                    value={bdSortDirection}
                    onValueChange={(value) =>
                      setBdSortDirection(value as SortDirection)
                    }
                  >
                    <SelectTrigger className="h-8 border-0 px-2 shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">High → Low</SelectItem>
                      <SelectItem value="asc">Low → High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="shrink-0">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="inline-flex h-9 min-w-[140px] w-auto gap-2">
                    <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value={ALL_TIME}>All Time</SelectItem>

                    {monthOptions.map((month) => (
                      <SelectItem key={month} value={month}>
                        {formatMonthLabel(month)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {isAdmin && (
            <Button
              className="flex h-9 cursor-pointer items-center gap-2"
              onClick={openCreate}
            >
              <Plus className="h-4 w-4" />
              {ui.addButton}
            </Button>
          )}
        </div>
      </div>

      {renderTable(sortedItems, 0)}

      {!loading && items.length === 0 && (
        <div className="p-4 text-sm text-muted-foreground">No data</div>
      )}

      {loading && (
        <div className="p-4 text-sm text-muted-foreground">Loading...</div>
      )}

      {isAdmin && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {editing ? ui.editDialogTitle : ui.addDialogTitle}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-sm font-medium text-foreground">
                  {ui.fieldLabel}
                </p>

                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={ui.fieldPlaceholder}
                />

                {errorMessage && (
                  <p className="mt-1 text-sm text-destructive">
                    {errorMessage}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="secondary"
                className="cursor-pointer"
                onClick={() => {
                  setOpen(false);
                  setErrorMessage("");
                }}
              >
                Cancel
              </Button>

              <Button
                className="cursor-pointer"
                onClick={onSave}
                disabled={isSaveDisabled}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {isAdmin && (
        <Dialog open={showInUseDialog} onOpenChange={setShowInUseDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                Cannot Delete
              </DialogTitle>
            </DialogHeader>

            <p className="text-sm text-muted-foreground">
              This type is currently used in existing records.
              <br />
              <br />
              Please go to the <b>Home</b> page and delete those records first.
            </p>

            <DialogFooter>
              <Button
                className="cursor-pointer"
                onClick={() => setShowInUseDialog(false)}
              >
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}