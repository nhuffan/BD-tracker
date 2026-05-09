import { supabase } from "./supabaseClient";
import type { RecordRow } from "./types";

export type BdMonthlyLevelRow = {
  bd_id: string;
  bd_level_id: string;
  month_key: string;
};

export type BdMonthlyLevelMap = Record<string, Record<string, string>>;

export function getMonthKeyFromDate(value?: string | null) {
  return value ? value.slice(0, 7) : "";
}

export async function fetchBdMonthlyLevels(monthKeys?: string[]) {
  const normalizedKeys = Array.from(
    new Set((monthKeys ?? []).filter(Boolean))
  );

  let query = supabase
    .from("bd_monthly_levels")
    .select("bd_id, bd_level_id, month_key");

  if (normalizedKeys.length > 0) {
    const latestMonthKey = [...normalizedKeys].sort().at(-1);

    if (latestMonthKey) {
      query = query.lte("month_key", latestMonthKey);
    }
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as BdMonthlyLevelRow[];
  const map: BdMonthlyLevelMap = {};

  for (const row of rows) {
    if (!map[row.month_key]) {
      map[row.month_key] = {};
    }

    map[row.month_key][row.bd_id] = row.bd_level_id;
  }

  return map;
}

export function resolveBdLevelIdByMonth(
  monthKey: string,
  bdId: string,
  monthlyLevelMap: BdMonthlyLevelMap
) {
  if (!monthKey || !bdId) return "";

  const sortedMonthKeys = Object.keys(monthlyLevelMap)
    .filter((key) => key <= monthKey)
    .sort((a, b) => b.localeCompare(a));

  for (const key of sortedMonthKeys) {
    const levelId = monthlyLevelMap[key]?.[bdId];
    if (levelId) {
      return levelId;
    }
  }

  return "";
}

export function getBdLevelsForMonth(
  monthKey: string,
  bdIds: string[],
  monthlyLevelMap: BdMonthlyLevelMap
) {
  return Object.fromEntries(
    Array.from(new Set(bdIds))
      .filter(Boolean)
      .map((bdId) => [bdId, resolveBdLevelIdByMonth(monthKey, bdId, monthlyLevelMap)])
      .filter(([, bdLevelId]) => Boolean(bdLevelId))
  ) as Record<string, string>;
}

export function resolveBdLevelId(
  record: Pick<RecordRow, "event_date" | "bd_id" | "bd_level_id">,
  monthlyLevelMap: BdMonthlyLevelMap
) {
  const monthKey = getMonthKeyFromDate(record.event_date);
  return (
    resolveBdLevelIdByMonth(monthKey, record.bd_id, monthlyLevelMap) ||
    record.bd_level_id ||
    ""
  );
}

export function normalizeRecordBdLevel<T extends Pick<RecordRow, "event_date" | "bd_id" | "bd_level_id">>(
  record: T,
  monthlyLevelMap: BdMonthlyLevelMap
) {
  const resolvedBdLevelId = resolveBdLevelId(record, monthlyLevelMap);
  return resolvedBdLevelId === record.bd_level_id
    ? record
    : { ...record, bd_level_id: resolvedBdLevelId };
}
