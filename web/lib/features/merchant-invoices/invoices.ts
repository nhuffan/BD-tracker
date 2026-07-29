export type MerchantInvoiceStatus = "not_ready" | "ready" | "issued";

export type MerchantInvoiceImage = {
  id: string;
  name: string;
  size: number;
  type: string;
  resource_type: "image" | "video" | "raw";
  public_id: string;
  url: string;
  secure_url: string;
  format?: string | null;
  version?: number | null;
  thumbnail_url?: string | null;
};

export type MerchantInvoiceRow = {
  id: string;
  sequence_no: number;
  merchant: string;
  contract_number: string | null;
  invoice_amount: number;
  vat_rate: number;
  company_name: string;
  company_address: string | null;
  tax_code: string;
  invoice_email: string | null;
  proof_images: MerchantInvoiceImage[];
  status: MerchantInvoiceStatus;
  created_by_user_id: string | null;
  issued_at: string | null;
  created_at: string;
  updated_at: string;
  version: number;
};

export const INVOICE_STATUS_LABEL: Record<MerchantInvoiceStatus, string> = {
  not_ready: "Chưa xuất",
  ready: "Chờ xuất",
  issued: "Đã xuất",
};

export function formatVnd(amount?: number | null) {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) return "0 ₫";

  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(value)} ₫`;
}

export function formatCleanNumber(amount?: number | null) {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) return "0";
  return String(Math.round(value));
}

export function calculatePreVat(invoiceAmount: number, vatRate = 10) {
  const amount = Number(invoiceAmount || 0);
  const rate = Number(vatRate || 0);

  if (!amount || !Number.isFinite(amount)) {
    return {
      preVatAmount: 0,
      vatAmount: 0,
    };
  }

  if (!rate) {
    return {
      preVatAmount: Math.round(amount),
      vatAmount: 0,
    };
  }

  const preVatAmount = Math.round(amount / (1 + rate / 100));

  return {
    preVatAmount,
    vatAmount: Math.round(amount - preVatAmount),
  };
}

export function getMonthKey(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(monthKey: string) {
  if (!monthKey || monthKey === "__all__") return "Tất cả các tháng";
  const [year, month] = monthKey.split("-");
  return `Tháng ${month}/${year}`;
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const time = date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);

  return `${time} ${day}/${month}/${year}`;
}

export function getMissingInvoiceFields(item: {
  merchant?: string | null;
  contract_number?: string | null;
  company_name?: string | null;
  company_address?: string | null;
  tax_code?: string | null;
  invoice_email?: string | null;
  invoice_amount?: number | string | null;
}) {
  const missing: string[] = [];
  const amount =
    typeof item.invoice_amount === "number"
      ? item.invoice_amount
      : Number(String(item.invoice_amount ?? "").replace(/[^\d.]/g, ""));

  if (!item.merchant?.trim()) missing.push("Merchant");
  if (!item.contract_number?.trim()) missing.push("Số hợp đồng");
  if (!item.company_name?.trim()) missing.push("Tên đơn vị");
  if (!item.company_address?.trim()) missing.push("Địa chỉ");
  if (!item.tax_code?.trim()) missing.push("Mã số thuế");
  if (!item.invoice_email?.trim()) missing.push("Email");
  if (!amount || amount <= 0) missing.push("Số tiền");

  return missing;
}

export function isInvoiceComplete(item: Parameters<typeof getMissingInvoiceFields>[0]) {
  return getMissingInvoiceFields(item).length === 0;
}

export function resolveInvoiceStatus(
  item: Parameters<typeof getMissingInvoiceFields>[0] & {
    status?: MerchantInvoiceStatus;
  }
): MerchantInvoiceStatus {
  if (item.status === "issued") return "issued";
  return isInvoiceComplete(item) ? "ready" : "not_ready";
}

export function getPrimaryImage(row: Pick<MerchantInvoiceRow, "proof_images">) {
  return row.proof_images?.[0] ?? null;
}
