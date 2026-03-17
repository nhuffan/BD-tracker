"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import CustomerTrackingToolbar from "./CustomerTrackingToolbar";
import CustomerTrackingTable from "./CustomerTrackingTable";
import type { TrackingFilters, TrackingRecordVM } from "./types";
import { useMasters } from "@/lib/useMasters";

export default function CustomerTrackingPage({
  isAdmin,
}: {
  isAdmin: boolean;
}) {
  const [filters, setFilters] = useState<TrackingFilters>({});
  const [rows, setRows] = useState<TrackingRecordVM[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const { items: bdList } = useMasters("bd");

  const bdMap = useMemo(
    () => Object.fromEntries(bdList.map((x) => [x.id, x.label])),
    [bdList]
  );

  async function refresh() {
    setLoading(true);

    const { data, error } = await supabase
      .from("customer_tracking")
      .select("*");

    if (error) {
      console.error("Failed to fetch customer tracking:", error);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows(
      (data ?? []).map((r) => ({
        ...r,
        _sync_status: "synced",
      }))
    );

    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    return [...rows]
      .filter((r) => {
        if (filters.from && r.event_date < filters.from) return false;
        if (filters.to && r.event_date > filters.to) return false;
        if (filters.bd_id && r.bd_id !== filters.bd_id) return false;

        if (
          filters.customer_name &&
          !r.customer_name
            .toLowerCase()
            .includes(filters.customer_name.toLowerCase())
        ) {
          return false;
        }

        if (filters.combo_voucher === "yes" && r.combo_voucher !== true) {
          return false;
        }

        if (filters.combo_voucher === "none" && r.combo_voucher === true) {
          return false;
        }

        if (search) {
          const keyword = search.toLowerCase();

          const match =
            r.customer_name.toLowerCase().includes(keyword) ||
            (bdMap[r.bd_id ?? ""] ?? "").toLowerCase().includes(keyword) ||
            (r.note ?? "").toLowerCase().includes(keyword) ||
            (r.info ?? "").toLowerCase().includes(keyword);

          if (!match) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (a.event_date !== b.event_date) {
          return b.event_date.localeCompare(a.event_date);
        }

        const aTime = a.updated_at ?? a.created_at ?? "";
        const bTime = b.updated_at ?? b.created_at ?? "";
        return bTime.localeCompare(aTime);
      });
  }, [rows, filters, search, bdMap]);

     const stats = useMemo(() => {
        const totalCustomers = filtered.length;

        const totalBranches = filtered.reduce((sum, r) => {
            return sum + (r.branch ?? 0);
        }, 0);

        return {
            totalCustomers,
            totalBranches,
        };
    }, [filtered]);

  return (
    <div className="space-y-3">
      <CustomerTrackingToolbar
        filters={filters}
        onChangeFilters={setFilters}
        rowsForExport={filtered}
        onRefresh={refresh}
        isAdmin={isAdmin}
        bdMap={bdMap}
      />

      <CustomerTrackingTable
        rows={filtered}
        loading={loading}
        onChanged={refresh}
        isAdmin={isAdmin}
        search={search}
        onSearchChange={setSearch}
        bdMap={bdMap}
        stats={stats}
      />
    </div>
  );
}