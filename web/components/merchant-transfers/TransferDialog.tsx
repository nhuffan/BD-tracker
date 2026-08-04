"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  formatMoneyInput,
  parseMoneyInput,
  POPULAR_BANKS,
  TRANSFER_STATUS_LABEL,
} from "@/lib/features/merchant-transfers/transfers";
import type {
  MerchantTransferFormValues,
  MerchantTransferRow,
  MerchantTransferStatus,
} from "./utils/types";
import MoneyText from "@/components/merchant-invoices/MoneyText";

const fieldClass =
  "!h-11 h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm shadow-none placeholder:font-medium placeholder:text-muted-foreground/65";

const selectClass =
  `${fieldClass} appearance-none cursor-pointer pr-10`;

const labelClass = "mb-2 block text-xs font-bold text-muted-foreground";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function toDateInputValue(value?: string | null) {
  if (!value) return todayIsoDate();
  return value.slice(0, 10);
}

function statusClass(status: MerchantTransferStatus) {
  if (status === "transferred") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300";
  }
  if (status === "ready") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300";
  }
  return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300";
}

export default function TransferDialog({
  open,
  onOpenChange,
  onSaved,
  onBusyChange,
  transfer,
  existingTransfers,
  nextSequenceNo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
  onBusyChange?: (busy: boolean) => void;
  transfer?: MerchantTransferRow | null;
  existingTransfers: MerchantTransferRow[];
  nextSequenceNo: number;
}) {
  const isEditMode = !!transfer;
  const skipNextMerchantChangeRef = useRef(false);

  const [sequenceNo, setSequenceNo] = useState(nextSequenceNo);
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [bankName, setBankName] = useState("MB Bank");
  const [customBankName, setCustomBankName] = useState("");
  const [branch, setBranch] = useState("");
  const [status, setStatus] = useState<MerchantTransferStatus>("not_transferred");
  const [transactionDate, setTransactionDate] = useState(todayIsoDate);
  const [autoFillNotice, setAutoFillNotice] = useState("");
  const [showMerchantSuggestions, setShowMerchantSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);

  const merchantLookupRows = useMemo(() => {
    const keyword = merchant.trim().toLowerCase();
    if (!keyword) return [];

    const latestByMerchant = new Map<string, MerchantTransferRow>();
    existingTransfers.forEach((item) => {
      const key = item.merchant.trim().toLowerCase();
      if (key && !latestByMerchant.has(key)) latestByMerchant.set(key, item);
    });

    return Array.from(latestByMerchant.values())
      .filter((row) =>
        [row.merchant, row.account_number, row.account_holder, row.bank_name, row.branch ?? ""].some(
          (value) => value.toLowerCase().includes(keyword)
        )
      )
      .slice(0, 5);
  }, [existingTransfers, merchant]);

  const numericAmount = parseMoneyInput(amount);
  const isLocked = transfer?.status === "transferred";
  const finalBankName = bankName === "__other__" ? customBankName.trim() : bankName;
  const canSave =
    !saving &&
    merchant.trim() &&
    numericAmount > 0 &&
    accountNumber.trim() &&
    accountHolder.trim() &&
    finalBankName;

  useEffect(() => {
    if (!open) return;

    if (transfer) {
      setSequenceNo(transfer.sequence_no);
      setMerchant(transfer.merchant ?? "");
      setAmount(transfer.amount ? formatMoneyInput(transfer.amount) : "");
      setAccountNumber(transfer.account_number ?? "");
      setAccountHolder(transfer.account_holder ?? "");
      setBankName(POPULAR_BANKS.includes(transfer.bank_name) ? transfer.bank_name : "__other__");
      setCustomBankName(POPULAR_BANKS.includes(transfer.bank_name) ? "" : transfer.bank_name);
      setBranch(transfer.branch ?? "");
      setStatus(transfer.status);
      setTransactionDate(toDateInputValue(transfer.transaction_date));
      setAutoFillNotice("");
      setShowMerchantSuggestions(false);
      setSaving(false);
      return;
    }

    setSequenceNo(nextSequenceNo);
    setMerchant("");
    setAmount("");
    setAccountNumber("");
    setAccountHolder("");
    setBankName("MB Bank");
    setCustomBankName("");
    setBranch("");
    setStatus("not_transferred");
    setTransactionDate(todayIsoDate());
    setAutoFillNotice("");
    setShowMerchantSuggestions(false);
    setSaving(false);
  }, [open, transfer, nextSequenceNo]);

  function applyMerchantLookup(row: MerchantTransferRow) {
    skipNextMerchantChangeRef.current = true;
    setMerchant(row.merchant);
    setAccountNumber(row.account_number);
    setAccountHolder(row.account_holder);
    setBankName(POPULAR_BANKS.includes(row.bank_name) ? row.bank_name : "__other__");
    setCustomBankName(POPULAR_BANKS.includes(row.bank_name) ? "" : row.bank_name);
    setBranch(row.branch ?? "");
    setAutoFillNotice(`Đã tự động điền thông tin ngân hàng từ lần nhập trước của ${row.merchant}.`);
    setShowMerchantSuggestions(false);
  }

  function handleMerchantChange(value: string) {
    setMerchant(value);
    setShowMerchantSuggestions(Boolean(value.trim()));

    if (skipNextMerchantChangeRef.current) {
      skipNextMerchantChangeRef.current = false;
      return;
    }

    const exact = existingTransfers.find(
      (row) => row.merchant.trim().toLowerCase() === value.trim().toLowerCase()
    );

    if (exact) applyMerchantLookup(exact);
    else setAutoFillNotice("");
  }

  function selectFirstMerchantSuggestion(value: string) {
    const keyword = value.trim().toLowerCase();
    const first = merchantLookupRows.find((row) =>
      row.merchant.trim().toLowerCase().includes(keyword)
    );

    if (!first) return false;
    applyMerchantLookup(first);
    return true;
  }

  async function saveTransfer() {
    if (!canSave) return;

    setSaving(true);
    onBusyChange?.(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload: MerchantTransferFormValues = {
        id: transfer?.id,
        sequence_no: sequenceNo,
        merchant: merchant.trim(),
        amount: numericAmount,
        account_number: accountNumber.trim(),
        account_holder: accountHolder.trim().toUpperCase(),
        bank_name: finalBankName || "Khác",
        branch: branch.trim() || null,
        status,
        transaction_date: transactionDate,
        completion_date:
          status === "transferred"
            ? transfer?.completion_date ?? todayIsoDate()
            : transfer?.completion_date ?? null,
      };

      if (isEditMode && transfer?.id) {
        const { error } = await supabase
          .from("merchant_transfers")
          .update({
            sequence_no: payload.sequence_no,
            merchant: payload.merchant,
            amount: payload.amount,
            account_number: payload.account_number,
            account_holder: payload.account_holder,
            bank_name: payload.bank_name,
            branch: payload.branch,
            status: payload.status,
            transaction_date: payload.transaction_date,
            completion_date:
              payload.status === "transferred" && transfer.status !== "transferred"
                ? todayIsoDate()
                : payload.completion_date,
            version: (transfer.version ?? 1) + 1,
          })
          .eq("id", transfer.id);

        if (error) {
          toast.error(error.message || "Không thể cập nhật giao dịch chuyển khoản.");
          return;
        }

        toast.success("Đã cập nhật giao dịch chuyển khoản!");
      } else {
        const { error } = await supabase.from("merchant_transfers").insert({
          sequence_no: payload.sequence_no,
          merchant: payload.merchant,
          amount: payload.amount,
          account_number: payload.account_number,
          account_holder: payload.account_holder,
          bank_name: payload.bank_name,
          branch: payload.branch,
          status: payload.status,
          transaction_date: payload.transaction_date,
          completion_date: payload.status === "transferred" ? todayIsoDate() : null,
          created_by_user_id: user?.id ?? null,
        });

        if (error) {
          toast.error(error.message || "Không thể tạo mới giao dịch chuyển khoản.");
          return;
        }

        toast.success("Đã tạo giao dịch chuyển khoản!");
      }

      onOpenChange(false);
      await onSaved();
    } finally {
      setSaving(false);
      onBusyChange?.(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !saving && onOpenChange(nextOpen)}>
      <DialogContent
        className="flex max-h-[90vh] w-[72vw] max-w-none min-w-[920px] flex-col overflow-hidden rounded-xl border bg-background p-0 shadow-xl"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className="border-b px-6 py-4">
          <div className="mb-2 flex w-fit items-center gap-2 rounded-md border bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
            <ClipboardList className="h-3.5 w-3.5" />
            STT #{sequenceNo}
          </div>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <Building2 className="h-5 w-5 text-primary" />
            {isEditMode ? "Chỉnh Sửa Giao Dịch Chuyển Khoản" : "Thêm Lượt Chuyển Khoản Mới"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Tự động gợi ý và điền thông tin tài khoản nếu Merchant đã tồn tại.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-2">
          <div>
            <div className="relative">
              <label className={labelClass}>
                Tên Merchant <span className="text-destructive">*</span>
              </label>
              <Input
                required
                value={merchant}
                onChange={(event) => handleMerchantChange(event.target.value)}
                onFocus={() => setShowMerchantSuggestions(true)}
                onBlur={() => window.setTimeout(() => setShowMerchantSuggestions(false), 120)}
                onKeyDownCapture={(event) => {
                  if (event.key === "Enter" && selectFirstMerchantSuggestion(event.currentTarget.value)) {
                    event.preventDefault();
                    event.stopPropagation();
                  }
                }}
                placeholder="Ví dụ: Phở Việt Nam, Lao Lu Guan..."
                className={fieldClass}
              />
              {showMerchantSuggestions && merchantLookupRows.length > 0 && (
                <div className="absolute left-0 right-0 top-[72px] z-50 overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-xl">
                  {merchantLookupRows.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => applyMerchantLookup(row)}
                      className="flex w-full cursor-pointer flex-col rounded-lg px-3 py-2 text-left text-sm transition hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="font-semibold">{row.merchant}</span>
                      <span className="text-xs text-muted-foreground">
                        {row.account_number} · {row.bank_name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {autoFillNotice && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-medium text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Sparkles className="h-4 w-4 shrink-0" />
              {autoFillNotice}
            </div>
          )}

          <div>
            <label className={labelClass}>
              Số Tiền <span className="text-destructive">*</span>
            </label>
            <Input
              inputMode="numeric"
              required
              value={amount}
              onChange={(event) => setAmount(formatMoneyInput(event.target.value))}
              placeholder="35.976.600 ₫"
              className={`${fieldClass} font-extrabold placeholder:font-medium`}
            />
            {numericAmount > 0 && (
              <div className="mt-1 text-xs text-muted-foreground">
                Định dạng:{" "}
                <MoneyText
                  amount={numericAmount}
                  className="font-mono font-bold text-primary"
                  currencyClassName="relative top-[0.14em]"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>
                Số Tài Khoản <span className="text-destructive">*</span>
              </label>
              <Input
                required
                value={accountNumber}
                onChange={(event) => setAccountNumber(event.target.value)}
                placeholder="Nhập STK..."
                className={`${fieldClass} font-mono`}
              />
            </div>
            <div>
              <label className={labelClass}>
                Chủ Tài Khoản <span className="text-destructive">*</span>
              </label>
              <Input
                required
                value={accountHolder}
                onChange={(event) => setAccountHolder(event.target.value.toUpperCase())}
                placeholder="NGUYEN VAN A..."
                className={`${fieldClass} uppercase font-semibold`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>
                Ngân Hàng <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <select
                  value={bankName}
                  onChange={(event) => setBankName(event.target.value)}
                  className={selectClass}
                >
                  {POPULAR_BANKS.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                  <option value="__other__">Ngân hàng khác...</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground opacity-70" />
              </div>
              {bankName === "__other__" && (
                <Input
                  value={customBankName}
                  onChange={(event) => setCustomBankName(event.target.value)}
                  placeholder="Nhập tên ngân hàng..."
                  className="mt-2"
                />
              )}
            </div>
            <div>
              <label className={labelClass}>Chi Nhánh</label>
              <Input
                value={branch}
                onChange={(event) => setBranch(event.target.value)}
                placeholder="Phú Nhuận, Hồ Chí Minh..."
                className={fieldClass}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                Trạng Thái Chuyển Khoản
              </label>
              <span
                className={[
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold",
                  statusClass(status),
                ].join(" ")}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {status === "transferred" ? "🔒 " : ""}
                {TRANSFER_STATUS_LABEL[status]}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Ngày Giao Dịch</label>
                <Input
                  type="date"
                  value={transactionDate}
                  onChange={(event) => setTransactionDate(event.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Tình Trạng</label>
                <div className="relative">
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as MerchantTransferStatus)}
                    disabled={isLocked}
                    className={`${selectClass} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <option value="not_transferred">Chưa chuyển khoản</option>
                    <option value="ready">Chờ chuyển khoản</option>
                    <option value="transferred">Đã chuyển khoản (Khóa)</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground opacity-70" />
                </div>
                {isLocked && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    Giao dịch đã ở trạng thái {TRANSFER_STATUS_LABEL.transferred} và không thể thay đổi.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="cursor-pointer"
          >
            Hủy
          </Button>
          <Button onClick={saveTransfer} disabled={!canSave} className="cursor-pointer">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {isEditMode ? "Cập Nhật" : "Lưu Giao Dịch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
