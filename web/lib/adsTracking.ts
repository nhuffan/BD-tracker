export const ADS_TRACKING_POINT_TYPE_CODES = [
  "LEN_QC_COMBO_1_NAM",
  "LEN_QC_COMBO_3_THANG",
] as const;

export function calculateAdsEndDate(startDate: string, pointTypeCode: string) {
  const [y, m, d] = startDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);

  // database bị ngược
  if (pointTypeCode === "LEN_QC_COMBO_1_NAM") {
    date.setMonth(date.getMonth() + 3);
  } else if (pointTypeCode === "LEN_QC_COMBO_3_THANG") {
    date.setFullYear(date.getFullYear() + 1);
  }

  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function getAdsTrackingStatus(
  startDate: string | null,
  endDate: string | null
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!startDate) return "not_started";

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  if (today < start) return "not_started";

  if (!endDate) return "active";

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil(
    (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return "expired";
  if (diffDays <= 3) return "expiring_soon";

  return "active";
}