"use client";

import { getAdsTrackingStatus } from "@/lib/adsTracking";
import { formatDMY } from "@/lib/date";

export default function AdsTrackingTable({
  rows,
}: {
  rows: {
    id: string;
    customer_name: string;
    point_type_id: string;
    start_date: string;
    end_date: string;
  }[];
}) {
  function renderStatus(endDate: string) {
    const status = getAdsTrackingStatus(endDate);

    if (status === "active") {
      return (
        <span className="inline-flex rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          Active
        </span>
      );
    }

    if (status === "expiring_soon") {
      return (
        <span className="inline-flex rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
          Expiring Soon
        </span>
      );
    }

    return (
      <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
        Expired
      </span>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="w-full overflow-x-auto">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-[240px] p-3 text-left">Customer Name</th>
              <th className="w-[220px] p-3 text-left">Point Type</th>
              <th className="w-[140px] p-3 text-left">Start Date</th>
              <th className="w-[140px] p-3 text-left">End Date</th>
              <th className="w-[160px] p-3 text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-t odd:bg-muted/30 even:bg-background"
              >
                <td className="p-3">{row.customer_name}</td>
                <td className="p-3">{row.point_type_id}</td>
                <td className="p-3">{formatDMY(row.start_date)}</td>
                <td className="p-3">{formatDMY(row.end_date)}</td>
                <td className="p-3">{renderStatus(row.end_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground">
            No ad records found
          </div>
        )}
      </div>
    </div>
  );
}