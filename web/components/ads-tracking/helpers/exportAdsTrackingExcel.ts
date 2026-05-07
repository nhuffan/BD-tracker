import * as XLSX from "xlsx-js-style";
import { formatDMY } from "@/lib/date";
import { getAdsTrackingStatus } from "@/lib/adsTracking";
import type { AdTrackingRow } from "../AdsTrackingPage";

export function exportAdsTrackingToExcel(
  rows: AdTrackingRow[],
  maps?: {
    bd?: Record<string, string>;
    customerType?: Record<string, string>;
    pointType?: Record<string, string>;
  }
) {
  const data = rows.map((row) => ({
    "Customer Name": row.customer_name,
    "Branch Name": row.branch_name?.trim() || "—",
    "BD Name": row.bd_id ? maps?.bd?.[row.bd_id] ?? row.bd_id : "—",
    "Customer Type": row.customer_type_id
      ? maps?.customerType?.[row.customer_type_id] ?? row.customer_type_id
      : "—",
    "Point Type": maps?.pointType?.[row.point_type_id] ?? row.point_type_id,
    "Start Date": row.start_date ? formatDMY(row.start_date) : "—",
    "End Date": row.end_date ? formatDMY(row.end_date) : "—",
    Status: getAdsTrackingStatus(row.start_date, row.end_date),
    Note: row.note ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);

  const headers = Object.keys(data[0] || {});
  headers.forEach((_, colIndex) => {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: colIndex });
    if (ws[cellAddress]) {
      ws[cellAddress].s = {
        font: {
          bold: true,
          sz: 13,
        },
      };
    }
  });

  const colWidths = headers.map((key) => {
    const maxLength = Math.max(
      key.length,
      ...data.map((item) => String((item as Record<string, string>)[key] ?? "").length)
    );
    return { wch: maxLength + 3 };
  });

  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ads Tracking");

  XLSX.writeFile(
    wb,
    `ads_tracking_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}
