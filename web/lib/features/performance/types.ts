export type RecordRow = {
  id: string;
  event_date: string;
  bd_id: string;
  bd_level_id: string;
  customer_name: string;
  customer_type_id: string;
  point_type_id: string;
  category: "entertainment" | "restaurant";
  points: number;
  money: number | null;
  package_amount: number | null;
  note: string | null;
  created_at?: string;
  updated_at?: string;
  branch_number: number | null;
};