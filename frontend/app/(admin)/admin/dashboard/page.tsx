import { Suspense } from "react";
import { KPICards } from "@/components/analytics/KPICards";
import { RecentAlertsTable } from "@/components/alerts/RecentAlertsTable";
import { ZoneOverviewTable } from "@/components/analytics/ZoneOverviewTable";
import { MiniMapWidget } from "@/components/map/MiniMapWidget";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardPage() {
  return (
    <div className="p-6 space-y-6 min-h-full">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-ts-navy">Operations Dashboard</h1>
        <p className="text-sm text-ts-slate/60 mt-0.5">
          Real-time overview of tourist safety operations
        </p>
      </div>

      {/* KPI Cards */}
      <Suspense fallback={<KPISkeleton />}>
        <KPICards />
      </Suspense>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-5">
        {/* Alerts Table — left 8 cols */}
        <div className="col-span-8">
          <Suspense fallback={<Skeleton className="h-80 rounded-xl" />}>
            <RecentAlertsTable />
          </Suspense>
        </div>

        {/* Zone overview — right 4 cols */}
        <div className="col-span-4 space-y-5">
          <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
            <ZoneOverviewTable />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
            <MiniMapWidget />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function KPISkeleton() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  );
}
