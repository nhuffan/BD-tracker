"use client";

import { Check, ChevronDown, Copy, Eye, Pencil, Receipt, Trash2, ZoomIn } from "lucide-react";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  calculatePreVat,
  formatCleanNumber,
  formatDateTime,
  getPrimaryImage,
  INVOICE_STATUS_LABEL,
} from "@/lib/features/merchant-invoices/invoices";
import type { MerchantInvoiceRow, MerchantInvoiceStatus } from "./utils/types";
import MoneyText from "./MoneyText";

function statusClass(status: MerchantInvoiceStatus) {
  if (status === "issued") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300";
  }
  if (status === "ready") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300";
  }
  return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300";
}

function ClampedText({
  value,
  title,
  lines = 2,
  className = "",
}: {
  value?: string | null;
  title?: string;
  lines?: 1 | 2;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ left: 0, top: 0 });
  const textRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const displayValue = value?.trim() || "-";
  const fullValue = title || displayValue;

  function openPopover(element: HTMLElement) {
    const textElement = textRef.current;
    const isClamped = textElement
      ? textElement.scrollHeight > textElement.clientHeight + 1 ||
        textElement.scrollWidth > textElement.clientWidth + 1
      : false;

    if (!isClamped || fullValue === "-") {
      setOpen(false);
      return;
    }

    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    const rect = element.getBoundingClientRect();
    const popoverWidth = 360;
    const estimatedHeight = 132;
    const left = Math.min(
      Math.max(10, rect.left),
      window.innerWidth - popoverWidth - 10
    );
    const top =
      rect.bottom + estimatedHeight + 8 > window.innerHeight
        ? Math.max(10, rect.top - estimatedHeight - 8)
        : rect.bottom + 6;

    setPopoverPos({ left, top });
    setOpen(true);
  }

  function closePopover() {
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 140);
  }

  function keepPopoverOpen() {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  async function copyValue() {
    await navigator.clipboard.writeText(fullValue);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div
      onMouseEnter={(event) => openPopover(event.currentTarget)}
      onMouseLeave={closePopover}
      onFocus={(event) => openPopover(event.currentTarget)}
      onBlur={closePopover}
    >
      <div
        ref={textRef}
        className={[
          lines === 1
            ? "block max-w-full truncate"
            : "overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]",
          className,
        ].join(" ")}
      >
        {displayValue}
      </div>

      {open && (
        <div
          style={{
            left: `${popoverPos.left}px`,
            top: `${popoverPos.top}px`,
            width: "360px",
          }}
          className="fixed z-[9999] rounded-lg border bg-popover p-2 text-left text-xs text-popover-foreground shadow-xl"
          onMouseEnter={keepPopoverOpen}
          onMouseLeave={closePopover}
        >
          <div className="max-h-40 overflow-auto whitespace-pre-wrap break-words pr-1 leading-relaxed text-foreground select-text">
            {fullValue}
          </div>
          <button
            type="button"
            onClick={() => void copyValue()}
            className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-md border bg-background px-2 py-1 text-[11px] font-semibold text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Đã copy" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}

function ProofImagePreview({
  src,
  alt,
  onOpen,
}: {
  src: string;
  alt: string;
  onOpen: (src: string) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  if (!src) {
    return (
      <div className="mx-auto flex h-16 w-14 items-center justify-center rounded-md border border-dashed bg-muted text-[10px] text-muted-foreground">
        Chưa có ảnh
      </div>
    );
  }

  const zoomWidth = 320;
  const zoomHeight = 440;
  const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const screenHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const leftPos =
    mousePos.x + zoomWidth + 30 > screenWidth
      ? Math.max(10, mousePos.x - zoomWidth - 20)
      : mousePos.x + 20;
  const topPos = Math.min(
    Math.max(10, mousePos.y - zoomHeight / 2),
    screenHeight - zoomHeight - 20
  );

  return (
    <div
      className="group relative inline-block cursor-pointer select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={(event) => setMousePos({ x: event.clientX, y: event.clientY })}
      onClick={() => onOpen(src)}
    >
      <div className="relative flex h-16 w-14 items-center justify-center overflow-hidden rounded-lg border bg-muted shadow-xs transition group-hover:border-primary group-hover:shadow-sm">
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover object-top"
          loading="lazy"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-foreground/35 text-background opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100">
          <ZoomIn className="h-4 w-4" />
        </div>
      </div>

      {isHovered && (
        <div
          style={{
            position: "fixed",
            left: `${leftPos}px`,
            top: `${topPos}px`,
            width: `${zoomWidth}px`,
            height: `${zoomHeight}px`,
            zIndex: 9999,
          }}
          className="pointer-events-none flex flex-col overflow-hidden rounded-xl border border-primary/70 bg-popover p-2 text-popover-foreground shadow-2xl"
        >
          <div className="flex items-center justify-between rounded-t-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            <span className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Xem phóng to minh chứng
            </span>
            <span className="rounded bg-primary-foreground/15 px-1.5 py-0.5 text-[10px]">
              Nhấp để xem full
            </span>
          </div>
          <div className="mt-1 flex flex-1 items-center justify-center overflow-hidden rounded-b-lg bg-muted p-1">
            <img src={src} alt={alt} className="h-full w-full rounded object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function InvoiceTable({
  rows,
  isAdmin,
  onEdit,
  onDelete,
  onMarkIssued,
  onOpenImage,
}: {
  rows: MerchantInvoiceRow[];
  isAdmin: boolean;
  onEdit: (row: MerchantInvoiceRow) => void;
  onDelete: (row: MerchantInvoiceRow) => void;
  onMarkIssued: (row: MerchantInvoiceRow) => void;
  onOpenImage: (url: string) => void;
}) {
  const [copiedId, setCopiedId] = useState("");
  const [statusMenu, setStatusMenu] = useState<{
    row: MerchantInvoiceRow;
    left: number;
    top: number;
  } | null>(null);

  async function copyPreVat(row: MerchantInvoiceRow) {
    const { preVatAmount } = calculatePreVat(row.invoice_amount, row.vat_rate);
    await navigator.clipboard.writeText(formatCleanNumber(preVatAmount));
    setCopiedId(row.id);
    window.setTimeout(() => setCopiedId(""), 1600);
  }

  function toggleStatusMenu(row: MerchantInvoiceRow, element: HTMLButtonElement) {
    if (statusMenu?.row.id === row.id) {
      setStatusMenu(null);
      return;
    }

    const rect = element.getBoundingClientRect();
    const menuWidth = 176;
    const menuHeight = 86;
    const left = Math.min(
      Math.max(10, rect.left + rect.width / 2 - menuWidth / 2),
      window.innerWidth - menuWidth - 10
    );
    const top =
      rect.bottom + menuHeight + 8 > window.innerHeight
        ? Math.max(10, rect.top - menuHeight - 8)
        : rect.bottom + 6;

    setStatusMenu({ row, left, top });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center text-card-foreground">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Receipt className="h-7 w-7" />
        </div>
        <div className="mt-4 text-base font-bold">Chưa tìm thấy hóa đơn nào</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Không có kết quả trùng khớp với bộ lọc tháng, trạng thái hoặc từ khóa tìm kiếm. Vui lòng thay đổi bộ lọc hoặc bấm &quot;+ Tạo mục mới&quot;.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-visible rounded-lg border bg-card">
        <Table className="text-sm">
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-14 p-3 text-center font-semibold">STT</TableHead>
            <TableHead className="p-3 font-semibold">MERCHANT</TableHead>
            <TableHead className="p-3 font-semibold">SỐ HỢP ĐỒNG</TableHead>
            <TableHead className="min-w-[250px] p-3 text-right font-semibold">
              SỐ TIỀN (TRƯỚC & SAU VAT)
            </TableHead>
            <TableHead className="min-w-[220px] p-3 font-semibold">TÊN ĐƠN VỊ</TableHead>
            <TableHead className="min-w-[200px] p-3 font-semibold">ĐỊA CHỈ</TableHead>
            <TableHead className="p-3 font-semibold">MÃ SỐ THUẾ</TableHead>
            <TableHead className="p-3 font-semibold">EMAIL</TableHead>
            <TableHead className="p-3 text-center font-semibold">MINH CHỨNG</TableHead>
            <TableHead className="p-3 text-center font-semibold">TRẠNG THÁI</TableHead>
            <TableHead className="p-3 font-semibold">NGÀY TẠO</TableHead>
            {isAdmin && <TableHead className="w-28 p-3 text-center font-semibold">THAO TÁC</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const { preVatAmount } = calculatePreVat(row.invoice_amount, row.vat_rate);
            const image = getPrimaryImage(row);
            const imageUrl = image?.secure_url || image?.url || "";

            return (
              <TableRow key={row.id}>
                <TableCell className="p-3 text-center text-muted-foreground">
                  {row.sequence_no}
                </TableCell>
                <TableCell className="max-w-[180px] p-3 font-medium">
                  <ClampedText value={row.merchant} className="leading-snug" />
                </TableCell>
                <TableCell className="p-3 text-sm">
                  <ClampedText value={row.contract_number} className="leading-snug" />
                </TableCell>
                <TableCell className="p-3 text-right">
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-sm font-semibold text-muted-foreground">
                        Trước VAT ({row.vat_rate}%):
                      </span>
                      <MoneyText
                        amount={preVatAmount}
                        className="text-[15px] font-semibold text-emerald-700 dark:text-emerald-300"
                      />
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="outline"
                        onClick={() => void copyPreVat(row)}
                        title="Sao chép số tiền thuần trước VAT (VD: 56584727) để dán vào Excel/Chat"
                        className="cursor-pointer"
                      >
                        {copiedId === row.id ? <Check /> : <Copy />}
                      </Button>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      Tổng xuất (Đã VAT):{" "}
                      <MoneyText
                        amount={row.invoice_amount}
                        className="text-sm font-semibold text-foreground"
                      />
                    </span>
                  </div>
                </TableCell>
                <TableCell className="max-w-[260px] whitespace-normal p-3">
                  <ClampedText
                    value={row.company_name}
                    className="font-semibold leading-snug text-foreground"
                  />
                </TableCell>
                <TableCell className="w-[200px] min-w-[200px] whitespace-normal p-3 text-sm leading-relaxed text-muted-foreground">
                  <ClampedText value={row.company_address} className="leading-relaxed" />
                </TableCell>
                <TableCell className="p-3 text-sm">
                  <ClampedText value={row.tax_code} className="leading-snug" />
                </TableCell>
                <TableCell className="max-w-[170px] p-3 text-sm text-primary">
                  <ClampedText value={row.invoice_email} lines={1} className="leading-snug" />
                </TableCell>
                <TableCell className="p-3 text-center">
                  <ProofImagePreview
                    src={imageUrl}
                    alt={`Minh chứng ${row.merchant}`}
                    onOpen={onOpenImage}
                  />
                </TableCell>
                <TableCell className="p-3 text-center align-middle">
                  {row.status === "issued" ? (
                    <Badge
                      variant="outline"
                      className={`${statusClass(row.status)} gap-1.5 uppercase`}
                      title="Trạng thái Đã xuất đã cố định, không thể thay đổi"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {INVOICE_STATUS_LABEL[row.status]}
                      <span className="text-xs">🔒</span>
                    </Badge>
                  ) : (
                    <div className="relative inline-block">
                      <button
                        type="button"
                        onClick={(event) => toggleStatusMenu(row, event.currentTarget)}
                        className={`${statusClass(row.status)} inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase shadow-xs transition`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        <span>{INVOICE_STATUS_LABEL[row.status]}</span>
                        <ChevronDown className="h-3 w-3 opacity-60" />
                      </button>
                    </div>
                  )}
                </TableCell>
                <TableCell className="p-3 text-sm text-muted-foreground">
                  <ClampedText
                    value={formatDateTime(row.created_at)}
                    title={new Date(row.created_at).toLocaleString("vi-VN")}
                    className="leading-snug"
                  />
                </TableCell>
                {isAdmin && (
                  <TableCell className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(row)}
                        title="Chỉnh sửa"
                        className="cursor-pointer"
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onDelete(row)}
                        title="Xóa"
                        className="cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
        </Table>
      </div>

      {statusMenu && (
        <>
          <button
            type="button"
            aria-label="Đóng menu trạng thái"
            className="fixed inset-0 z-[9998] cursor-default bg-transparent"
            onClick={() => setStatusMenu(null)}
          />
          <div
            style={{
              left: `${statusMenu.left}px`,
              top: `${statusMenu.top}px`,
              width: "176px",
            }}
            className="fixed z-[9999] rounded-xl border bg-popover p-1.5 text-left text-popover-foreground shadow-2xl ring-1 ring-border"
          >
            <div className="border-b px-2 py-1 text-[10px] font-semibold text-muted-foreground">
              Chuyển trạng thái
            </div>
            <button
              type="button"
            onClick={() => {
                onMarkIssued(statusMenu.row);
                setStatusMenu(null);
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/35"
            >
              <Check className="h-3.5 w-3.5" />
              Đánh dấu Đã xuất
            </button>
          </div>
        </>
      )}
    </>
  );
}
