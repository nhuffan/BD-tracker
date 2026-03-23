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
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  done_at: string | null;
};

export type QATicketVM = QATicket & {
  asked_by_name?: string;
  ticket_code?: string;
  is_archived: boolean;
};