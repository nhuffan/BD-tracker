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
import { ArrowUpDown, CalendarDays } from "lucide-react";

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

type SortDirection = "asc" | "desc";
type BdSortField = "points" | "money";

export default function MasterManager({
  category,
  isAdmin,
}: {
  category: MasterCategory;
  isAdmin: boolean;
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
    Record<string, { points: number; money: number }>
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
          .select("bd_id, points, money, event_date");

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

        const map: Record<string, { points: number; money: number }> = {};

        filteredRecords.forEach((r) => {
          if (!r.bd_id) return;

          if (!map[r.bd_id]) {
            map[r.bd_id] = { points: 0, money: 0 };
          }

          map[r.bd_id].points += r.points ?? 0;
          map[r.bd_id].money += r.money ?? 0;
        });

        setTotals(map);
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

    arr.sort((a, b) => {
      const aPoints = totals[a.id]?.points ?? 0;
      const bPoints = totals[b.id]?.points ?? 0;
      const aMoney = totals[a.id]?.money ?? 0;
      const bMoney = totals[b.id]?.money ?? 0;

      const primaryA = bdSortField === "points" ? aPoints : aMoney;
      const primaryB = bdSortField === "points" ? bPoints : bMoney;

      if (primaryA !== primaryB) {
        return bdSortDirection === "desc"
          ? primaryB - primaryA
          : primaryA - primaryB;
      }

      const secondaryA = bdSortField === "points" ? aMoney : aPoints;
      const secondaryB = bdSortField === "points" ? bMoney : bPoints;

      if (secondaryA !== secondaryB) {
        return bdSortDirection === "desc"
          ? secondaryB - secondaryA
          : secondaryA - secondaryB;
      }

      return a.label.localeCompare(b.label);
    });

    return arr;
  }, [items, totals, category, bdSortField, bdSortDirection]);

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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="text-base font-semibold whitespace-nowrap">
          {ui.title}
        </div>

        <div className="flex-1" />

        {category === "bd" && (
          <>
            <div className="flex shrink-0 items-center gap-2 rounded-md border px-2 h-9">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />

              <div className="w-[100px]">
                <Select
                  value={bdSortField}
                  onValueChange={(value) => setBdSortField(value as BdSortField)}
                >
                  <SelectTrigger className="border-0 h-8 shadow-none px-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="points">Points</SelectItem>
                    <SelectItem value="money">Money</SelectItem>
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
                  <SelectTrigger className="border-0 h-8 shadow-none px-2">
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
                <SelectTrigger className="h-9 inline-flex min-w-[140px] w-auto gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
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
          <Button className="cursor-pointer h-9" onClick={openCreate}>
            {ui.addButton}
          </Button>
        )}
      </div>

      <div className="border rounded-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <colgroup>
              <col style={{ width: "6%" }} />
              <col style={{ width: category === "bd" ? (isAdmin ? "36%" : "60%") : (isAdmin ? "74%" : "94%") }} />
              {category === "bd" && (
                <>
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "18%" }} />
                </>
              )}
              {isAdmin && (
                <col style={{ width: category === "bd" ? "24%" : "20%" }} />
              )}
            </colgroup>

            <thead className="bg-muted/50">
              <tr>
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">Name</th>

                {category === "bd" && (
                  <>
                    <th className="p-2 text-right">Points</th>
                    <th className="p-2 text-right">Money</th>
                  </>
                )}

                {isAdmin && <th className="p-2 text-right">Action</th>}
              </tr>
            </thead>

            <tbody>
              {sortedItems.map((it, index) => (
                <tr key={it.id} className="border-t">
                  <td className="p-2 text-muted-foreground">{index + 1}</td>

                  <td className="p-2 truncate" title={it.label}>
                    {it.label}
                  </td>

                  {category === "bd" && (
                    <>
                      <td className="p-2 text-right tabular-nums">
                        {(totals[it.id]?.points ?? 0).toLocaleString("en-US")}
                      </td>

                      <td className="p-2 text-right tabular-nums">
                        {(totals[it.id]?.money ?? 0).toLocaleString("en-US")}
                      </td>
                    </>
                  )}

                  {isAdmin && (
                    <td className="p-2 text-right">
                      <div className="inline-flex items-center gap-2 whitespace-nowrap">
                        <Button
                          className="cursor-pointer"
                          variant="secondary"
                          onClick={() => openEdit(it)}
                        >
                          Edit
                        </Button>

                        <Button
                          className="cursor-pointer"
                          variant="destructive"
                          onClick={() => onDelete(it.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && items.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground">No data</div>
        )}

        {loading && (
          <div className="p-4 text-sm text-muted-foreground">Loading...</div>
        )}
      </div>

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