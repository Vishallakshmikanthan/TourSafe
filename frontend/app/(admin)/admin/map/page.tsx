"use client";

import { Suspense, useState, useEffect } from "react";
import { AdminMap } from "@/components/map/AdminMap";
import { MapControlBar } from "@/components/map/MapControlBar";
import { TouristDetailPanel } from "@/components/map/TouristDetailPanel";
import { useMapStore } from "@/store/mapStore";
import { useSOSStore } from "@/store/sosStore";
import { useAlertStore } from "@/store/alertStore";
import { Users, Bell, Siren, Layers, ShieldAlert, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function AdminMapPage() {
  const { selectedMarker, markers, zones } = useMapStore();
  const { activeEvents } = useSOSStore();
  const { alerts } = useAlertStore();
  const activeSOS = activeEvents.filter((e) => e.status === "reported").length;
  const liveAlerts = alerts.filter((a) => a.status === "active").length;

  // Danger zone alerts — "zone_exit" or "zone_breach" alerts filtered to restricted zones
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const dangerAlerts = alerts.filter(
    (a) =>
      !dismissedAlerts.has(a.id) &&
      (a.type === "zone_exit" || a.title.toLowerCase().includes("restricted") ||
        a.title.toLowerCase().includes("danger")) &&
      a.status !== "resolved"
  );

  return (
    <div className="flex flex-col h-full relative">
      {/* Danger Zone Alert Banners */}
      <AnimatePresence>
        {dangerAlerts.slice(0, 3).map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="absolute top-0 left-0 right-0 z-[500] pointer-events-none"
          >
            <div className="mx-4 mt-3 bg-ts-alert-red text-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg pointer-events-auto border border-red-400/50">
              <ShieldAlert className="w-5 h-5 shrink-0 animate-pulse" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold leading-none mb-0.5">DANGER ZONE BREACH</p>
                <p className="text-[11px] text-red-100 truncate">
                  {alert.description ?? "A tourist has entered a restricted zone"}
                </p>
              </div>
              <button
                onClick={() =>
                  setDismissedAlerts((p) => new Set([...p, alert.id]))
                }
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Top stats bar */}
      <div className="flex items-center gap-6 px-5 py-3 bg-white border-b border-ts-mid flex-shrink-0">
        <StatChip icon={Users} label="Active Tourists" value={String(markers.length)} color="text-ts-teal" />
        <StatChip icon={Bell} label="Live Alerts" value={String(liveAlerts)} color="text-ts-saffron" />
        <StatChip
          icon={Siren}
          label="Active SOS"
          value={String(activeSOS)}
          color={activeSOS > 0 ? "text-ts-alert-red" : "text-ts-green"}
          pulse={activeSOS > 0}
        />
        <StatChip icon={Layers} label="Zones Monitored" value={String(zones.length)} color="text-ts-navy" />
        <div className="flex-1" />
        <MapControlBar />
      </div>

      {/* Map + Panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map — 75% */}
        <div className="flex-1 map-panel rounded-none border-0 relative">
          <Suspense
            fallback={
              <div className="w-full h-full bg-[#1a293d] flex items-center justify-center">
                <p className="text-white/50 text-sm">Loading command map...</p>
              </div>
            }
          >
            <AdminMap />
          </Suspense>
        </div>

        {/* Right detail panel — 320px */}
        <TouristDetailPanel tourist={selectedMarker} />
      </div>
    </div>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
  color,
  pulse,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  pulse?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`w-4 h-4 ${color} ${pulse ? "animate-pulse" : ""}`} />
      <div>
        <p className="text-[11px] text-ts-slate/50 font-medium leading-none">
          {label}
        </p>
        <p className={`text-sm font-bold leading-tight mt-0.5 ${color}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
