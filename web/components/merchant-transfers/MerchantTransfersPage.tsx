"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Landmark,
  Loader2,
  Plus,
  Search,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  formatMonthLabel,
  formatTransferDate,
  getMonthKey,
  getNextAvailableSequenceNo,
  TRANSFER_STATUS_LABEL,
} from "@/lib/features/merchant-transfers/transfers";
import type { MerchantTransferRow, MerchantTransferStatus } from "./utils/types";
import MoneyText from "@/components/merchant-invoices/MoneyText";
import TransferDialog from "./TransferDialog";
import TransferTable from "./TransferTable";

const ALL = "__all__";

type StatusFilter = typeof ALL | MerchantTransferStatus;

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function escapeCsv(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, "\"\"")}"`;
}

function statusCardClass(status: MerchantTransferStatus | "total") {
  if (status === "transferred") {
    return {
      card: "border-emerald-200 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-300",
      countClassName: "border-emerald-200 bg-white/70 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
    };
  }
  if (status === "ready") {
    return {
      card: "border-amber-200 bg-amber-50/70 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-300",
      countClassName: "border-amber-200 bg-white/70 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
    };
  }
  if (status === "not_transferred") {
    return {
      card: "border-red-200 bg-red-50/70 text-red-700 dark:border-red-900/70 dark:bg-red-950/35 dark:text-red-300",
      countClassName: "border-red-200 bg-white/70 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300",
    };
  }
  return {
    card: "border-border bg-card text-foreground",
    countClassName: "border-border bg-background text-foreground",
  };
}

export default function MerchantTransfersPage({ isAdmin }: { isAdmin: boolean }) {
  const [rows, setRows] = useState<MerchantTransferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<MerchantTransferRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MerchantTransferRow | null>(null);
  const [dialogBusy, setDialogBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("merchant_transfers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch merchant transfers:", error);
      toast.error("Không thể tải danh sách chuyển khoản.");
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as MerchantTransferRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const channel = supabase
      .channel("merchant-transfers-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "merchant_transfers",
        },
        () => {
          void refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const nextSequenceNo = useMemo(() => getNextAvailableSequenceNo(rows), [rows]);
  const isTableBusy = loading || mutating || dialogBusy;

  const monthOptions = useMemo(() => {
    const months = Array.from(
      new Set([getCurrentMonthKey(), ...rows.map((row) => getMonthKey(row.transaction_date))])
    )
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a));

    return [ALL, ...months];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return [...rows]
      .filter((row) => {
        if (selectedMonth !== ALL && getMonthKey(row.transaction_date) !== selectedMonth) {
          return false;
        }

        if (statusFilter !== ALL && row.status !== statusFilter) {
          return false;
        }

        if (!keyword) return true;

        const values = [
          row.merchant,
          row.account_number,
          row.account_holder,
          row.bank_name,
          row.branch ?? "",
        ];

        return values.some((value) => value.toLowerCase().includes(keyword));
      })
      .sort((a, b) => {
        if (a.sequence_no !== b.sequence_no) return a.sequence_no - b.sequence_no;
        return a.created_at.localeCompare(b.created_at);
      });
  }, [rows, search, selectedMonth, statusFilter]);

  const stats = useMemo(() => {
    const byStatus = {
      not_transferred: rows.filter((row) => row.status === "not_transferred"),
      ready: rows.filter((row) => row.status === "ready"),
      transferred: rows.filter((row) => row.status === "transferred"),
    };

    return {
      total: rows.length,
      totalAmount: rows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
      notTransferredCount: byStatus.not_transferred.length,
      notTransferredAmount: byStatus.not_transferred.reduce(
        (sum, row) => sum + Number(row.amount || 0),
        0
      ),
      readyCount: byStatus.ready.length,
      readyAmount: byStatus.ready.reduce((sum, row) => sum + Number(row.amount || 0), 0),
      transferredCount: byStatus.transferred.length,
      transferredAmount: byStatus.transferred.reduce(
        (sum, row) => sum + Number(row.amount || 0),
        0
      ),
      merchants: new Set(rows.map((row) => row.merchant.trim().toLowerCase()).filter(Boolean))
        .size,
    };
  }, [rows]);

  function openCreate() {
    setEditingTransfer(null);
    setOpenDialog(true);
  }

  function openEdit(row: MerchantTransferRow) {
    if (!isAdmin || row.status === "transferred") return;
    setEditingTransfer(row);
    setOpenDialog(true);
  }

  async function updateStatus(row: MerchantTransferRow, status: MerchantTransferStatus) {
    if (!isAdmin || mutating) return;

    if (row.status === "transferred" && status !== "transferred") {
      toast.warning("Giao dịch đã chuyển khoản không thể đổi lại trạng thái khác.");
      return;
    }

    setMutating(true);
    try {
      const { error } = await supabase
        .from("merchant_transfers")
        .update({
          status,
          completion_date:
            status === "transferred" && row.status !== "transferred"
              ? new Date().toISOString().slice(0, 10)
              : row.completion_date,
          version: (row.version ?? 1) + 1,
        })
        .eq("id", row.id);

      if (error) {
        toast.error(error.message || "Không thể chuyển trạng thái.");
        return;
      }

      toast.success(`Đã chuyển sang ${TRANSFER_STATUS_LABEL[status]}.`);
      await refresh();
    } finally {
      setMutating(false);
    }
  }

  async function deleteTransfer() {
    if (!deleteTarget || mutating) return;

    setMutating(true);
    try {
      const { error } = await supabase
        .from("merchant_transfers")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) {
        toast.error(error.message || "Không thể xóa giao dịch.");
        return;
      }

      toast.success("Đã xóa giao dịch chuyển khoản!");
      setDeleteTarget(null);
      await refresh();
    } finally {
      setMutating(false);
    }
  }

  function exportCsv() {
    const headers = [
      "STT",
      "Merchant",
      "Amount",
      "Account Number",
      "Account Holder",
      "Bank Name",
      "Branch",
      "Status",
      "Transaction Date",
      "Completion Date",
    ];

    const lines = filteredRows.map((row) =>
      [
        row.sequence_no,
        row.merchant,
        row.amount,
        row.account_number,
        row.account_holder,
        row.bank_name,
        row.branch ?? "",
        TRANSFER_STATUS_LABEL[row.status],
        formatTransferDate(row.transaction_date),
        row.status === "transferred" ? formatTransferDate(row.completion_date) : "",
      ]
        .map(escapeCsv)
        .join(",")
    );

    const blob = new Blob(["\uFEFF" + [headers.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `merchant_transfers_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const statCards = [
    {
      key: "not_transferred",
      label: "Chưa chuyển khoản",
      icon: AlertCircle,
      amount: stats.notTransferredAmount,
      count: stats.notTransferredCount,
      filter: "not_transferred" as StatusFilter,
      ...statusCardClass("not_transferred"),
    },
    {
      key: "ready",
      label: "Chờ chuyển khoản",
      icon: Clock,
      amount: stats.readyAmount,
      count: stats.readyCount,
      filter: "ready" as StatusFilter,
      ...statusCardClass("ready"),
    },
    {
      key: "transferred",
      label: "Đã chuyển khoản",
      icon: CheckCircle2,
      amount: stats.transferredAmount,
      count: stats.transferredCount,
      filter: "transferred" as StatusFilter,
      ...statusCardClass("transferred"),
    },
    {
      key: "total",
      label: "Tổng cộng tất cả",
      icon: Wallet,
      amount: stats.totalAmount,
      count: stats.total,
      filter: ALL as StatusFilter,
      ...statusCardClass("total"),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="py-2">
        <h1 className="flex items-center gap-2 text-[30px] font-extrabold tracking-tight text-foreground">
          <Landmark className="h-7 w-7 text-primary" />
          Quản Lý Giao Dịch
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const active = statusFilter === card.filter;

          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setStatusFilter(card.filter)}
              className={[
                "cursor-pointer rounded-xl border p-4 text-left shadow-xs transition hover:-translate-y-0.5 hover:shadow-md",
                card.card,
                active ? "ring-2 ring-current/30" : "",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase">
                  <Icon className="h-4 w-4" />
                  {card.label}
                </div>
                <Badge variant="outline" className={card.countClassName}>
                  {card.count} mục
                </Badge>
              </div>
              <div className="mt-3 font-mono font-extrabold">
                <MoneyText
                  amount={card.amount}
                  amountClassName="text-xl"
                  currencyClassName="relative top-[0.2em] text-lg font-extrabold"
                />
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="cursor-pointer bg-transparent text-sm font-medium outline-none"
            >
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {month === ALL
                    ? `Tất cả (${rows.length} GD)`
                    : `${formatMonthLabel(month)} (${rows.filter((row) => getMonthKey(row.transaction_date) === month).length} GD)`}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 rounded-lg border bg-muted p-1 text-xs">
            {[
              ["not_transferred", "Chưa chuyển"],
              ["ready", "Chờ chuyển"],
              ["transferred", "Đã chuyển"],
              [ALL, "Tất cả"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value as StatusFilter)}
                className={[
                  "cursor-pointer rounded-md px-2.5 py-1 font-medium transition",
                  statusFilter === value
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo Merchant, STK, chủ TK, ngân hàng..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <Button onClick={openCreate} className="cursor-pointer">
              <Plus className="h-4 w-4" />
              Tạo giao dịch
            </Button>
          )}
          <Button
            variant="outline"
            onClick={exportCsv}
            disabled={filteredRows.length === 0}
            className="cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Xuất Excel
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
        <span>
          Hiển thị <strong className="text-primary">{filteredRows.length}</strong> / {rows.length}{" "}
          giao dịch
          {selectedMonth !== ALL && ` (${formatMonthLabel(selectedMonth)})`}
          {statusFilter !== ALL && ` • Trạng thái: ${TRANSFER_STATUS_LABEL[statusFilter]}`}
          {` • ${stats.merchants} merchant`}
        </span>
        {loading && (
          <span className="flex items-center gap-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Đang tải
          </span>
        )}
      </div>

      <div className="relative overflow-hidden rounded-xl">
        {isTableBusy && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-background/55 backdrop-blur-[1px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        <div className={isTableBusy ? "pointer-events-none" : ""}>
          <TransferTable
            rows={filteredRows}
            isAdmin={isAdmin}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
            onStatusChange={(row, status) => void updateStatus(row, status)}
          />
        </div>
      </div>

      {isAdmin && (
        <TransferDialog
          open={openDialog}
          onOpenChange={setOpenDialog}
          onSaved={refresh}
          onBusyChange={setDialogBusy}
          transfer={editingTransfer}
          existingTransfers={rows}
          nextSequenceNo={nextSequenceNo}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Xóa giao dịch chuyển khoản?"
        description={`Thao tác này sẽ xóa vĩnh viễn giao dịch #${deleteTarget?.sequence_no ?? ""} của "${
          deleteTarget?.merchant ?? ""
        }"`}
        loading={mutating}
        onConfirm={() => void deleteTransfer()}
      />
    </div>
  );
}
