"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { touristApi } from "@/lib/api";
import type { Tourist } from "@/types";
import { MapPin, Navigation, Layers, Crosshair } from "lucide-react";
import { useMapStore } from "@/store/mapStore";

const TouristFullMapClient = dynamic(
  () => import("@/components/map/TouristFullMapClient"),
  { ssr: false }
);

export default function TouristMapPage() {
  const [tourist, setTourist] = useState<Tourist | null>(null);
  const { showZones, toggleZones } = useMapStore();

  useEffect(() => {
    touristApi.getMe().then((r) => setTourist(r.data)).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col h-screen">
      {/* Control bar */}
      <div className="h-12 bg-white border-b border-ts-mid flex items-center px-4 gap-3 shrink-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-ts-navy">
          <MapPin className="w-4 h-4 text-ts-saffron" />
          My Location Map
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggleZones}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              showZones
                ? "bg-ts-navy text-white border-ts-navy"
                : "border-ts-mid text-ts-slate hover:bg-ts-light"
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Zones
          </button>
          <button
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-ts-mid text-ts-slate hover:bg-ts-light transition-colors"
          >
            <Crosshair className="w-3.5 h-3.5" /> Center Me
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Map */}
        <div className="flex-1">
          <TouristFullMapClient
            lat={tourist?.current_location?.latitude}
            lng={tourist?.current_location?.longitude}
            showZones={showZones}
          />
        </div>

        {/* Side info */}
        <div className="w-72 bg-white border-l border-ts-mid flex flex-col p-4 gap-4 overflow-y-auto scrollbar-thin">
          <h3 className="font-semibold text-ts-navy text-sm">Location Details</h3>
          <div className="space-y-3 text-sm">
            <InfoRow label="Current Zone" value={tourist?.current_zone ?? "Detecting…"} />
            <InfoRow
              label="Coordinates"
              value={
                tourist?.current_location
                  ? `${tourist.current_location.latitude.toFixed(5)}, ${tourist.current_location.longitude.toFixed(5)}`
                  : "—"
              }
            />
            <InfoRow label="Last Update" value="Live" />
            <InfoRow label="Safety Status" value={tourist?.status === "safe" ? "✓ Safe" : tourist?.status ?? "Unknown"} />
          </div>

          <div className="border-t border-ts-mid pt-4">
            <h4 className="text-xs font-semibold text-ts-slate mb-2">Movement Trail</h4>
            <p className="text-xs text-ts-slate/50">
              Real-time GPS breadcrumbs shown on map. Trail preserved for 24 hours.
            </p>
          </div>

          <div className="border-t border-ts-mid pt-4">
            <h4 className="text-xs font-semibold text-ts-slate mb-2">Zone Alerts</h4>
            <p className="text-xs text-ts-slate/50">No restricted zones nearby.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-ts-mid/50 last:border-0">
      <span className="text-ts-slate/60 text-xs">{label}</span>
      <span className="font-medium text-ts-navy text-xs">{value}</span>
    </div>
  );
}
