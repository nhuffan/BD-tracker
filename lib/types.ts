export type BdLevel = "BD" | "SBD" | "BD_LEADER";

export type CustomerType =
  | "KHONG_SAO"
  | "BA_SAO"
  | "BON_SAO"
  | "NAM_SAO"
  | "MUST_EAT_LIST"
  | "KHACH_HANG_1M";

export type PointType =
  | "MUA_VOUCHER_DAU_TIEN"
  | "LEN_COMBO_VOUCHER"
  | "LEN_QC_COMBO_3_THANG"
  | "NAP_QC_LAN_DAU_3000"
  | "LEN_QC_COMBO_1_NAM"
  | "LEN_QC_QUAN_LY_GIAN_HANG_1_NAM";

export type RecordRow = {
  id: string;
  event_date: string;


  bd_id: string;
  bd_level_id: string;


  customer_name: string;


  customer_type_id: string;
  point_type_id: string;


  points: number;
  money: number | null;
  note: string | null;


  created_at?: string;
  updated_at?: string;
};
