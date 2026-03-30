export type ApprovalStatus = "pending" | "approved" | "rejected";

export type ApprovalImage = {
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

export type ApprovalRequest = {
  id: string;
  asked_by_bd_id: string;
  created_by_user_id: string | null;
  store_name: string;
  user_note: string | null;
  images?: ApprovalImage[] | null;
  status: ApprovalStatus;
  admin_note: string | null;
  approved_by_user_id: string | null;
  rejected_by_user_id: string | null;
  kpi_point_award: number | null;
  bonus_amount: number | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string | null;
  version: number;
};

export type ApprovalRequestVM = ApprovalRequest & {
  asked_by_name: string;
  request_code: string;
};