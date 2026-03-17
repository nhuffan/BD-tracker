export type TrackingRecordRow = {
  id: string;
  event_date: string;
  customer_name: string;

  branch: number | null;
  in_hot_list: number | null;
  bd_id: string | null;

  combo_voucher: boolean | null;

  note: string | null;
  info: string | null;

  created_at?: string | null;
  updated_at?: string | null;
};


export type TrackingRecordVM = TrackingRecordRow & {
  _sync_status?: "pending" | "synced" | "failed";
};

export type TrackingFilters = {
  from?: string;
  to?: string;
  customer_name?: string;
  bd_id?: string;
  combo_voucher?: "all" | "yes" | "none";
};