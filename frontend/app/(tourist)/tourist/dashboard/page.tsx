"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useSOSStore } from "@/store/sosStore";
import { useAlertStore } from "@/store/alertStore";
import { touristApi, alertApi } from "@/lib/api";
import type { Tourist, DashboardKPIs } from "@/types";
import {
  ShieldAlert,
  MapPin,
  Bell,
  CheckCircle,
  AlertTriangle,
  Navigation,
  Wifi,
  WifiOff,
  TrendingUp,
  Phone,
} from "lucide-react";
import { cn, formatRelativeTime, severityBadgeColor } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";

const TouristMiniMap = dynamic(() => import("@/components/map/TouristMiniMapClient"), { ssr: false });

export default function TouristDashboard() {
  const { user } = useAuthStore();
  const { activeEvents } = useSOSStore();
  const { alerts } = useAlertStore();
  const [tourist, setTourist] = useState<Tourist | null>(null);
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      touristApi.getMe().then((r) => setTourist(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  const myAlerts = alerts.slice(0, 5);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Welcome banner */}
      <div className="bg-ts-navy text-white rounded-2xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
        />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-white/60 text-sm">Welcome back,</p>
            <h1 className="text-2xl font-bold mt-0.5">
              {user?.full_name ?? "Tourist"}
            </h1>
            <div className="flex items-center gap-2 mt-2 text-white/70 text-sm">
              <MapPin className="w-4 h-4" />
              <span>{tourist?.current_zone ?? "Location updating…"}</span>
            </div>
          </div>
          <Link
            href="/tourist/sos"
            className="flex flex-col items-center gap-2 bg-ts-alert-red hover:bg-red-700 text-white rounded-xl px-8 py-4 transition-colors shadow-lg"
          >
            <ShieldAlert className="w-7 h-7" />
            <span className="font-bold text-sm">SOS</span>
          </Link>
        </div>
      </div>

      {/* Status grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatusCard
          icon={<CheckCircle className="w-5 h-5 text-ts-green" />}
          label="Safety Status"
          value={tourist?.status === "safe" ? "Safe" : tourist?.status ?? "Unknown"}
          sub="Position shared"
          color="green"
          loading={loading}
        />
        <StatusCard
          icon={<Bell className="w-5 h-5 text-ts-saffron" />}
          label="Active Alerts"
          value={String(myAlerts.length)}
          sub="In your zone"
          color="saffron"
          loading={loading}
        />
        <StatusCard
          icon={<Navigation className="w-5 h-5 text-ts-teal" />}
          label="Current Zone"
          value={tourist?.current_zone ?? "—"}
          sub="Geofence active"
          color="teal"
          loading={loading}
        />
        <StatusCard
          icon={<Wifi className="w-5 h-5 text-ts-navy" />}
          label="Connectivity"
          value="Online"
          sub="Real-time tracking"
          color="navy"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Recent alerts */}
        <div className="col-span-1 bg-white rounded-xl border border-ts-mid p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-ts-navy text-sm">Recent Alerts</h3>
            <Link href="/tourist/incidents" className="text-xs text-ts-teal hover:underline">
              View all
            </Link>
          </div>
          {myAlerts.length === 0 ? (
            <div className="text-center py-8 text-ts-slate/40">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No active alerts</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 py-2 border-b border-ts-mid/50 last:border-0">
                  <span className={cn("mt-0.5 w-2 h-2 rounded-full shrink-0", severityBadgeColor(alert.severity))} />
                  <div>
                    <p className="text-xs font-medium text-ts-navy leading-tight">{alert.title}</p>
                    <p className="text-xs text-ts-slate/50 mt-0.5">{formatRelativeTime(alert.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mini map */}
        <div className="col-span-2 bg-white rounded-xl border border-ts-mid overflow-hidden">
          <div className="p-3 border-b border-ts-mid flex items-center justify-between">
            <h3 className="font-semibold text-ts-navy text-sm">Your Location</h3>
            <Link href="/tourist/map" className="text-xs text-ts-teal hover:underline">
              Full map →
            </Link>
          </div>
          <div className="h-56">
            <TouristMiniMap
              lat={tourist?.current_location?.latitude}
              lng={tourist?.current_location?.longitude}
            />
          </div>
        </div>

        {/* Emergency contacts quick access */}
        <div className="col-span-3 bg-white rounded-xl border border-ts-mid p-4">
          <h3 className="font-semibold text-ts-navy text-sm mb-3">Emergency Contacts</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Police", number: "100", color: "bg-ts-navy text-white" },
              { label: "Ambulance", number: "108", color: "bg-red-600 text-white" },
              { label: "Fire", number: "101", color: "bg-orange-500 text-white" },
              { label: "Tourist Helpline", number: "1800-111-363", color: "bg-ts-teal text-white" },
              { label: "Women Helpline", number: "1091", color: "bg-purple-600 text-white" },
              { label: "National Emergency", number: "112", color: "bg-ts-green text-white" },
            ].map((c) => (
              <a
                key={c.label}
                href={`tel:${c.number}`}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 transition-opacity hover:opacity-90",
                  c.color
                )}
              >
                <Phone className="w-4 h-4 shrink-0" />
                <div>
                  <p className="text-xs font-semibold">{c.label}</p>
                  <p className="text-xs opacity-80">{c.number}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  icon,
  label,
  value,
  sub,
  color,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
  loading: boolean;
}) {
  if (loading) return <Skeleton className="h-24 rounded-xl" />;
  return (
    <div className="bg-white rounded-xl border border-ts-mid p-4 flex items-start gap-3">
      <div className="p-2 bg-ts-light rounded-lg shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-ts-slate/60">{label}</p>
        <p className="font-bold text-ts-navy text-lg leading-tight">{value}</p>
        <p className="text-xs text-ts-slate/50 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}
