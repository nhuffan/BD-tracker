import * as XLSX from "xlsx-js-style";
import { formatDMY } from "@/lib/date";
import type { TrackingRecordRow } from "../types";

function yesNo(value: boolean | null | undefined) {
  return value === true ? "Yes" : "—";
}

export function exportTrackingToExcel(
  rows: TrackingRecordRow[],
  maps?: {
    bd?: Record<string, string>;
  }
) {
  const data = rows.map((r) => ({
    Date: formatDMY(r.event_date),
    "Customer Name": r.customer_name,
    Branch:
      r.branch !== null && r.branch !== undefined
        ? r.branch.toLocaleString("en-US")
        : "",
    "In Hot List":
      r.in_hot_list !== null && r.in_hot_list !== undefined
        ? r.in_hot_list.toLocaleString("en-US")
        : "",
    "BD Name": maps?.bd?.[r.bd_id ?? ""] ?? "",
    "Combo/Voucher": yesNo(r.combo_voucher),
    Note: r.note ?? "",
    Infor: r.info ?? "",
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
      ...data.map((row) => String((row as any)[key] ?? "").length)
    );
    return { wch: maxLength + 3 };
  });

  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Customer Tracking");

  XLSX.writeFile(
    wb,
    `customer_tracking_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}