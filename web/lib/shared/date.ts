import { format } from "date-fns";

export function formatDMY(isoDate: string) {
  if (!isoDate || isoDate === "null") return "—";
  const d = new Date(isoDate + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "dd/MM/yyyy");
}

export function toISODate(d: Date) {
  // Date -> "YYYY-MM-DD"
  return format(d, "yyyy-MM-dd");
}
