"use client";

import { Check, ChevronDown, Copy, Landmark, Lock, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
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
  formatTransferDate,
  TRANSFER_STATUS_LABEL,
} from "@/lib/features/merchant-transfers/transfers";
import type { MerchantTransferRow, MerchantTransferStatus } from "./utils/types";
import MoneyText from "@/components/merchant-invoices/MoneyText";

function statusClass(status: MerchantTransferStatus) {
  if (status === "transferred") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300";
  }
  if (status === "ready") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300";
  }
  return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300";
}

function ClampedText({
  value,
  className = "",
  lines = 2,
}: {
  value?: string | null;
  className?: string;
  lines?: 1 | 2 | 3;
}) {
  const display = value?.trim() || "—";

  return (
    <span
      title={display}
      className={[
        lines === 1
          ? "block max-w-full truncate"
          : [
              "overflow-hidden whitespace-normal break-words [display:-webkit-box] [-webkit-box-orient:vertical] [overflow-wrap:anywhere]",
              lines === 2 ? "[-webkit-line-clamp:2]" : "[-webkit-line-clamp:3]",
            ].join(" "),
        className,
      ].join(" ")}
    >
      {display}
    </span>
  );
}

export default function TransferTable({
  rows,
  isAdmin,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  rows: MerchantTransferRow[];
  isAdmin: boolean;
  onEdit: (row: MerchantTransferRow) => void;
  onDelete: (row: MerchantTransferRow) => void;
  onStatusChange: (row: MerchantTransferRow, status: MerchantTransferStatus) => void;
}) {
  const [copiedId, setCopiedId] = useState("");
  const [statusMenu, setStatusMenu] = useState<{
    row: MerchantTransferRow;
    left: number;
    top: number;
  } | null>(null);

  async function copyText(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(""), 1400);
  }

  function toggleStatusMenu(row: MerchantTransferRow, element: HTMLButtonElement) {
    if (statusMenu?.row.id === row.id) {
      setStatusMenu(null);
      return;
    }

    const rect = element.getBoundingClientRect();
    const menuWidth = 190;
    const menuHeight = 128;
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
      <div className="rounded-xl border bg-card p-12 text-center text-card-foreground">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Landmark className="h-7 w-7" />
        </div>
        <div className="mt-4 text-base font-bold">No transactions found</div>
        <div className="mt-1 text-sm text-muted-foreground">
          No transactions match the current filters.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-xl border bg-card">
        <Table className="text-sm">
          <TableHeader className="bg-muted/50 [&_th]:border-r [&_th]:border-border/70 [&_th:last-child]:border-r-0">
            <TableRow>
              <TableHead className="w-14 p-3 text-center font-semibold">NO.</TableHead>
              <TableHead className="w-[190px] p-3 font-semibold">MERCHANT</TableHead>
              <TableHead className="min-w-[150px] p-3 text-left font-semibold">AMOUNT</TableHead>
              <TableHead className="min-w-[150px] p-3 font-semibold">ACCOUNT NUMBER</TableHead>
              <TableHead className="min-w-[200px] p-3 font-semibold">ACCOUNT HOLDER</TableHead>
              <TableHead className="min-w-[140px] p-3 font-semibold">BANK</TableHead>
              <TableHead className="min-w-[170px] p-3 font-semibold">BRANCH</TableHead>
              <TableHead className="p-3 text-center font-semibold">STATUS</TableHead>
              <TableHead className="p-3 text-center font-semibold">COMPLETION DATE</TableHead>
              {isAdmin && <TableHead className="w-28 p-3 text-center font-semibold">ACTIONS</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody className="[&_td]:border-r [&_td]:border-border/60 [&_td:last-child]:border-r-0">
            {rows.map((row) => {
              const locked = row.status === "transferred";

              return (
                <TableRow key={row.id}>
                  <TableCell className="p-3 text-center text-muted-foreground">
                    {row.sequence_no}
                  </TableCell>
                  <TableCell className="w-[190px] min-w-[190px] max-w-[190px] whitespace-normal p-3 font-medium">
                    <ClampedText value={row.merchant} lines={3} className="leading-snug text-foreground" />
                  </TableCell>
                  <TableCell className="p-3 text-left text-foreground">
                    <div className="group flex items-center justify-between gap-2">
                      <MoneyText
                        amount={row.amount}
                        amountClassName="text-[15px] font-semibold"
                        currencyClassName="relative top-[1px] text-sm"
                      />
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => void copyText(String(row.amount), `${row.id}-amount`)}
                        title="Copy amount"
                        className="cursor-pointer opacity-60 group-hover:opacity-100"
                      >
                        {copiedId === `${row.id}-amount` ? <Check /> : <Copy />}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="p-3 text-sm">
                    <div className="flex items-center justify-between gap-2 group">
                      <ClampedText value={row.account_number} lines={1} />
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => void copyText(row.account_number, `${row.id}-account`)}
                        title="Copy account number"
                        className="cursor-pointer opacity-60 group-hover:opacity-100"
                      >
                        {copiedId === `${row.id}-account` ? <Check /> : <Copy />}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="p-3 text-sm font-semibold uppercase tracking-tight">
                    <div className="flex items-center justify-between gap-2 group">
                      <ClampedText value={row.account_holder} lines={2} />
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => void copyText(row.account_holder, `${row.id}-holder`)}
                        title="Copy account holder"
                        className="cursor-pointer opacity-60 group-hover:opacity-100"
                      >
                        {copiedId === `${row.id}-holder` ? <Check /> : <Copy />}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="p-3 font-medium">
                    <ClampedText value={row.bank_name} lines={2} />
                  </TableCell>
                  <TableCell className="p-3 text-sm text-muted-foreground">
                    <ClampedText value={row.branch} lines={2} />
                  </TableCell>
                  <TableCell className="p-3 text-center align-middle">
                    {locked ? (
                      <Badge
                        variant="outline"
                        className={`${statusClass(row.status)} gap-1.5 uppercase`}
                        title="Transferred — status is locked"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {TRANSFER_STATUS_LABEL[row.status]}
                        <Lock className="h-3 w-3" />
                      </Badge>
                    ) : (
                      <button
                        type="button"
                        onClick={(event) => toggleStatusMenu(row, event.currentTarget)}
                        className={`${statusClass(row.status)} inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase shadow-xs transition`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        <span>{TRANSFER_STATUS_LABEL[row.status]}</span>
                        <ChevronDown className="h-3 w-3 opacity-60" />
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="p-3 text-center text-sm text-primary">
                    {row.status === "transferred" ? formatTransferDate(row.completion_date) : "—"}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={locked}
                          onClick={() => onEdit(row)}
                          title={locked ? "Transferred — editing is disabled" : "Edit"}
                          className="cursor-pointer"
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onDelete(row)}
                          title="Delete"
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
            aria-label="Close status menu"
            className="fixed inset-0 z-[9998] cursor-default bg-transparent"
            onClick={() => setStatusMenu(null)}
          />
          <div
            style={{
              left: `${statusMenu.left}px`,
              top: `${statusMenu.top}px`,
              width: "190px",
            }}
            className="fixed z-[9999] rounded-xl border bg-popover p-1.5 text-left text-popover-foreground shadow-2xl ring-1 ring-border"
          >
            <div className="border-b px-2 py-1 text-[10px] font-semibold text-muted-foreground">
              Change status
            </div>
            {(["not_transferred", "ready", "transferred"] as MerchantTransferStatus[]).map(
              (statusValue) => (
                <button
                  key={statusValue}
                  type="button"
                  onClick={() => {
                    onStatusChange(statusMenu.row, statusValue);
                    setStatusMenu(null);
                  }}
                  className={`${statusClass(statusValue)} mt-1 flex w-full cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition hover:brightness-95`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {TRANSFER_STATUS_LABEL[statusValue]}
                </button>
              )
            )}
          </div>
        </>
      )}
    </>
  );
}
