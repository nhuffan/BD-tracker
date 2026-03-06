import Dexie, { Table } from "dexie";
import { RecordRow } from "./types";

export type SyncStatus = "pending" | "synced" | "failed";

export type LocalRecord = RecordRow & {
  sync_status: SyncStatus;
  updated_at_local: number; // Date.now()
  last_error?: string;
  deleted?: boolean; // soft delete locally
};

class AppDB extends Dexie {
  records!: Table<LocalRecord, string>;

  constructor() {
    super("bd_points_db");
    this.version(1).stores({
      records: "id, event_date, bd_id, customer_name, customer_type_id, point_type_id, sync_status, updated_at_local",
    });
  }
}

export const db = new AppDB();