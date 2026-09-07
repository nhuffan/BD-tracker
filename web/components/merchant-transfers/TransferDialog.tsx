"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
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
import { DatePickerDMY } from "@/components/ui/date-picker-dmy";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { TransferFormField, TransferFormSection } from "./TransferFormUI";

const fieldClass = "!h-10 h-10";

const selectClass =
  "!h-10 h-10 w-full cursor-pointer appearance-none rounded-md border border-input bg-transparent px-3 py-2 pr-10 text-sm font-normal shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

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

function TransferStatusOption({ status }: { status: MerchantTransferStatus }) {
  const config = {
    not_transferred: {
      icon: AlertCircle,
      iconClass: "text-red-500",
    },
    ready: {
      icon: Clock3,
      iconClass: "text-amber-500",
    },
    transferred: {
      icon: CheckCircle2,
      iconClass: "text-emerald-600 dark:text-emerald-400",
    },
  }[status];
  const Icon = config.icon;

  return (
    <span className="inline-flex items-center gap-2">
      <Icon className={`size-4 shrink-0 ${config.iconClass}`} />
      <span>{TRANSFER_STATUS_LABEL[status]}</span>
    </span>
  );
}

function normalizeLookupValue(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function getTransferLookupKey(row: MerchantTransferRow) {
  return [
    normalizeLookupValue(row.merchant),
    normalizeLookupValue(row.bank_name),
    normalizeLookupValue(row.account_number),
  ].join("|");
}

function getMerchantLookupRows(rows: MerchantTransferRow[], query: string) {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return [];

  const latestByMerchantAccount = new Map<string, MerchantTransferRow>();
  const newestTransfers = [...rows].sort((left, right) => {
    const leftCreatedAt = Date.parse(left.created_at);
    const rightCreatedAt = Date.parse(right.created_at);

    if (Number.isNaN(leftCreatedAt) || Number.isNaN(rightCreatedAt)) return 0;
    return rightCreatedAt - leftCreatedAt;
  });

  newestTransfers.forEach((item) => {
    const key = getTransferLookupKey(item);
    if (key.replace(/\|/g, "") && !latestByMerchantAccount.has(key)) {
      latestByMerchantAccount.set(key, item);
    }
  });

  return Array.from(latestByMerchantAccount.values())
    .filter((row) =>
      [row.merchant, row.account_number, row.account_holder, row.bank_name, row.branch ?? ""].some(
        (value) => value.toLowerCase().includes(keyword)
      )
    )
    .slice(0, 8);
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
    return getMerchantLookupRows(existingTransfers, merchant);
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

    const exactMatches = getMerchantLookupRows(existingTransfers, value).filter(
      (row) => normalizeLookupValue(row.merchant) === normalizeLookupValue(value)
    );

    if (exactMatches.length === 1) applyMerchantLookup(exactMatches[0]);
    else setAutoFillNotice("");
  }

  function selectFirstMerchantSuggestion() {
    const first = merchantLookupRows[0];
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
        className="max-h-[92dvh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-4xl"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className="border-b bg-card px-5 py-4 pr-12 sm:px-6 sm:py-5">
          <div className="mb-2 flex w-fit items-center gap-2 rounded-md border bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
            <ClipboardList className="h-3.5 w-3.5" />
            STT #{sequenceNo}
          </div>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            {isEditMode ? "Chỉnh Sửa Giao Dịch Chuyển Khoản" : "Thêm Lượt Chuyển Khoản Mới"}
          </DialogTitle>
          <DialogDescription>
            Tự động gợi ý và điền thông tin tài khoản nếu Merchant đã tồn tại.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-4 overflow-y-auto bg-muted/25 px-4 py-4 sm:px-6 sm:py-5">
          <TransferFormSection
            step={1}
            title="Thông tin giao dịch"
            description="Nhập Merchant và số tiền cần chuyển."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="relative min-w-0">
                <TransferFormField id="transfer-merchant" label="Tên Merchant" required>
                  <Input
                    id="transfer-merchant"
                    required
                    value={merchant}
                    onChange={(event) => handleMerchantChange(event.target.value)}
                    onFocus={() => setShowMerchantSuggestions(true)}
                    onBlur={() => window.setTimeout(() => setShowMerchantSuggestions(false), 120)}
                    onKeyDownCapture={(event) => {
                      if (event.key === "Enter" && selectFirstMerchantSuggestion()) {
                        event.preventDefault();
                        event.stopPropagation();
                      }
                    }}
                    placeholder="Ví dụ: Phở Việt Nam, Lao Lu Guan..."
                    className={fieldClass}
                  />
                </TransferFormField>
                {showMerchantSuggestions && merchantLookupRows.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-xl">
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

              <TransferFormField id="transfer-amount" label="Số tiền" required>
                <div className="relative">
                  <Input
                    id="transfer-amount"
                    inputMode="numeric"
                    required
                    value={amount}
                    onChange={(event) => setAmount(formatMoneyInput(event.target.value))}
                    placeholder="35.976.600"
                    className={`${fieldClass} pr-9 font-extrabold placeholder:font-normal`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                    ₫
                  </span>
                </div>
              </TransferFormField>
            </div>

            {autoFillNotice && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-medium text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Sparkles className="h-4 w-4 shrink-0" />
                {autoFillNotice}
              </div>
            )}
          </TransferFormSection>

          <TransferFormSection
            step={2}
            title="Tài khoản nhận tiền"
            description="Kiểm tra chính xác thông tin ngân hàng trước khi lưu."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <TransferFormField id="transfer-account-number" label="Số tài khoản" required>
                <Input
                  id="transfer-account-number"
                  required
                  value={accountNumber}
                  onChange={(event) => setAccountNumber(event.target.value)}
                  placeholder="Nhập STK..."
                  className={fieldClass}
                />
              </TransferFormField>

              <TransferFormField id="transfer-account-holder" label="Chủ tài khoản" required>
                <Input
                  id="transfer-account-holder"
                  required
                  value={accountHolder}
                  onChange={(event) => setAccountHolder(event.target.value.toUpperCase())}
                  placeholder="NGUYEN VAN A..."
                  className={fieldClass}
                />
              </TransferFormField>

              <TransferFormField id="transfer-bank" label="Ngân hàng" required>
                <div className="relative">
                  <select
                    id="transfer-bank"
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
                    className={`${fieldClass} mt-2`}
                  />
                )}
              </TransferFormField>

              <TransferFormField id="transfer-branch" label="Chi nhánh" optional>
                <Input
                  id="transfer-branch"
                  value={branch}
                  onChange={(event) => setBranch(event.target.value)}
                  placeholder="Phú Nhuận, Hồ Chí Minh..."
                  className={fieldClass}
                />
              </TransferFormField>
            </div>
          </TransferFormSection>

          <TransferFormSection
            step={3}
            title="Trạng thái chuyển khoản"
            description="Chọn ngày giao dịch và tình trạng xử lý hiện tại."
            trailing={
              <span
                className={[
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold",
                  statusClass(status),
                ].join(" ")}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {status === "transferred" ? "🔒 " : ""}
                {TRANSFER_STATUS_LABEL[status]}
              </span>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <TransferFormField id="transfer-date" label="Ngày giao dịch">
                <DatePickerDMY
                  value={transactionDate}
                  onChange={(iso) =>
                    setTransactionDate(iso ?? transactionDate)
                  }
                  placeholder="Chọn ngày giao dịch"
                  className="h-10"
                />
              </TransferFormField>

              <TransferFormField id="transfer-status" label="Tình trạng">
                <Select
                  value={status}
                  onValueChange={(value) =>
                    setStatus(value as MerchantTransferStatus)
                  }
                  disabled={isLocked}
                >
                  <SelectTrigger
                    id="transfer-status"
                    className="h-10 w-full data-[size=default]:h-10"
                  >
                    <SelectValue>
                      <TransferStatusOption status={status} />
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_transferred">
                      <TransferStatusOption status="not_transferred" />
                    </SelectItem>
                    <SelectItem value="ready">
                      <TransferStatusOption status="ready" />
                    </SelectItem>
                    <SelectItem value="transferred">
                      <TransferStatusOption status="transferred" />
                    </SelectItem>
                  </SelectContent>
                </Select>
                {isLocked && (
                  <p className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    Giao dịch đã ở trạng thái {TRANSFER_STATUS_LABEL.transferred} và không thể thay đổi.
                  </p>
                )}
              </TransferFormField>
            </div>
          </TransferFormSection>
        </div>

        <DialogFooter className="border-t bg-card px-4 py-3 sm:px-6 sm:py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="cursor-pointer sm:min-w-24"
          >
            Hủy
          </Button>
          <Button
            onClick={saveTransfer}
            disabled={!canSave}
            className="cursor-pointer sm:min-w-32"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {isEditMode ? "Cập Nhật" : "Lưu Giao Dịch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
