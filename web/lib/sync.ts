import { db } from "./db";
import type { LocalRecord } from "./db";
import { supabase } from "./supabaseClient";
import {
  fetchBdMonthlyLevels,
  normalizeRecordBdLevel,
  type BdMonthlyLevelMap,
} from "./bdMonthlyLevels";


const MAX_FAILED_RETRIES = 3;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function toRecordRow(item: LocalRecord) {
  return {
    id: item.id,
    event_date: item.event_date,
    bd_id: item.bd_id,
    bd_level_id: item.bd_level_id,
    customer_name: item.customer_name,
    customer_type_id: item.customer_type_id,
    point_type_id: item.point_type_id,
    category: item.category,
    points: item.points,
    money: item.money,
    package_amount: item.package_amount,
    note: item.note,
    created_at: item.created_at,
    updated_at: item.updated_at,
    branch_number: item.branch_number,
  };
}

export async function syncPending() {
  // Retry failed records up to MAX_FAILED_RETRIES times
  const failed = await db.records
    .where("sync_status")
    .equals("failed")
    .sortBy("updated_at_local");

  const pending = await db.records
    .where("sync_status")
    .equals("pending")
    .sortBy("updated_at_local");

  const monthKeys = Array.from(
    new Set(
      [...failed, ...pending]
        .filter((item) => !item.deleted)
        .map((item) => item.event_date?.slice(0, 7))
        .filter(Boolean) as string[]
    )
  );

  let monthlyLevelMap: BdMonthlyLevelMap = {};

  if (monthKeys.length > 0) {
    try {
      monthlyLevelMap = await fetchBdMonthlyLevels(monthKeys);
    } catch (error) {
      console.error("Failed to fetch BD monthly levels for sync:", error);
    }
  }

  for (const item of failed) {
    const retries = item._failed_retries ?? 0;
    if (retries >= MAX_FAILED_RETRIES) continue;

    try {
      const row = normalizeRecordBdLevel(toRecordRow(item as LocalRecord), monthlyLevelMap);

      const { error } = await supabase.from("records").upsert(row);
      if (error) throw error;

      await db.records.delete(item.id);
    } catch (error) {
      await db.records.update(item.id, {
        sync_status: "failed",
        last_error: getErrorMessage(error),
        _failed_retries: retries + 1,
      });
    }
  }

  for (const item of pending) {
    try {
      if (item.deleted) {
        const { error } = await supabase.from("records").delete().eq("id", item.id);
        if (error) throw error;

        await db.records.delete(item.id);
      } else {
        const row = normalizeRecordBdLevel(toRecordRow(item as LocalRecord), monthlyLevelMap);

        const { error } = await supabase.from("records").upsert(row);
        if (error) throw error;

        await db.records.delete(item.id);
      }
    } catch (error) {
      await db.records.update(item.id, {
        sync_status: "failed",
        last_error: getErrorMessage(error),
      });
    }
  }
}
