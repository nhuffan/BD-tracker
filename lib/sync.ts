import { db } from "./db";
import { supabase } from "./supabaseClient";


const MAX_FAILED_RETRIES = 3;

export async function syncPending() {
  // Retry failed records up to MAX_FAILED_RETRIES times
  const failed = await db.records
    .where("sync_status")
    .equals("failed")
    .sortBy("updated_at_local");

  for (const item of failed) {
    const retries = (item as any)._failed_retries ?? 0;
    if (retries >= MAX_FAILED_RETRIES) continue;

    try {
      const { sync_status, updated_at_local, last_error, deleted, _failed_retries, ...row } = item;

      const { error } = await supabase.from("records").upsert(row);
      if (error) throw error;

      await db.records.delete(item.id);
    } catch (e: any) {
      await db.records.update(item.id, {
        sync_status: "failed",
        last_error: e?.message ?? "Unknown error",
        _failed_retries: retries + 1,
      });
    }
  }

  const pending = await db.records
    .where("sync_status")
    .equals("pending")
    .sortBy("updated_at_local");


  for (const item of pending) {
    try {
      if (item.deleted) {
        const { error } = await supabase.from("records").delete().eq("id", item.id);
        if (error) throw error;

        await db.records.delete(item.id);
      } else {
        const { sync_status, updated_at_local, last_error, deleted, ...row } = item;


        const { error } = await supabase.from("records").upsert(row);
        if (error) throw error;


        await db.records.delete(item.id)
      }
    } catch (e: any) {
      await db.records.update(item.id, {
        sync_status: "failed",
        last_error: e?.message ?? "Unknown error",
      });
    }
  }
}