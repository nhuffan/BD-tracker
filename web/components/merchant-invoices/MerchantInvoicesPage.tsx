"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  PlusCircle,
  ReceiptText,
  Search,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  formatMonthLabel,
  getMonthKey,
  resolveInvoiceStatus,
} from "@/lib/features/merchant-invoices/invoices";
import type { MerchantInvoiceRow, MerchantInvoiceStatus } from "./utils/types";
import InvoiceDialog from "./InvoiceDialog";
import InvoiceImageDialog from "./InvoiceImageDialog";
import InvoiceTable from "./InvoiceTable";
import MoneyText from "./MoneyText";

const ALL = "__all__";

type StatusFilter = typeof ALL | MerchantInvoiceStatus;

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === "\"" && inQuotes && next === "\"") {
      current += "\"";
      i++;
      continue;
    }

    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function escapeCsv(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, "\"\"")}"`;
}

async function deleteCloudinaryImages(row: MerchantInvoiceRow) {
  const items = (row.proof_images ?? [])
    .filter((item) => item.public_id)
    .map((item) => ({
      public_id: item.public_id,
      resource_type: item.resource_type,
    }));

  if (!items.length) return;

  await fetch("/api/cloudinary/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items }),
  });
}

export default function MerchantInvoicesPage({
  isAdmin,
}: {
  isAdmin: boolean;
}) {
  const [rows, setRows] = useState<MerchantInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<MerchantInvoiceRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MerchantInvoiceRow | null>(null);
  const [mutating, setMutating] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("merchant_invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch merchant invoices:", error);
      toast.error("Không thể tải danh sách hóa đơn.");
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as MerchantInvoiceRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const channel = supabase
      .channel("merchant-invoices-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "merchant_invoices",
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

  const nextSequenceNo = useMemo(() => {
    if (!rows.length) return 1;
    return Math.max(...rows.map((row) => row.sequence_no || 0)) + 1;
  }, [rows]);

  const monthOptions = useMemo(() => {
    const months = Array.from(
      new Set([getCurrentMonthKey(), ...rows.map((row) => getMonthKey(row.created_at))])
    )
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a));

    return [ALL, ...months];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return [...rows]
      .filter((row) => {
        if (selectedMonth !== ALL && getMonthKey(row.created_at) !== selectedMonth) {
          return false;
        }

        if (statusFilter !== ALL && row.status !== statusFilter) {
          return false;
        }

        if (!keyword) return true;

        const values = [
          row.merchant,
          row.contract_number ?? "",
          row.company_name,
          row.company_address ?? "",
          row.tax_code,
          row.invoice_email ?? "",
        ];

        return values.some((value) => value.toLowerCase().includes(keyword));
      })
      .sort((a, b) => {
        if (a.sequence_no !== b.sequence_no) return a.sequence_no - b.sequence_no;
        return a.created_at.localeCompare(b.created_at);
      });
  }, [rows, search, selectedMonth, statusFilter]);

  const stats = useMemo(() => {
    const scopedRows =
      selectedMonth === ALL
        ? rows
        : rows.filter((row) => getMonthKey(row.created_at) === selectedMonth);

    const byStatus = {
      not_ready: scopedRows.filter((row) => row.status === "not_ready"),
      ready: scopedRows.filter((row) => row.status === "ready"),
      issued: scopedRows.filter((row) => row.status === "issued"),
    };

    return {
      total: scopedRows.length,
      totalAmount: scopedRows.reduce((sum, row) => sum + Number(row.invoice_amount || 0), 0),
      notReadyCount: byStatus.not_ready.length,
      notReadyAmount: byStatus.not_ready.reduce(
        (sum, row) => sum + Number(row.invoice_amount || 0),
        0
      ),
      readyCount: byStatus.ready.length,
      readyAmount: byStatus.ready.reduce(
        (sum, row) => sum + Number(row.invoice_amount || 0),
        0
      ),
      issuedCount: byStatus.issued.length,
      issuedAmount: byStatus.issued.reduce(
        (sum, row) => sum + Number(row.invoice_amount || 0),
        0
      ),
    };
  }, [rows, selectedMonth]);

  function openCreate() {
    setEditingInvoice(null);
    setOpenDialog(true);
  }

  function openEdit(row: MerchantInvoiceRow) {
    if (!isAdmin) return;
    setEditingInvoice(row);
    setOpenDialog(true);
  }

  async function markIssued(row: MerchantInvoiceRow) {
    if (!isAdmin || mutating || row.status === "issued") return;

    setMutating(true);
    try {
      const { error } = await supabase
        .from("merchant_invoices")
        .update({
          status: "issued",
          issued_at: new Date().toISOString(),
          version: (row.version ?? 1) + 1,
        })
        .eq("id", row.id);

      if (error) {
        toast.error(error.message || "Không thể chuyển trạng thái hóa đơn.");
        return;
      }

      toast.success("Đã chuyển hóa đơn sang trạng thái Đã xuất!");
      await refresh();
    } finally {
      setMutating(false);
    }
  }

  async function deleteInvoice() {
    if (!deleteTarget || mutating) return;

    setMutating(true);
    try {
      const { error } = await supabase
        .from("merchant_invoices")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) {
        toast.error(error.message || "Không thể xóa hóa đơn.");
        return;
      }

      await deleteCloudinaryImages(deleteTarget);
      toast.success("Đã xóa hóa đơn khỏi danh sách!");
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
      "Contract Number",
      "Invoice Amount",
      "VAT Rate",
      "Company Name",
      "Company Address",
      "Tax Code",
      "Invoice Email",
      "Status",
      "Created At",
    ];

    const lines = filteredRows.map((row) =>
      [
        row.sequence_no,
        row.merchant,
        row.contract_number ?? "",
        row.invoice_amount,
        row.vat_rate,
        row.company_name,
        row.company_address ?? "",
        row.tax_code,
        row.invoice_email ?? "",
        row.status,
        row.created_at,
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
    link.download = `merchant_invoices_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function importCsv(file: File) {
    if (!isAdmin) return;

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim());

    if (lines.length <= 1) {
      toast.error("File CSV đang trống.");
      return;
    }

    const payload = lines.slice(1).map((line, index) => {
      const cols = parseCsvLine(line);
      const invoiceAmount = Number(String(cols[3] ?? "").replace(/[^\d.]/g, "")) || 0;
      const row = {
        sequence_no: nextSequenceNo + index,
        merchant: cols[1] || cols[0] || "Merchant",
        contract_number: cols[2] || null,
        invoice_amount: invoiceAmount,
        vat_rate: Number(String(cols[4] ?? "10").replace(/[^\d.]/g, "")) || 10,
        company_name: cols[5] || cols[1] || "Company",
        company_address: cols[6] || null,
        tax_code: cols[7] || "",
        invoice_email: cols[8] || null,
        proof_images: [],
      };

      return {
        ...row,
        status: resolveInvoiceStatus(row),
      };
    });

    const validPayload = payload.filter((row) => row.merchant && row.tax_code);

    if (!validPayload.length) {
      toast.error("Không tìm thấy dòng hóa đơn hợp lệ.");
      return;
    }

    const { error } = await supabase.from("merchant_invoices").insert(validPayload);

    if (error) {
      toast.error(error.message || "Không thể nhập CSV.");
      return;
    }

    toast.success(`Đã nhập thành công ${validPayload.length} hóa đơn từ file CSV!`);
    await refresh();
  }

  const statCards = [
    {
      key: "not_ready" as StatusFilter,
      label: "Hóa Đơn Chưa Xuất",
      count: stats.notReadyCount,
      amount: stats.notReadyAmount,
      icon: AlertCircle,
      className:
        "border-red-200 bg-red-50 hover:border-red-400 dark:border-red-900/70 dark:bg-red-950/35 dark:hover:border-red-700",
      activeClassName: "border-red-400 ring-2 ring-red-400/25 dark:border-red-700",
      textClassName: "text-red-700 dark:text-red-300",
      valueClassName: "text-red-700 dark:text-red-300",
      countClassName:
        "border-red-200 bg-white/80 text-red-700 dark:border-red-900/70 dark:bg-red-950/50 dark:text-red-300",
    },
    {
      key: "ready" as StatusFilter,
      label: "Hóa Đơn Chờ Xuất",
      count: stats.readyCount,
      amount: stats.readyAmount,
      icon: Clock,
      className:
        "border-amber-200 bg-amber-50 hover:border-amber-400 dark:border-amber-900/70 dark:bg-amber-950/35 dark:hover:border-amber-700",
      activeClassName: "border-amber-400 ring-2 ring-amber-400/25 dark:border-amber-700",
      textClassName: "text-amber-700 dark:text-amber-300",
      valueClassName: "text-amber-700 dark:text-amber-300",
      countClassName:
        "border-amber-200 bg-white/80 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/50 dark:text-amber-300",
    },
    {
      key: "issued" as StatusFilter,
      label: "Hóa Đơn Đã Xuất",
      count: stats.issuedCount,
      amount: stats.issuedAmount,
      icon: CheckCircle2,
      className:
        "border-emerald-200 bg-emerald-50 hover:border-emerald-400 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:hover:border-emerald-700",
      activeClassName: "border-emerald-400 ring-2 ring-emerald-400/25 dark:border-emerald-700",
      textClassName: "text-emerald-700 dark:text-emerald-300",
      valueClassName: "text-emerald-700 dark:text-emerald-300",
      countClassName:
        "border-emerald-200 bg-white/80 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-300",
    },
    {
      key: ALL as StatusFilter,
      label: "Tổng Cộng Tất Cả",
      count: stats.total,
      amount: stats.totalAmount,
      icon: ReceiptText,
      className:
        "border-primary/10 bg-muted/40 hover:border-primary/30 dark:border-white/10 dark:bg-muted/70 dark:hover:border-primary/40",
      activeClassName: "border-primary/40 ring-2 ring-primary/20 dark:border-primary/50",
      textClassName: "text-muted-foreground",
      valueClassName: "text-foreground",
      countClassName: "border-primary/20 bg-background text-foreground dark:bg-background/70",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const active = statusFilter === card.key;

          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setStatusFilter(active ? ALL : card.key)}
              className={[
                "cursor-pointer rounded-xl border p-4 text-left shadow-xs transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-md",
                card.className,
                active ? card.activeClassName : "",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3">
                <div
                  className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${card.textClassName}`}
                >
                  <Icon className="h-4 w-4" />
                  {card.label}
                </div>
                <Badge variant="outline" className={card.countClassName}>
                  {card.count} mục
                </Badge>
              </div>
              <div className={`mt-3 font-mono font-extrabold ${card.valueClassName}`}>
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
                    ? `Tất cả (${rows.length} HĐ)`
                    : `${formatMonthLabel(month)} (${rows.filter((row) => getMonthKey(row.created_at) === month).length} HĐ)`}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 rounded-lg border bg-muted p-1 text-xs">
            {[
              ["not_ready", "Chưa xuất"],
              ["ready", "Chờ xuất"],
              ["issued", "Đã xuất"],
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
              placeholder="Tìm theo Merchant, MST, Tên đơn vị..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={exportCsv} className="cursor-pointer">
            <Download className="h-4 w-4" />
            Xuất Excel
          </Button>

          {isAdmin && (
            <>
              <Button onClick={openCreate} className="cursor-pointer">
                <PlusCircle className="h-4 w-4" />
                Tạo hoá đơn
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importCsv(file);
                  event.target.value = "";
                }}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer"
              >
                <Upload className="h-4 w-4" />
                Nhập CSV
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
        <span>
          Hiển thị <strong className="text-primary">{filteredRows.length}</strong> /{" "}
          {rows.length} hóa đơn
          {selectedMonth !== ALL && ` (${formatMonthLabel(selectedMonth)})`}
          {statusFilter !== ALL &&
            ` • Trạng thái: ${
              statusFilter === "not_ready"
                ? "Chưa xuất"
                : statusFilter === "ready"
                  ? "Chờ xuất"
                  : "Đã xuất"
            }`}
        </span>
        {loading && (
          <span className="flex items-center gap-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Đang tải
          </span>
        )}
      </div>

      <InvoiceTable
        rows={filteredRows}
        isAdmin={isAdmin}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
        onMarkIssued={(row) => void markIssued(row)}
        onOpenImage={setLightboxUrl}
      />

      {isAdmin && (
        <InvoiceDialog
          open={openDialog}
          onOpenChange={setOpenDialog}
          onSaved={refresh}
          invoice={editingInvoice}
          existingInvoices={rows}
          nextSequenceNo={nextSequenceNo}
        />
      )}

      <InvoiceImageDialog
        imageUrl={lightboxUrl}
        onOpenChange={(open) => {
          if (!open) setLightboxUrl(null);
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Xóa hóa đơn?"
        description={`Thao tác này sẽ xóa vĩnh viễn hóa đơn #${deleteTarget?.contract_number ?? ""} của "${
          deleteTarget?.merchant ?? ""
        }"`}
        loading={mutating}
        onConfirm={() => void deleteInvoice()}
      />
    </div>
  );
}
