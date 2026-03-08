"use client";


import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { db } from "@/lib/db";
import { syncPending } from "@/lib/sync";
import { RecordRow } from "@/lib/types";
import RecordsToolbar from "./RecordsToolbar";
import RecordsTable from "./RecordsTable";
import { useMasters } from "@/lib/useMasters";

export type Filters = {
  month?: string; // "YYYY-MM"
  from?: string;
  to?: string;
  bd_id?: string;
  customer_name?: string;
  customer_type_id?: string;
  point_type_id?: string;
};


export type RecordVM = RecordRow & {
  _sync_status?: "pending" | "synced" | "failed";
};


export default function RecordsPage({ isAdmin }: { isAdmin: boolean }) {
  const [filters, setFilters] = useState<Filters>({});
  const [rows, setRows] = useState<RecordVM[]>([]);
  const [loading, setLoading] = useState(false);

  const { items: bdList } = useMasters("bd");
  const { items: levelList } = useMasters("bd_level");
  const { items: customerTypes } = useMasters("customer_type");
  const { items: pointTypes } = useMasters("point_type");

  const bdMap = useMemo(
    () => Object.fromEntries(bdList.map((x) => [x.id, x.label])),
    [bdList]
  );

  const levelMap = useMemo(
    () => Object.fromEntries(levelList.map((x) => [x.id, x.label])),
    [levelList]
  );

  const customerTypeMap = useMemo(
    () => Object.fromEntries(customerTypes.map((x) => [x.id, x.label])),
    [customerTypes]
  );

  const pointTypeMap = useMemo(
    () => Object.fromEntries(pointTypes.map((x) => [x.id, x.label])),
    [pointTypes]
  );


  async function refresh() {
    setLoading(true);


    // local
    const local = await db.records.toArray();


    // server
    const { data, error } = await supabase.from("records").select("*");


    // nếu server fail -> show local only (kèm status)
    if (error) {
      const localOnly: RecordVM[] = local
        .filter((x) => !x.deleted)
        .map(({ sync_status, updated_at_local, last_error, deleted, ...r }) => ({
          ...(r as RecordRow),
          _sync_status: sync_status,
        }));


      setRows(localOnly);
      setLoading(false);
      return;
    }


    // server data -> mặc định synced
    const serverMap = new Map<string, RecordVM>(
      (data ?? []).map((r: any) => [r.id, { ...(r as RecordRow), _sync_status: "synced" }])
    );


    // local overwrite server + gắn pending/failed
    for (const l of local) {
      // chỉ overlay nếu local chưa sync xong
      if (l.sync_status === "synced") continue;

      if (l.deleted) continue;

      const { sync_status, updated_at_local, last_error, deleted, ...pure } = l as any;

      serverMap.set(l.id, {
        ...(pure as RecordRow),
        _sync_status: sync_status,
      });
    }

    setRows(Array.from(serverMap.values()));
    setLoading(false);
  }

  useEffect(() => {
    refresh();

    const onOnline = async () => {
      await syncPending();
      await refresh();
    };

    const onMastersUpdated = () => {
      refresh();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("masters-updated", onMastersUpdated);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("masters-updated", onMastersUpdated);
    };
  }, []);

  const filtered = useMemo(() => {
    return [...rows]
      .filter((r) => {
        if (filters.from && r.event_date < filters.from) return false;
        if (filters.to && r.event_date > filters.to) return false;
        if (filters.bd_id && r.bd_id !== filters.bd_id) return false;
        if (filters.customer_type_id && r.customer_type_id !== filters.customer_type_id) return false;
        if (filters.point_type_id && r.point_type_id !== filters.point_type_id) return false;
        if (
          filters.customer_name &&
          !r.customer_name.toLowerCase().includes(filters.customer_name.toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        // newest -> oldest
        if (a.event_date !== b.event_date) {
          return b.event_date.localeCompare(a.event_date);
        }

        // nếu cùng ngày thì ưu tiên updated_at / created_at mới hơn
        const aTime = a.updated_at ?? a.created_at ?? "";
        const bTime = b.updated_at ?? b.created_at ?? "";
        return bTime.localeCompare(aTime);
      });
  }, [rows, filters]);

return (
  <div className="space-y-3">
    <RecordsToolbar
      filters={filters}
      onChangeFilters={setFilters}
      rowsForExport={filtered}
      onRefresh={refresh}
      isAdmin = {isAdmin}
    />

    <RecordsTable
      rows={filtered}
      loading={loading}
      onChanged={refresh}
      bdMap={bdMap}
      levelMap={levelMap}
      customerTypeMap={customerTypeMap}
      pointTypeMap={pointTypeMap}
      isAdmin={isAdmin}
    />
  </div>
  );
}