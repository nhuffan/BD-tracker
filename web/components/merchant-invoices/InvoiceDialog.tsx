"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ClipboardList,
  ImageIcon,
  Loader2,
  Sparkles,
  Trash2,
  UploadCloud,
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
  calculatePreVat,
  getMissingInvoiceFields,
  resolveInvoiceStatus,
} from "@/lib/features/merchant-invoices/invoices";
import type {
  MerchantInvoiceFormValues,
  MerchantInvoiceImage,
  MerchantInvoiceRow,
} from "./utils/types";
import MoneyText from "./MoneyText";

type LocalProofImage = MerchantInvoiceImage & {
  file?: File;
  local_preview_url?: string | null;
};

const fieldClass =
  "!h-11 h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm shadow-none placeholder:font-medium placeholder:text-muted-foreground/65";

const labelClass =
  "mb-2 block text-xs font-bold text-muted-foreground";

const initialProofImage = (file: File): LocalProofImage => ({
  id: crypto.randomUUID(),
  name: file.name,
  size: file.size,
  type: file.type || "image/*",
  resource_type: "image",
  public_id: "",
  url: "",
  secure_url: "",
  format: null,
  version: null,
  thumbnail_url: null,
  local_preview_url: URL.createObjectURL(file),
  file,
});

function mapRemoteProofImages(items?: MerchantInvoiceImage[] | null): LocalProofImage[] {
  return (items ?? []).map((item) => ({
    ...item,
    file: undefined,
    local_preview_url: null,
  }));
}

function getImageUrl(item?: LocalProofImage | null) {
  return item?.local_preview_url || item?.secure_url || item?.url || "";
}

function formatAmountInput(value: string | number) {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("vi-VN").format(Number(digits));
}

function normalizeAmountInput(value: string) {
  return value.replace(/\D/g, "");
}

async function uploadProofImages(items: LocalProofImage[]) {
  const localItems = items.filter((item) => item.file);
  if (!localItems.length) return [];

  const formData = new FormData();
  localItems.forEach((item) => {
    if (item.file) formData.append("files", item.file);
  });
  formData.append("folder", "merchant_invoices");

  const response = await fetch("/api/cloudinary/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to upload invoice proof image.");
  }

  const data = await response.json();
  return (data.files ?? []) as MerchantInvoiceImage[];
}

export default function InvoiceDialog({
  open,
  onOpenChange,
  onSaved,
  invoice,
  existingInvoices,
  nextSequenceNo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
  invoice?: MerchantInvoiceRow | null;
  existingInvoices: MerchantInvoiceRow[];
  nextSequenceNo: number;
}) {
  const isEditMode = !!invoice;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const merchantInputRef = useRef<HTMLInputElement | null>(null);
  const skipNextMerchantChangeRef = useRef(false);

  const [sequenceNo, setSequenceNo] = useState(nextSequenceNo);
  const [merchant, setMerchant] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [vatRate, setVatRate] = useState(10);
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [invoiceEmail, setInvoiceEmail] = useState("");
  const [proofImages, setProofImages] = useState<LocalProofImage[]>([]);
  const [issuedLocked, setIssuedLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoFillNotice, setAutoFillNotice] = useState("");
  const [imageInputMode, setImageInputMode] = useState<"FILE" | "PASTE">("FILE");
  const [showMerchantSuggestions, setShowMerchantSuggestions] = useState(false);
  const [autoFilledLookup, setAutoFilledLookup] = useState<{
    merchant: string;
    taxCode: string;
  } | null>(null);

  const knownTaxRows = useMemo(() => {
    const byTaxCode = new Map<string, MerchantInvoiceRow>();

    existingInvoices.forEach((item) => {
      const key = item.tax_code?.trim();
      if (key && !byTaxCode.has(key)) {
        byTaxCode.set(key, item);
      }
    });

    return Array.from(byTaxCode.values());
  }, [existingInvoices]);

  function getMerchantLookupRows(keywordValue: string) {
    const keyword = keywordValue.trim().toLowerCase();
    if (!keyword) return [];

    return knownTaxRows
      .filter((row) => row.merchant?.trim())
      .filter((row) => {
        const values = [
          row.merchant,
          row.company_name,
          row.tax_code,
          row.invoice_email ?? "",
        ];

        return values.some((value) => value.toLowerCase().includes(keyword));
      })
      .slice(0, 5);
  }

  const merchantLookupRows = getMerchantLookupRows(merchant);

  const numericInvoiceAmount = Number(normalizeAmountInput(invoiceAmount)) || 0;
  const vatBreakdown = calculatePreVat(numericInvoiceAmount, vatRate);
  const currentStatus = resolveInvoiceStatus({
    merchant,
    contract_number: contractNumber,
    company_name: companyName,
    company_address: companyAddress,
    tax_code: taxCode,
    invoice_email: invoiceEmail,
    invoice_amount: numericInvoiceAmount,
    status: issuedLocked ? "issued" : undefined,
  });
  const missingFields = getMissingInvoiceFields({
    merchant,
    contract_number: contractNumber,
    company_name: companyName,
    company_address: companyAddress,
    tax_code: taxCode,
    invoice_email: invoiceEmail,
    invoice_amount: numericInvoiceAmount,
  });

  useEffect(() => {
    if (!open) return;

    if (invoice) {
      setSequenceNo(invoice.sequence_no);
      setMerchant(invoice.merchant ?? "");
      setContractNumber(invoice.contract_number ?? "");
      setInvoiceAmount(invoice.invoice_amount ? formatAmountInput(invoice.invoice_amount) : "");
      setVatRate(Number(invoice.vat_rate ?? 10));
      setCompanyName(invoice.company_name ?? "");
      setCompanyAddress(invoice.company_address ?? "");
      setTaxCode(invoice.tax_code ?? "");
      setInvoiceEmail(invoice.invoice_email ?? "");
      setProofImages(mapRemoteProofImages(invoice.proof_images));
      setIssuedLocked(invoice.status === "issued");
      setAutoFillNotice("");
      setImageInputMode("FILE");
      setShowMerchantSuggestions(false);
      setAutoFilledLookup(null);
      setSaving(false);
      return;
    }

    setSequenceNo(nextSequenceNo);
    setMerchant("");
    setContractNumber("");
    setInvoiceAmount("");
    setVatRate(10);
    setCompanyName("");
    setCompanyAddress("");
    setTaxCode("");
    setInvoiceEmail("");
    setProofImages([]);
    setIssuedLocked(false);
    setAutoFillNotice("");
    setImageInputMode("FILE");
    setShowMerchantSuggestions(false);
    setAutoFilledLookup(null);
    setSaving(false);
  }, [open, invoice, nextSequenceNo]);

  useEffect(() => {
    if (open) return;

    proofImages.forEach((item) => {
      if (item.local_preview_url) URL.revokeObjectURL(item.local_preview_url);
    });
  }, [open, proofImages]);

  useEffect(() => {
    if (!open) return;

    function handlePaste(event: ClipboardEvent) {
      const item = Array.from(event.clipboardData?.items ?? []).find((entry) =>
        entry.type.startsWith("image/")
      );
      const file = item?.getAsFile();

      if (!file) return;

      setProofImages((prev) => {
        prev.forEach((entry) => {
          if (entry.local_preview_url) URL.revokeObjectURL(entry.local_preview_url);
        });
        return [initialProofImage(file)];
      });
      toast.success("Đã dán ảnh.");
    }

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [open]);

  function clearAutoFilledInvoiceInfo({
    merchantValue = "",
    taxCodeValue = "",
  }: {
    merchantValue?: string;
    taxCodeValue?: string;
  } = {}) {
    setMerchant(merchantValue);
    setCompanyName("");
    setCompanyAddress("");
    setTaxCode(taxCodeValue);
    setInvoiceEmail("");
    setVatRate(10);
    setAutoFillNotice("");
    setAutoFilledLookup(null);
    setShowMerchantSuggestions(Boolean(merchantValue.trim()));
  }

  function handleMerchantChange(value: string) {
    if (skipNextMerchantChangeRef.current) {
      skipNextMerchantChangeRef.current = false;
      return;
    }

    if (autoFilledLookup && value !== autoFilledLookup.merchant) {
      clearAutoFilledInvoiceInfo({ merchantValue: value });
      return;
    }

    setMerchant(value);
    setShowMerchantSuggestions(true);
  }

  function handleTaxCodeChange(value: string) {
    if (autoFilledLookup && value !== autoFilledLookup.taxCode) {
      clearAutoFilledInvoiceInfo({ taxCodeValue: value });
      return;
    }

    applyTaxCodeLookup(value);
  }

  function selectFirstMerchantSuggestion(value: string) {
    const firstSuggestion = getMerchantLookupRows(value)[0];
    if (!firstSuggestion) return false;

    replaceWithMerchantLookup(firstSuggestion);
    return true;
  }

  function replaceWithMerchantLookup(row: MerchantInvoiceRow) {
    if (!row.merchant?.trim()) return;

    skipNextMerchantChangeRef.current = true;
    if (merchantInputRef.current) {
      merchantInputRef.current.value = row.merchant;
    }

    applyMerchantLookup(row);
    window.setTimeout(() => {
      skipNextMerchantChangeRef.current = false;
    }, 0);
  }

  function applyTaxCodeLookup(value: string) {
    setTaxCode(value);

    const normalized = value.trim().toLowerCase();
    if (normalized.length < 6) {
      setAutoFillNotice("");
      setAutoFilledLookup(null);
      return;
    }

    const match = existingInvoices.find(
      (item) => item.tax_code?.trim().toLowerCase() === normalized
    );

    if (!match) {
      setAutoFillNotice("");
      setAutoFilledLookup(null);
      return;
    }

    setMerchant(match.merchant ?? "");
    setCompanyName(match.company_name ?? "");
    setCompanyAddress(match.company_address ?? "");
    setInvoiceEmail(match.invoice_email ?? "");
    setVatRate(Number(match.vat_rate ?? 10));
    setAutoFilledLookup({
      merchant: match.merchant ?? "",
      taxCode: match.tax_code ?? "",
    });
    setAutoFillNotice(`Đã tự động điền thông tin xuất hóa đơn từ MST đã có (${match.merchant}).`);
  }

  function applyMerchantLookup(row: MerchantInvoiceRow) {
    if (!row.merchant?.trim()) return;

    setMerchant(row.merchant);
    setCompanyName(row.company_name ?? "");
    setCompanyAddress(row.company_address ?? "");
    setTaxCode(row.tax_code ?? "");
    setInvoiceEmail(row.invoice_email ?? "");
    setVatRate(Number(row.vat_rate ?? 10));
    setShowMerchantSuggestions(false);
    setAutoFilledLookup({
      merchant: row.merchant,
      taxCode: row.tax_code ?? "",
    });
    setAutoFillNotice(`Đã tự động điền thông tin xuất hóa đơn từ ${row.merchant}.`);
  }

  function replaceImage(file?: File | null) {
    if (!file || !file.type.startsWith("image/")) return;

    setProofImages((prev) => {
      prev.forEach((item) => {
        if (item.local_preview_url) URL.revokeObjectURL(item.local_preview_url);
      });
      return [initialProofImage(file)];
    });
  }

  function removeImage() {
    setProofImages((prev) => {
      prev.forEach((item) => {
        if (item.local_preview_url) URL.revokeObjectURL(item.local_preview_url);
      });
      return [];
    });
  }

  async function saveInvoice() {
    if (saving) return;

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const remoteImages = proofImages
        .filter((item) => !item.file)
        .map<MerchantInvoiceImage>((item) => ({
          id: item.id,
          name: item.name,
          size: item.size,
          type: item.type,
          resource_type: item.resource_type,
          public_id: item.public_id,
          url: item.url,
          secure_url: item.secure_url,
          format: item.format ?? null,
          version: item.version ?? null,
          thumbnail_url: item.thumbnail_url ?? null,
        }));

      const uploadedImages = await uploadProofImages(proofImages);
      const mergedProofImages = [...remoteImages, ...uploadedImages];

      const payload: MerchantInvoiceFormValues = {
        id: invoice?.id,
        sequence_no: sequenceNo,
        merchant: merchant.trim(),
        contract_number: contractNumber.trim(),
        invoice_amount: numericInvoiceAmount,
        vat_rate: vatRate,
        company_name: companyName.trim(),
        company_address: companyAddress.trim(),
        tax_code: taxCode.trim(),
        invoice_email: invoiceEmail.trim(),
        proof_images: mergedProofImages,
        status: currentStatus,
        created_at: invoice?.created_at,
      };

      if (isEditMode && invoice?.id) {
        const { error } = await supabase
          .from("merchant_invoices")
          .update({
            sequence_no: payload.sequence_no,
            merchant: payload.merchant,
            contract_number: payload.contract_number || null,
            invoice_amount: payload.invoice_amount,
            vat_rate: payload.vat_rate,
            company_name: payload.company_name,
            company_address: payload.company_address || null,
            tax_code: payload.tax_code,
            invoice_email: payload.invoice_email || null,
            proof_images: payload.proof_images,
            status: payload.status,
            issued_at:
              payload.status === "issued" && invoice.status !== "issued"
                ? new Date().toISOString()
                : invoice.issued_at,
            version: (invoice.version ?? 1) + 1,
          })
          .eq("id", invoice.id);

        if (error) {
          toast.error(error.message || "Không thể cập nhật thông tin hóa đơn.");
          return;
        }

        toast.success("Đã cập nhật thông tin hóa đơn!");
      } else {
        const { error } = await supabase.from("merchant_invoices").insert({
          sequence_no: payload.sequence_no,
          merchant: payload.merchant,
          contract_number: payload.contract_number || null,
          invoice_amount: payload.invoice_amount,
          vat_rate: payload.vat_rate,
          company_name: payload.company_name,
          company_address: payload.company_address || null,
          tax_code: payload.tax_code,
          invoice_email: payload.invoice_email || null,
          proof_images: payload.proof_images,
          status: payload.status,
          issued_at: payload.status === "issued" ? new Date().toISOString() : null,
          created_by_user_id: user?.id ?? null,
        });

        if (error) {
          toast.error(error.message || "Không thể tạo mới hóa đơn.");
          return;
        }

        toast.success("Đã tạo mới hóa đơn thành công!");
      }

      onOpenChange(false);
      await onSaved();
    } catch (error) {
      console.error("save invoice failed:", error);
      toast.error("Không thể lưu hóa đơn.");
    } finally {
      setSaving(false);
    }
  }

  const canSave = Boolean(
    !saving &&
      merchant.trim() &&
      companyName.trim() &&
      taxCode.trim() &&
      numericInvoiceAmount >= 0
  );
  const primaryImage = proofImages[0] ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] w-[72vw] max-w-none min-w-[920px] flex-col overflow-hidden rounded-xl border bg-background p-0 shadow-xl"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className="border-b px-6 py-4">
          <div className="mb-2 flex w-fit items-center gap-2 rounded-md border bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
            <ClipboardList className="h-3.5 w-3.5" />
            STT #{sequenceNo}
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
            {isEditMode ? "Cập Nhật Thông Tin Hóa Đơn" : "Tạo Hóa Đơn Mới"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isEditMode ? "Cập nhật hóa đơn xuất" : "Tạo hóa đơn mới"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-2">
          {autoFillNotice && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              {autoFillNotice}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="relative">
              <label className={labelClass}>
                Merchant (Tên thương hiệu/quán){" "}
                <span className="text-destructive">*</span>
              </label>
              <Input
                required
                ref={merchantInputRef}
                value={merchant}
                onChange={(event) => handleMerchantChange(event.target.value)}
                onFocus={() => setShowMerchantSuggestions(true)}
                onKeyDownCapture={(event) => {
                  if (event.key === "Enter" && selectFirstMerchantSuggestion(event.currentTarget.value)) {
                    event.preventDefault();
                    event.stopPropagation();
                  }
                }}
                onBlur={() => window.setTimeout(() => setShowMerchantSuggestions(false), 120)}
                placeholder="Ví dụ: Hạ Spa, Tokyo Deli..."
                className={fieldClass}
              />
              {showMerchantSuggestions && merchantLookupRows.length > 0 && (
                <div className="absolute left-0 right-0 top-[72px] z-50 overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-xl">
	                  {merchantLookupRows.map((row) => (
	                    <button
	                      key={row.id}
	                      type="button"
	                      onMouseDown={(event) => event.preventDefault()}
	                      onClick={() => replaceWithMerchantLookup(row)}
                      className="flex w-full cursor-pointer flex-col rounded-lg px-3 py-2 text-left text-sm transition hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="font-semibold">{row.merchant}</span>
                      <span className="text-xs text-muted-foreground">
                        {row.company_name} · MST {row.tax_code}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>
                Mã Số Thuế (MST) <span className="text-destructive">*</span>
              </label>
              <Input
                required
                value={taxCode}
                onChange={(event) => handleTaxCodeChange(event.target.value)}
                placeholder="Nhập Mã Số Thuế (ví dụ: 318954777)..."
                className={fieldClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>
                Tên Đơn Vị Xuất Hóa Đơn <span className="text-destructive">*</span>
              </label>
              <Input
                required
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="CÔNG TY TNHH..."
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Địa Chỉ Xuất Hóa Đơn</label>
              <Input
                value={companyAddress}
                onChange={(event) => setCompanyAddress(event.target.value)}
                placeholder="Địa chỉ ghi trên hóa đơn..."
                className={fieldClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Email</label>
              <Input
                type="email"
                value={invoiceEmail}
                onChange={(event) => setInvoiceEmail(event.target.value)}
                placeholder="email@domain.com"
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Số Hợp Đồng</label>
              <Input
                value={contractNumber}
                onChange={(event) => setContractNumber(event.target.value)}
                placeholder="Ví dụ: NO.KADOB"
                className={fieldClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>
                Tỷ Lệ Thuế VAT (%) <span className="text-destructive">*</span>
              </label>
              <div className="flex h-11 items-center gap-2">
                {[8, 10, 0].map((rate) => (
                  <Button
                    key={rate}
                    type="button"
                    variant={vatRate === rate ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVatRate(rate)}
                    className="cursor-pointer"
                  >
                    {rate}%
                  </Button>
                ))}
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={vatRate}
                  onChange={(event) => setVatRate(Number(event.target.value) || 0)}
                  className="h-9 w-20"
                />
                <span className="text-xs font-bold text-muted-foreground">%</span>
              </div>
            </div>

            <div>
              <label className={labelClass}>
                Số Tiền Xuất Hóa Đơn (Đã Bao Gồm VAT){" "}
                <span className="text-destructive">*</span>
              </label>
              <Input
                inputMode="numeric"
                required
                value={invoiceAmount}
                onChange={(event) => setInvoiceAmount(formatAmountInput(event.target.value))}
                placeholder="62.243.200 ₫"
                className={`${fieldClass} font-extrabold placeholder:font-medium`}
              />
            </div>
          </div>

          {Boolean(invoiceAmount) && (
            <div className="space-y-1.5 rounded-xl border bg-muted/40 p-3 text-xs text-foreground">
              <div className="flex items-center justify-between gap-4">
                <span>
                  1. Số tiền trước VAT (Số tiền xuất / {100 + (vatRate || 0)}%):
                </span>
                <MoneyText
                  amount={vatBreakdown.preVatAmount}
                  className="font-mono text-xs font-bold"
                  currencyClassName="relative top-[0.14em]"
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>2. Tiền thuế VAT ({vatRate}%):</span>
                <MoneyText
                  amount={vatBreakdown.vatAmount}
                  className="font-mono text-xs font-bold"
                  currencyClassName="relative top-[0.14em]"
                />
              </div>
              <div className="flex items-center justify-between gap-4 border-t pt-1.5 font-bold text-primary">
                <span>3. Tổng tiền xuất hóa đơn (Đã VAT):</span>
                <MoneyText
                  amount={numericInvoiceAmount}
                  className="font-mono text-sm font-extrabold"
                  currencyClassName="relative top-[0.14em]"
                />
              </div>
            </div>
          )}

          <div className="space-y-2 rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                Trạng Thái Hóa Đơn
              </label>
              <span
                className={[
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold",
                  currentStatus === "issued"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : currentStatus === "ready"
                      ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300"
                      : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300",
                ].join(" ")}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {currentStatus === "issued"
                  ? "🔒 Đã xuất"
                  : currentStatus === "ready"
                    ? "Chờ xuất"
                    : "Chưa xuất"}
              </span>
            </div>

            <div className="text-[11px] leading-relaxed text-muted-foreground">
              {currentStatus === "issued" ? (
                <span className="font-medium text-emerald-700 dark:text-emerald-300">
                  • Hóa đơn đã ở trạng thái <strong>Đã xuất</strong> và được cố định, không thể chuyển lại thành Chưa xuất / Chờ xuất.
                </span>
              ) : missingFields.length === 0 ? (
                <span className="font-medium text-amber-700 dark:text-amber-300">
                  • Tất cả thông tin đã đầy đủ (Merchant, Số hợp đồng, Tên đơn vị, Địa chỉ, Mã số thuế, Email, Số tiền) ➔ Tự động chuyển <strong>Chờ xuất</strong>.
                </span>
              ) : (
                <div className="space-y-1 font-medium text-red-700 dark:text-red-300">
                  <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold dark:border-red-900/70 dark:bg-red-950/40">
                    📌 Cần bổ sung các trường:{" "}
                    <span className="underline">{missingFields.join(", ")}</span>
                  </p>
                </div>
              )}
            </div>

            {isEditMode && (
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-medium">
                <Input
                  type="checkbox"
                  checked={issuedLocked}
                  disabled={invoice?.status === "issued"}
                  onChange={(event) => setIssuedLocked(event.target.checked)}
                  className="h-4 w-4 cursor-pointer"
                />
                Chuyển trạng thái Đã xuất
              </label>
            )}
          </div>

          <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <ImageIcon className="h-4 w-4 text-primary" />
                Hình Ảnh Minh Chứng Giao Dịch
              </label>
              <div className="flex items-center gap-1 text-[11px]">
                {[
                  ["FILE", "Tải tệp"],
                  ["PASTE", "Dán ảnh (Ctrl+V)"],
                ].map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setImageInputMode(mode as "FILE" | "PASTE")}
                    className={[
                      "cursor-pointer rounded px-2 py-0.5 font-medium transition",
                      imageInputMode === mode
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  replaceImage(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />

              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  replaceImage(event.dataTransfer.files?.[0]);
                }}
                className="flex min-h-[120px] flex-col items-center justify-center rounded-xl border border-dashed bg-background p-4 text-center transition hover:border-primary/50"
              >
                {primaryImage ? (
                  <div className="relative w-full max-w-xs">
                    <img
                      src={getImageUrl(primaryImage)}
                      alt="Xem trước minh chứng"
                      className="mx-auto max-h-40 rounded-lg border object-contain shadow-xs"
                    />
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="destructive"
                      onClick={removeImage}
                      className="absolute right-2 top-2 cursor-pointer"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <UploadCloud className="h-5 w-5" />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="cursor-pointer font-bold text-primary hover:underline"
                      >
                        Tải ảnh lên
                      </button>
                      , kéo thả vào đây, hoặc nhấn{" "}
                      <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                        Ctrl + V
                      </kbd>{" "}
                      để dán
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer"
                    >
                      <UploadCloud className="h-4 w-4" />
                      Tải tệp
                    </Button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        <DialogFooter className="border-t bg-muted/40 px-6 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="cursor-pointer"
          >
            Hủy bỏ
          </Button>
          <Button onClick={saveInvoice} disabled={!canSave} className="cursor-pointer">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditMode ? "Lưu Cập Nhật" : "Tạo Mới Hóa Đơn"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
