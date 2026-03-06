import { format } from "date-fns";

export function formatDMY(isoDate: string) {
  // isoDate: "YYYY-MM-DD"
  // parse bằng Date() sẽ ổn vì là date-only
  const d = new Date(isoDate + "T00:00:00");
  return format(d, "dd/MM/yyyy");
}

export function toISODate(d: Date) {
  // Date -> "YYYY-MM-DD"
  return format(d, "yyyy-MM-dd");
}
