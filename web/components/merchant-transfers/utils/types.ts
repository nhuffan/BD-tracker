export type {
  MerchantTransferRow,
  MerchantTransferStatus,
} from "@/lib/features/merchant-transfers/transfers";

import type { MerchantTransferStatus } from "@/lib/features/merchant-transfers/transfers";

export type MerchantTransferFormValues = {
  id?: string;
  sequence_no: number;
  merchant: string;
  amount: number;
  account_number: string;
  account_holder: string;
  bank_name: string;
  branch: string | null;
  status: MerchantTransferStatus;
  transaction_date: string;
  completion_date?: string | null;
};
