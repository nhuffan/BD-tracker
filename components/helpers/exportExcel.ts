import * as XLSX from "xlsx-js-style";
import { RecordRow } from "@/lib/types";
import { formatDMY } from "@/lib/date";

export function exportToExcel(
  rows: RecordRow[],
  maps?: {
    bd?: Record<string, string>;
    level?: Record<string, string>;
    customerType?: Record<string, string>;
    pointType?: Record<string, string>;
  }
) {
  const data = rows.map((r) => ({
    Date: formatDMY(r.event_date),

    "BD Name": maps?.bd?.[r.bd_id] ?? "",
    "BD Level": maps?.level?.[r.bd_level_id] ?? "",

    "Customer Name": r.customer_name,
    "Customer Type": maps?.customerType?.[r.customer_type_id] ?? "",
    "Point Type": maps?.pointType?.[r.point_type_id] ?? "",

    Points: r.points?.toLocaleString("en-US"),
    "Money (VND)":
      r.money !== null && r.money !== undefined
        ? `${r.money.toLocaleString("en-US")}`
        : "",
    Note: r.note ?? "",
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

  const totalRecords = rows.length;
  const totalPoints = rows
    .reduce((sum, r) => sum + (r.points ?? 0), 0)
    .toLocaleString("en-US");

  const totalMoney = rows
    .reduce((sum, r) => sum + (r.money ?? 0), 0)
    .toLocaleString("en-US");

  const summaryData = [
    { Metric: "Total Records", Value: totalRecords },
    { Metric: "Total Points", Value: totalPoints },
    { Metric: "Total Money", Value: `${totalMoney} VND` },
  ];

  const summaryWs = XLSX.utils.json_to_sheet(summaryData);

  const summaryHeaders = Object.keys(summaryData[0] || {});
  const summaryColWidths = summaryHeaders.map((key) => {
    const maxLength = Math.max(
      key.length,
      ...summaryData.map((row) => String((row as any)[key] ?? "").length)
    );
    return { wch: maxLength + 3 };
  });

  summaryData.forEach((_, index) => {
    const cellAddress = XLSX.utils.encode_cell({
      r: index + 1,
      c: 1,
    });

    if (summaryWs[cellAddress]) {
      summaryWs[cellAddress].s = {
        alignment: {
          horizontal: "right",
        },
      };
    }
  });

  summaryWs["!cols"] = summaryColWidths;

  ["A1", "B1"].forEach((cell) => {
    if (summaryWs[cell]) {
      summaryWs[cell].s = {
        font: { bold: true, sz: 13 },
      };
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Records");
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  XLSX.writeFile(
    wb,
    `records_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}