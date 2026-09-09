import JSZip from "jszip";
import * as XLSX from "xlsx-js-style";

export interface ReconciliationRow {
  reconciledAt: string;
  orderId: string;
  productId: string;
  productName: string;
  comboPrice: number;
  serviceFee: number;
  reconciliationAmount: number;
}

export interface ReconciliationData {
  sourceFileName: string;
  sheetName: string;
  merchantName: string;
  statementId: string;
  periodStart: string;
  periodEnd: string;
  monthLabel: string;
  serviceFeeRate: number | null;
  rows: ReconciliationRow[];
  totals: {
    comboPrice: number;
    serviceFee: number;
    reconciliationAmount: number;
  };
}

const REQUIRED_HEADERS = {
  reconciledAt: ["thoi gian doi soat", "对账时间"],
  orderId: ["meituan dianping order number", "美团点评订单号", "ma so combo voucher"],
  productId: ["ma san pham", "产品编号"],
  productName: ["ten san pham", "产品名称"],
  comboPrice: ["gia combo", "套餐价格"],
  reconciliationAmount: ["tien doi soat", "对账金额"],
};

const DATA_START_ROW = 13;
const TEMPLATE_DATA_ROWS = 10;
const TEMPLATE_TOTAL_ROW = 23;
const TEMPLATE_LAST_ROW = 41;
const XML_NAMESPACE = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\u3400-\u9fff%]+/g, " ")
    .trim();
}

function findHeaderIndex(headers: unknown[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeText);
  const normalizedHeaders = headers.map(normalizeText);
  const exact = normalizedHeaders.findIndex((header) => normalizedAliases.includes(header));

  if (exact >= 0) return exact;

  return normalizedHeaders.findIndex((header) =>
    normalizedAliases.some((alias) => alias.length > 3 && header.includes(alias))
  );
}

function asText(value: unknown) {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    const hour = String(value.getHours()).padStart(2, "0");
    const minute = String(value.getMinutes()).padStart(2, "0");
    const second = String(value.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }

  return String(value ?? "").trim();
}

function parseMoney(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const raw = String(value ?? "").trim();
  if (!raw) return 0;

  const negative = /^\s*-/.test(raw) || /^\s*\(/.test(raw);
  const digits = raw.replace(/[^0-9]/g, "");
  const amount = digits ? Number(digits) : Number.NaN;

  if (!Number.isFinite(amount)) {
    throw new Error(`Giá trị tiền không hợp lệ: ${raw}`);
  }

  return negative ? -amount : amount;
}

function parseDateParts(value: string) {
  const isoMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return {
      year: Number(isoMatch[1]),
      month: Number(isoMatch[2]),
      day: Number(isoMatch[3]),
    };
  }

  const dmyMatch = value.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (dmyMatch) {
    return {
      year: Number(dmyMatch[3]),
      month: Number(dmyMatch[2]),
      day: Number(dmyMatch[1]),
    };
  }

  return null;
}

function parseFileMetadata(fileName: string, rows: ReconciliationRow[]) {
  const merchantName = fileName.split("_")[0]?.trim() ?? "";
  const statementId = fileName.match(/账单ID[_-]?(\d+)/i)?.[1] ?? "";
  const periodMatch = fileName.match(/结算周期[_-]?(\d{8})-(\d{8})/i);

  let periodStart = "";
  let periodEnd = "";

  if (periodMatch) {
    const formatCompactDate = (value: string) =>
      `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
    periodStart = formatCompactDate(periodMatch[1]);
    periodEnd = formatCompactDate(periodMatch[2]);
  } else {
    const datedRows = rows
      .map((row) => ({ raw: row.reconciledAt, parts: parseDateParts(row.reconciledAt) }))
      .filter((item): item is { raw: string; parts: NonNullable<typeof item.parts> } => Boolean(item.parts))
      .sort((a, b) =>
        `${a.parts.year}-${String(a.parts.month).padStart(2, "0")}-${String(a.parts.day).padStart(2, "0")}`.localeCompare(
          `${b.parts.year}-${String(b.parts.month).padStart(2, "0")}-${String(b.parts.day).padStart(2, "0")}`
        )
      );

    periodStart = datedRows[0]?.raw.slice(0, 10) ?? "";
    periodEnd = datedRows.at(-1)?.raw.slice(0, 10) ?? "";
  }

  const monthParts = parseDateParts(periodStart || rows[0]?.reconciledAt || "");
  const monthLabel = monthParts
    ? `${String(monthParts.month).padStart(2, "0")}-${monthParts.year}`
    : "MM-YYYY";

  return { merchantName, statementId, periodStart, periodEnd, monthLabel };
}

function detectFeeColumn(headers: unknown[]) {
  const normalized = headers.map(normalizeText);
  return normalized.findIndex(
    (header) => header.includes("phi dich vu") || header.includes("服务费") || /\d+(?:[.,]\d+)?%/.test(header)
  );
}

function detectFeeRate(header: unknown, rows: ReconciliationRow[]) {
  const match = String(header ?? "").match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (match) return Number(match[1].replace(",", "."));

  const rowWithRate = rows.find((row) => row.comboPrice > 0 && row.serviceFee >= 0);
  if (!rowWithRate) return null;
  return Number(((rowWithRate.serviceFee / rowWithRate.comboPrice) * 100).toFixed(2));
}

export function parseReconciliationWorkbook(buffer: ArrayBuffer, fileName: string): ReconciliationData {
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    raw: true,
  });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) throw new Error("File Excel không có sheet dữ liệu.");

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
    blankrows: false,
  });

  const headerRowIndex = matrix.findIndex((row) => {
    const headers = Array.isArray(row) ? row : [];
    return (
      findHeaderIndex(headers, REQUIRED_HEADERS.reconciledAt) >= 0 &&
      findHeaderIndex(headers, REQUIRED_HEADERS.reconciliationAmount) >= 0
    );
  });

  if (headerRowIndex < 0) {
    throw new Error("Không tìm thấy hàng tiêu đề đối soát trong file.");
  }

  const headers = matrix[headerRowIndex];
  const indices = {
    reconciledAt: findHeaderIndex(headers, REQUIRED_HEADERS.reconciledAt),
    orderId: findHeaderIndex(headers, REQUIRED_HEADERS.orderId),
    productId: findHeaderIndex(headers, REQUIRED_HEADERS.productId),
    productName: findHeaderIndex(headers, REQUIRED_HEADERS.productName),
    comboPrice: findHeaderIndex(headers, REQUIRED_HEADERS.comboPrice),
    serviceFee: detectFeeColumn(headers),
    reconciliationAmount: findHeaderIndex(headers, REQUIRED_HEADERS.reconciliationAmount),
  };

  const missing = Object.entries(indices)
    .filter(([, index]) => index < 0)
    .map(([key]) => key);
  if (missing.length) {
    throw new Error(`File thiếu cột bắt buộc: ${missing.join(", ")}.`);
  }

  const rows = matrix
    .slice(headerRowIndex + 1)
    .filter((row) => {
      const firstCell = normalizeText(row[0]);
      if (firstCell.includes("tong cong") || firstCell.includes("total")) return false;
      return Object.values(indices).some((index) => asText(row[index]) !== "");
    })
    .map((row) => ({
      reconciledAt: asText(row[indices.reconciledAt]),
      orderId: asText(row[indices.orderId]),
      productId: asText(row[indices.productId]),
      productName: asText(row[indices.productName]),
      comboPrice: parseMoney(row[indices.comboPrice]),
      serviceFee: parseMoney(row[indices.serviceFee]),
      reconciliationAmount: parseMoney(row[indices.reconciliationAmount]),
    }))
    .filter((row) => row.reconciledAt || row.orderId || row.productId || row.productName);

  if (!rows.length) throw new Error("File không có giao dịch đối soát để xuất.");

  const metadata = parseFileMetadata(fileName, rows);
  const totals = rows.reduce(
    (sum, row) => ({
      comboPrice: sum.comboPrice + row.comboPrice,
      serviceFee: sum.serviceFee + row.serviceFee,
      reconciliationAmount: sum.reconciliationAmount + row.reconciliationAmount,
    }),
    { comboPrice: 0, serviceFee: 0, reconciliationAmount: 0 }
  );

  return {
    sourceFileName: fileName,
    sheetName,
    ...metadata,
    serviceFeeRate: detectFeeRate(headers[indices.serviceFee], rows),
    rows,
    totals,
  };
}

function directChild(parent: Element, localName: string) {
  return Array.from(parent.children).find((child) => child.localName === localName) ?? null;
}

function parseXml(xml: string) {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.querySelector("parsererror")) throw new Error("Template Excel có XML không hợp lệ.");
  return document;
}

function createXmlElement(document: XMLDocument, name: string) {
  return document.createElementNS(XML_NAMESPACE, name);
}

function cellColumn(reference: string) {
  return reference.match(/^([A-Z]+)/)?.[1] ?? "";
}

function shiftCellReference(reference: string, fromRow: number, amount: number) {
  return reference.replace(/(\$?[A-Z]+\$?)(\d+)/g, (match, column: string, rowText: string) => {
    const row = Number(rowText);
    return row >= fromRow ? `${column}${row + amount}` : match;
  });
}

function ensureCell(document: XMLDocument, row: Element, column: string) {
  const rowNumber = row.getAttribute("r") ?? "";
  const reference = `${column}${rowNumber}`;
  const cells = Array.from(row.children).filter((child) => child.localName === "c");
  const existing = cells.find((cell) => cell.getAttribute("r") === reference);
  if (existing) return existing;

  const cell = createXmlElement(document, "c");
  cell.setAttribute("r", reference);
  const nextCell = cells.find((candidate) => cellColumn(candidate.getAttribute("r") ?? "") > column);
  row.insertBefore(cell, nextCell ?? null);
  return cell;
}

function clearCell(cell: Element) {
  cell.removeAttribute("t");
  Array.from(cell.children).forEach((child) => {
    if (["f", "v", "is"].includes(child.localName)) child.remove();
  });
}

function setInlineString(document: XMLDocument, cell: Element, value: string) {
  clearCell(cell);
  cell.setAttribute("t", "inlineStr");
  const inlineString = createXmlElement(document, "is");
  const text = createXmlElement(document, "t");
  text.textContent = value;
  inlineString.appendChild(text);
  cell.appendChild(inlineString);
}

function setNumber(document: XMLDocument, cell: Element, value: number) {
  clearCell(cell);
  const number = createXmlElement(document, "v");
  number.textContent = String(value);
  cell.appendChild(number);
}

function getRow(sheetDocument: XMLDocument, rowNumber: number) {
  return Array.from(sheetDocument.getElementsByTagNameNS(XML_NAMESPACE, "row")).find(
    (row) => Number(row.getAttribute("r")) === rowNumber
  );
}

function shiftTemplateRows(sheetDocument: XMLDocument, amount: number) {
  if (amount <= 0) return;

  Array.from(sheetDocument.getElementsByTagNameNS(XML_NAMESPACE, "row"))
    .filter((row) => Number(row.getAttribute("r")) >= TEMPLATE_TOTAL_ROW)
    .forEach((row) => {
      const nextRow = Number(row.getAttribute("r")) + amount;
      row.setAttribute("r", String(nextRow));
      Array.from(row.children)
        .filter((child) => child.localName === "c")
        .forEach((cell) => {
          const reference = cell.getAttribute("r");
          if (reference) cell.setAttribute("r", shiftCellReference(reference, TEMPLATE_TOTAL_ROW, amount));
        });
    });

  Array.from(sheetDocument.getElementsByTagNameNS(XML_NAMESPACE, "mergeCell")).forEach((merge) => {
    const reference = merge.getAttribute("ref");
    if (reference) merge.setAttribute("ref", shiftCellReference(reference, TEMPLATE_TOTAL_ROW, amount));
  });

  Array.from(sheetDocument.getElementsByTagNameNS(XML_NAMESPACE, "hyperlink")).forEach((link) => {
    const reference = link.getAttribute("ref");
    if (reference) link.setAttribute("ref", shiftCellReference(reference, TEMPLATE_TOTAL_ROW, amount));
  });

  const dimension = sheetDocument.getElementsByTagNameNS(XML_NAMESPACE, "dimension")[0];
  if (dimension) dimension.setAttribute("ref", `A1:I${TEMPLATE_LAST_ROW + amount}`);
}

function extendDataRows(sheetDocument: XMLDocument, extraRows: number) {
  if (extraRows <= 0) return;

  const sheetData = sheetDocument.getElementsByTagNameNS(XML_NAMESPACE, "sheetData")[0];
  const templateRow = getRow(sheetDocument, DATA_START_ROW);
  const totalRow = getRow(sheetDocument, TEMPLATE_TOTAL_ROW + extraRows);
  if (!sheetData || !templateRow || !totalRow) throw new Error("Template thiếu vùng dữ liệu chuẩn.");

  for (let index = 0; index < extraRows; index++) {
    const rowNumber = TEMPLATE_TOTAL_ROW + index;
    const clone = templateRow.cloneNode(true) as Element;
    clone.setAttribute("r", String(rowNumber));
    clone.setAttribute("ht", "20");
    Array.from(clone.children)
      .filter((child) => child.localName === "c")
      .forEach((cell) => {
        const column = cellColumn(cell.getAttribute("r") ?? "");
        cell.setAttribute("r", `${column}${rowNumber}`);
      });
    sheetData.insertBefore(clone, totalRow);
  }
}

function updateDefinedRange(workbookDocument: XMLDocument, totalRow: number) {
  Array.from(workbookDocument.getElementsByTagNameNS(XML_NAMESPACE, "definedName")).forEach((name) => {
    if (name.getAttribute("name") === "_xlnm._FilterDatabase") {
      name.textContent = `'MT LIFE'!$A$${DATA_START_ROW}:$H$${totalRow}`;
    }
  });

  const calcPr = workbookDocument.getElementsByTagNameNS(XML_NAMESPACE, "calcPr")[0];
  if (calcPr) {
    calcPr.setAttribute("calcMode", "auto");
    calcPr.setAttribute("calcOnSave", "1");
    calcPr.setAttribute("fullCalcOnLoad", "1");
    calcPr.setAttribute("forceFullCalc", "1");
  }
}

function createVndStyleFactory(stylesDocument: XMLDocument) {
  const root = stylesDocument.documentElement;
  let numFmts = directChild(root, "numFmts");
  if (!numFmts) {
    numFmts = createXmlElement(stylesDocument, "numFmts");
    numFmts.setAttribute("count", "0");
    root.insertBefore(numFmts, directChild(root, "fonts"));
  }

  const existingIds = Array.from(numFmts.children)
    .filter((child) => child.localName === "numFmt")
    .map((node) => Number(node.getAttribute("numFmtId")))
    .filter(Number.isFinite);
  const numFmtId = Math.max(164, ...existingIds) + 1;
  const numFmt = createXmlElement(stylesDocument, "numFmt");
  numFmt.setAttribute("numFmtId", String(numFmtId));
  numFmt.setAttribute("formatCode", '#,##0 "₫"');
  numFmts.appendChild(numFmt);
  numFmts.setAttribute("count", String(Array.from(numFmts.children).length));

  const cellXfs = directChild(root, "cellXfs");
  if (!cellXfs) throw new Error("Template thiếu định dạng ô.");

  const styleByBase = new Map<number, number>();
  return (cell: Element) => {
    const baseStyle = Number(cell.getAttribute("s") ?? 0);
    let styleIndex = styleByBase.get(baseStyle);
    if (styleIndex === undefined) {
      const styles = Array.from(cellXfs!.children).filter((child) => child.localName === "xf");
      const base = styles[baseStyle] ?? styles[0];
      if (!base) throw new Error("Template thiếu cell style gốc.");
      const clone = base.cloneNode(true) as Element;
      clone.setAttribute("numFmtId", String(numFmtId));
      clone.setAttribute("applyNumberFormat", "1");
      cellXfs!.appendChild(clone);
      styleIndex = styles.length;
      styleByBase.set(baseStyle, styleIndex);
      cellXfs!.setAttribute("count", String(styles.length + 1));
    }
    cell.setAttribute("s", String(styleIndex));
  };
}

function matchCellFont(
  stylesDocument: XMLDocument,
  targetCell: Element,
  sourceCell: Element
) {
  const cellXfs = directChild(stylesDocument.documentElement, "cellXfs");
  if (!cellXfs) throw new Error("Template thiếu định dạng ô.");

  const styles = Array.from(cellXfs.children).filter((child) => child.localName === "xf");
  const sourceStyle = styles[Number(sourceCell.getAttribute("s") ?? 0)];
  const targetStyle = styles[Number(targetCell.getAttribute("s") ?? 0)];
  if (!sourceStyle || !targetStyle) throw new Error("Template thiếu style cho tên công ty.");

  const clone = targetStyle.cloneNode(true) as Element;
  clone.setAttribute("fontId", sourceStyle.getAttribute("fontId") ?? "0");
  clone.setAttribute("applyFont", "1");
  cellXfs.appendChild(clone);
  targetCell.setAttribute("s", String(styles.length));
  cellXfs.setAttribute("count", String(styles.length + 1));
}

function alignCell(
  stylesDocument: XMLDocument,
  cell: Element,
  horizontal: "left" | "center" | "right"
) {
  const cellXfs = directChild(stylesDocument.documentElement, "cellXfs");
  if (!cellXfs) throw new Error("Template thiếu định dạng ô.");

  const styles = Array.from(cellXfs.children).filter((child) => child.localName === "xf");
  const currentStyle = styles[Number(cell.getAttribute("s") ?? 0)];
  if (!currentStyle) throw new Error("Template thiếu style căn chỉnh.");

  const clone = currentStyle.cloneNode(true) as Element;
  let alignment = directChild(clone, "alignment");
  if (!alignment) {
    alignment = createXmlElement(stylesDocument, "alignment");
    clone.appendChild(alignment);
  }
  alignment.setAttribute("horizontal", horizontal);
  clone.setAttribute("applyAlignment", "1");
  cellXfs.appendChild(clone);
  cell.setAttribute("s", String(styles.length));
  cellXfs.setAttribute("count", String(styles.length + 1));
}

function setColumnWidth(sheetDocument: XMLDocument, columnNumber: number, width: number) {
  const columns = Array.from(sheetDocument.getElementsByTagNameNS(XML_NAMESPACE, "col"));
  const column = columns.find((item) => {
    const min = Number(item.getAttribute("min"));
    const max = Number(item.getAttribute("max"));
    return min <= columnNumber && columnNumber <= max;
  });
  if (!column) throw new Error(`Template thiếu cấu hình cột ${columnNumber}.`);

  column.setAttribute("width", String(width));
  column.setAttribute("customWidth", "1");
}

function formatDateRange(start: string, end: string) {
  const toDmy = (value: string) => {
    const parts = parseDateParts(value);
    return parts
      ? `${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")}/${parts.year}`
      : value;
  };
  if (!start && !end) return "";
  if (!end || start === end) return toDmy(start || end);
  return `${toDmy(start)} - ${toDmy(end)}`;
}

function sanitizeFilePart(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "_").replace(/_+/g, "_");
}

export async function createStatementOfAccount(
  templateBuffer: ArrayBuffer,
  data: ReconciliationData
) {
  const zip = await JSZip.loadAsync(templateBuffer);
  const sheetFile = zip.file("xl/worksheets/sheet1.xml");
  const workbookFile = zip.file("xl/workbook.xml");
  const stylesFile = zip.file("xl/styles.xml");
  if (!sheetFile || !workbookFile || !stylesFile) {
    throw new Error("Template SOA không đủ thành phần cần thiết.");
  }

  const [sheetXml, workbookXml, stylesXml] = await Promise.all([
    sheetFile.async("string"),
    workbookFile.async("string"),
    stylesFile.async("string"),
  ]);
  const sheetDocument = parseXml(sheetXml);
  const workbookDocument = parseXml(workbookXml);
  const stylesDocument = parseXml(stylesXml);
  const extraRows = Math.max(0, data.rows.length - TEMPLATE_DATA_ROWS);
  const totalRowNumber = TEMPLATE_TOTAL_ROW + extraRows;

  shiftTemplateRows(sheetDocument, extraRows);
  extendDataRows(sheetDocument, extraRows);
  updateDefinedRange(workbookDocument, totalRowNumber);
  const applyVndStyle = createVndStyleFactory(stylesDocument);

  // The template's original money columns are too narrow for values such as
  // "1,480,000 ₫", which Excel renders as ##########.
  setColumnWidth(sheetDocument, 6, 15.5);
  setColumnWidth(sheetDocument, 7, 14.5);
  setColumnWidth(sheetDocument, 8, 15.5);

  const setTextAt = (reference: string, value: string) => {
    const match = reference.match(/^([A-Z]+)(\d+)$/);
    if (!match) return;
    const row = getRow(sheetDocument, Number(match[2]));
    if (!row) return;
    setInlineString(sheetDocument, ensureCell(sheetDocument, row, match[1]), value);
  };

  setTextAt("F1", "No:");
  setTextAt("F2", "Date:");
  setTextAt("G1", data.statementId);
  setTextAt("G2", formatDateRange(data.periodStart, data.periodEnd));

  // Older exports placed these values in H1/H2. Keep the final column empty so
  // the text stored in G can display across the available space.
  const clearAt = (reference: string) => {
    const match = reference.match(/^([A-Z]+)(\d+)$/);
    if (!match) return;
    const row = getRow(sheetDocument, Number(match[2]));
    if (!row) return;
    clearCell(ensureCell(sheetDocument, row, match[1]));
  };
  clearAt("H1");
  clearAt("H2");

  const alignLeftAt = (reference: string) => {
    const match = reference.match(/^([A-Z]+)(\d+)$/);
    if (!match) return;
    const row = getRow(sheetDocument, Number(match[2]));
    if (!row) return;
    alignCell(stylesDocument, ensureCell(sheetDocument, row, match[1]), "left");
  };
  ["F1", "G1", "F2", "G2"].forEach(alignLeftAt);

  if (data.merchantName) {
    setTextAt("E5", data.merchantName);
    const companyRow = getRow(sheetDocument, 5);
    if (companyRow) {
      const fromCell = ensureCell(sheetDocument, companyRow, "B");
      const toCell = ensureCell(sheetDocument, companyRow, "E");
      matchCellFont(stylesDocument, toCell, fromCell);
      alignCell(stylesDocument, toCell, "left");
    }
  }
  setTextAt("A10", `STATEMENT OF ACCOUNT FOR ${data.monthLabel} (DISBURSEMENT NOTE)`);
  setTextAt("A11", `${data.monthLabel} 月份对账单`);
  setTextAt(
    "G12",
    data.serviceFeeRate === null
      ? "Phí dịch vụ/服务费"
      : `Phí dịch vụ/服务费 ${data.serviceFeeRate}%`
  );

  const reservedRows = Math.max(TEMPLATE_DATA_ROWS, data.rows.length);
  for (let index = 0; index < reservedRows; index++) {
    const rowNumber = DATA_START_ROW + index;
    const rowElement = getRow(sheetDocument, rowNumber);
    if (!rowElement) throw new Error(`Template thiếu dòng dữ liệu ${rowNumber}.`);

    const cells = ["A", "B", "C", "D", "E", "F", "G", "H"].map((column) =>
      ensureCell(sheetDocument, rowElement, column)
    );
    const source = data.rows[index];

    if (!source) {
      cells.forEach(clearCell);
      continue;
    }

    setNumber(sheetDocument, cells[0], index + 1);
    setInlineString(sheetDocument, cells[1], source.reconciledAt);
    setInlineString(sheetDocument, cells[2], source.orderId);
    setInlineString(sheetDocument, cells[3], source.productId);
    setInlineString(sheetDocument, cells[4], source.productName);
    setNumber(sheetDocument, cells[5], source.comboPrice);
    setNumber(sheetDocument, cells[6], source.serviceFee);
    setNumber(sheetDocument, cells[7], source.reconciliationAmount);
    cells.slice(5).forEach(applyVndStyle);
  }

  const totalRow = getRow(sheetDocument, totalRowNumber);
  if (!totalRow) throw new Error("Template thiếu dòng tổng cộng.");
  const totalValues = [
    ["F", "comboPrice", data.totals.comboPrice],
    ["G", "serviceFee", data.totals.serviceFee],
    ["H", "reconciliationAmount", data.totals.reconciliationAmount],
  ] as const;
  totalValues.forEach(([column, , value]) => {
    const cell = ensureCell(sheetDocument, totalRow, column);
    // Write the already reconciled totals as numeric values. This avoids relying on
    // the viewer's formula-recalculation engine while keeping the cells numeric.
    setNumber(sheetDocument, cell, value);
    applyVndStyle(cell);
  });

  const serializer = new XMLSerializer();
  zip.file("xl/worksheets/sheet1.xml", serializer.serializeToString(sheetDocument));
  zip.file("xl/workbook.xml", serializer.serializeToString(workbookDocument));
  zip.file("xl/styles.xml", serializer.serializeToString(stylesDocument));

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: XLSX_MIME,
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  const suffix = data.statementId ? `_${sanitizeFilePart(data.statementId)}` : "";
  return {
    blob,
    fileName: `SOA_MT_LIFE_${sanitizeFilePart(data.monthLabel)}${suffix}.xlsx`,
  };
}
