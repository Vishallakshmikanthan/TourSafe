import { Suspense } from "react";
import { ResponseTimeChart } from "@/components/charts/ResponseTimeChart";
import { IncidentTrendChart } from "@/components/charts/IncidentTrendChart";
import { AlertDistributionChart } from "@/components/charts/AlertDistributionChart";
import { ZoneStatsChart } from "@/components/charts/ZoneStatsChart";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAnalyticsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ts-navy">Analytics & Insights</h1>
        <p className="text-sm text-ts-slate/60 mt-0.5">
          Operational intelligence across all zones
        </p>
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-2 gap-5">
        <Suspense fallback={<Skeleton className="h-72 rounded-xl" />}>
          <ResponseTimeChart />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-72 rounded-xl" />}>
          <IncidentTrendChart />
        </Suspense>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-3 gap-5">
        <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
          <AlertDistributionChart />
        </Suspense>
        <div className="col-span-2">
          <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
            <ZoneStatsChart />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
