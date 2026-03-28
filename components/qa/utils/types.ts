export type QAPriority = "low" | "medium" | "high" | "urgent";

export type QATicket = {
  id: string;
  asked_by_bd_id: string;
  created_by_user_id: string | null;
  title: string;
  issue_detail: string | null;
  priority: QAPriority;
  admin_answer: string | null;
  answered_by_user_id: string | null;
  is_done: boolean;
  created_at: string;
  updated_at: string | null;
  done_at: string | null;
  is_archived: boolean;
  is_in_progress: boolean;
  in_progress_at: string | null;
  archived_at: string | null;
  version: number;
  updated_by_user_id: string | null;
  status_updated_by_user_id: string | null;
  attachments?: QATicketAttachment[] | null;
};

export type QATicketVM = QATicket & {
  asked_by_name: string;
  ticket_code: string;
};

export type QATicketAttachment = {
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

export type QATicketPresence = {
  userId: string;
  name: string;
  ticketId: string;
  joinedAt: string;
};