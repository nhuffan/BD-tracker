import type {
  MerchantInvoiceImage,
  MerchantInvoiceRow,
  MerchantInvoiceStatus,
} from "@/lib/features/merchant-invoices/invoices";

export type {
  MerchantInvoiceImage,
  MerchantInvoiceRow,
  MerchantInvoiceStatus,
};

export type MerchantInvoiceFormValues = {
  id?: string;
  sequence_no: number;
  merchant: string;
  contract_number: string;
  invoice_amount: number;
  vat_rate: number;
  company_name: string;
  company_address: string;
  tax_code: string;
  invoice_email: string;
  note?: string | null;
  proof_images: MerchantInvoiceImage[];
  status: MerchantInvoiceStatus;
  created_at?: string;
};
