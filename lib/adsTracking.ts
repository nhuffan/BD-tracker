export const ADS_TRACKING_POINT_TYPE_CODES = [
  "LEN_QC_COMBO_1_NAM",
  "LEN_QC_COMBO_3_THANG",
] as const;

export function calculateAdsEndDate(startDate: string, pointTypeCode: string) {
  const date = new Date(startDate);
  if (Number.isNaN(date.getTime())) return "";

  if (pointTypeCode === "LEN_QC_COMBO_1_NAM") {
    date.setFullYear(date.getFullYear() + 1);
  } else if (pointTypeCode === "LEN_QC_COMBO_3_THANG") {
    date.setMonth(date.getMonth() + 3);
  }

  return date.toISOString().slice(0, 10);
}

export function getAdsTrackingStatus(endDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil(
    (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return "expired";
  if (diffDays <= 7) return "expiring_soon";
  return "active";
}