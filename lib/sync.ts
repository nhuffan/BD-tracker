import { db } from "./db";
import { supabase } from "./supabaseClient";


export async function syncPending() {
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


        await db.records.update(item.id, {
          sync_status: "synced",
          last_error: undefined,
        });
      }
    } catch (e: any) {
      await db.records.update(item.id, {
        sync_status: "failed",
        last_error: e?.message ?? "Unknown error",
      });
    }
  }
}