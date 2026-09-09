"use client";

import { DragEvent, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileCheck2,
  FileSpreadsheet,
  Loader2,
  RotateCcw,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  createStatementOfAccount,
  parseReconciliationWorkbook,
  type ReconciliationData,
} from "@/lib/features/reconciliation/reconciliation";

const TEMPLATE_URL = "/templates/soa-mt-life-monthly.xlsx";

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

export default function ReconciliationPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [data, setData] = useState<ReconciliationData | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function readFile(file: File) {
    if (!/\.xlsx?$/i.test(file.name)) {
      setData(null);
      setError("Vui lòng chọn file Excel .xlsx hoặc .xls.");
      return;
    }

    setReading(true);
    setError("");
    try {
      const parsed = parseReconciliationWorkbook(await file.arrayBuffer(), file.name);
      setData(parsed);
      toast.success(`Đã đọc ${parsed.rows.length} giao dịch đối soát.`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Không thể đọc file đối soát.";
      setData(null);
      setError(message);
      toast.error(message);
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void readFile(file);
  }

  async function exportSoa() {
    if (!data || exporting) return;

    setExporting(true);
    try {
      const response = await fetch(TEMPLATE_URL);
      if (!response.ok) throw new Error("Không tải được template SOA MT LIFE.");
      const output = await createStatementOfAccount(await response.arrayBuffer(), data);
      const url = URL.createObjectURL(output.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = output.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Đã xuất file SOA theo template MT LIFE.");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Không thể xuất file SOA.";
      toast.error(message);
    } finally {
      setExporting(false);
    }
  }

  function reset() {
    setData(null);
    setError("");
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Đối soát</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Tải file đối soát lên, kiểm tra dữ liệu và xuất Statement of Account theo mẫu MT LIFE.
          </p>
        </div>

        {data ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={reset} disabled={exporting}>
              <RotateCcw />
              Chọn file khác
            </Button>
            <Button onClick={() => void exportSoa()} disabled={exporting}>
              {exporting ? <Loader2 className="animate-spin" /> : <Download />}
              {exporting ? "Đang xuất..." : "Xuất SOA"}
            </Button>
          </div>
        ) : null}
      </div>

      {!data ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex min-h-[360px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition-colors ${
            dragging
              ? "border-primary bg-primary/5"
              : "border-border bg-card hover:border-primary/60 hover:bg-muted/30"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void readFile(file);
            }}
          />
          {reading ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 font-semibold">Đang đọc file đối soát...</p>
            </>
          ) : (
            <>
              <div className="rounded-2xl bg-primary/10 p-4 text-primary">
                <UploadCloud className="h-10 w-10" />
              </div>
              <p className="mt-5 text-lg font-semibold text-foreground">
                Kéo thả file đối soát vào đây
              </p>
              <p className="mt-1 text-sm text-muted-foreground">hoặc bấm để chọn file Excel</p>
              <span className="mt-4 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                Hỗ trợ .xlsx và .xls
              </span>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold">Dữ liệu hợp lệ và sẵn sàng xuất</p>
                <p className="mt-1 truncate text-sm opacity-90">{data.sourceFileName}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Giao dịch" value={data.rows.length.toLocaleString("vi-VN")} />
            <SummaryCard label="Tổng giá combo" value={formatVnd(data.totals.comboPrice)} />
            <SummaryCard
              label={`Phí dịch vụ${data.serviceFeeRate === null ? "" : ` (${data.serviceFeeRate}%)`}`}
              value={formatVnd(data.totals.serviceFee)}
            />
            <SummaryCard label="Tiền đối soát" value={formatVnd(data.totals.reconciliationAmount)} />
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex flex-col gap-2 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-foreground">Dữ liệu sẽ điền vào SOA</h2>
                <p className="text-sm text-muted-foreground">
                  Kỳ {data.monthLabel}
                  {data.statementId ? ` · Bill ID ${data.statementId}` : ""}
                  {data.merchantName ? ` · ${data.merchantName}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4" />
                Sheet nguồn: {data.sheetName}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-center">STT</th>
                    <th className="px-4 py-3">Thời gian</th>
                    <th className="px-4 py-3">Mã đơn</th>
                    <th className="px-4 py-3">Mã sản phẩm</th>
                    <th className="px-4 py-3">Tên sản phẩm</th>
                    <th className="px-4 py-3 text-right">Giá combo</th>
                    <th className="px-4 py-3 text-right">Phí dịch vụ</th>
                    <th className="px-4 py-3 text-right">Tiền đối soát</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, index) => (
                    <tr key={`${row.orderId}-${row.productId}-${index}`} className="border-t">
                      <td className="px-4 py-3 text-center text-muted-foreground">{index + 1}</td>
                      <td className="whitespace-nowrap px-4 py-3">{row.reconciledAt}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium">{row.orderId}</td>
                      <td className="whitespace-nowrap px-4 py-3">{row.productId}</td>
                      <td className="max-w-[280px] px-4 py-3">{row.productName}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                        {formatVnd(row.comboPrice)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                        {formatVnd(row.serviceFee)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">
                        {formatVnd(row.reconciliationAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 bg-amber-50 font-semibold text-amber-950 dark:bg-amber-950/30 dark:text-amber-200">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-right">Tổng cộng</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                      {formatVnd(data.totals.comboPrice)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                      {formatVnd(data.totals.serviceFee)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                      {formatVnd(data.totals.reconciliationAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Không thể đọc file</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
