"use client";

import { Suspense, useState } from "react";
import { AdminMap } from "@/components/map/AdminMap";
import { MapControlBar } from "@/components/map/MapControlBar";
import { TouristDetailPanel } from "@/components/map/TouristDetailPanel";
import { useMapStore } from "@/store/mapStore";
import { useSOSStore } from "@/store/sosStore";
import { Users, Bell, Siren, Layers } from "lucide-react";

export default function AdminMapPage() {
  const { selectedMarker } = useMapStore();
  const { activeEvents } = useSOSStore();
  const activeSOS = activeEvents.filter((e) => e.status === "reported").length;

  return (
    <div className="flex flex-col h-full">
      {/* Top stats bar */}
      <div className="flex items-center gap-6 px-5 py-3 bg-white border-b border-ts-mid flex-shrink-0">
        <StatChip icon={Users} label="Active Tourists" value="—" color="text-ts-teal" />
        <StatChip icon={Bell} label="Live Alerts" value="—" color="text-ts-saffron" />
        <StatChip
          icon={Siren}
          label="Active SOS"
          value={String(activeSOS)}
          color={activeSOS > 0 ? "text-ts-alert-red" : "text-ts-green"}
          pulse={activeSOS > 0}
        />
        <StatChip icon={Layers} label="Zones Monitored" value="—" color="text-ts-navy" />
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
