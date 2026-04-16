"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getAdsTrackingStatus } from "@/lib/adsTracking";
import CreateAdRecordDialog from "./CreateAdRecordDialog";
import AdsTrackingTable from "./AdsTrackingTable";

export type AdTrackingRow = {
  id: string;
  source_record_id: string | null;
  customer_name: string;
  point_type_id: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
};

export default function AdsTrackingPage({
  isAdmin,
  currentUserId,
}: {
  isAdmin: boolean;
  currentUserId: string;
}) {
  const [rows, setRows] = useState<AdTrackingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);

  async function refresh() {
    setLoading(true);

    const { data, error } = await supabase
      .from("ad_tracking_records")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setRows((data ?? []) as AdTrackingRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    refresh();

    const channel = supabase
      .channel("ad-tracking-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ad_tracking_records" },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const totalCampaigns = rows.length;
  const activeNow = rows.filter(
    (x) => getAdsTrackingStatus(x.end_date) === "active"
  ).length;
  const expiringSoon = rows.filter(
    (x) => getAdsTrackingStatus(x.end_date) === "expiring_soon"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ads Tracking</h1>
          <p className="text-sm text-muted-foreground">
            Real-time oversight of customer promotional campaigns.
          </p>
        </div>

        {isAdmin && (
          <Button className="h-10 cursor-pointer" onClick={() => setOpenCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Ad Record
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        <div className="rounded-xl border bg-background p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Total Campaigns
          </div>
          <div className="mt-2 text-3xl font-bold">{totalCampaigns}</div>
        </div>

        <div className="rounded-xl border bg-background p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Active Now
          </div>
          <div className="mt-2 text-3xl font-bold">{activeNow}</div>
        </div>

        <div className="rounded-xl border bg-background p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Expiring Soon
          </div>
          <div className="mt-2 text-3xl font-bold">{expiringSoon}</div>
        </div>

        <div className="rounded-xl border bg-background p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Revenue MTD
          </div>
          <div className="mt-2 text-3xl font-bold">—</div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <AdsTrackingTable rows={rows} />
      )}

      <CreateAdRecordDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onSaved={refresh}
        currentUserId={currentUserId}
      />
    </div>
  );
}