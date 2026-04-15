"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { touristApi, zoneApi } from "@/lib/api";
import type { Tourist, GeoZone } from "@/types";
import { MapPin, Navigation, Layers, Crosshair, ShieldAlert, AlertTriangle, CheckCircle } from "lucide-react";
import { useMapStore } from "@/store/mapStore";
import { cn } from "@/lib/utils";

const TouristFullMapClient = dynamic(
  () => import("@/components/map/TouristFullMapClient"),
  { ssr: false }
);

export default function TouristMapPage() {
  const [tourist, setTourist] = useState<Tourist | null>(null);
  const [zones, setZones] = useState<GeoZone[]>([]);
  const { showZones, toggleZones } = useMapStore();

  useEffect(() => {
    touristApi.getMe().then((r) => setTourist(r.data)).catch(() => {});
    zoneApi.getAll().then((r) => {
      const data = Array.isArray(r.data) ? r.data : (r.data as any)?.items ?? [];
      setZones(data);
    }).catch(() => {});
  }, []);

  // Find the tourist's current zone details
  const currentZone = zones.find((z) => z.id === tourist?.current_zone_id);

  // Nearby warning/danger zones (all zones with alerts or danger type)
  const alertZones = zones.filter((z) => (z.alert_count ?? 0) > 0 || z.type === "danger" || z.type === "restricted");

  const handleCenterMe = () => {
    if (typeof window !== "undefined" && (window as any).__touristMapCenterMe) {
      (window as any).__touristMapCenterMe();
    } else if (tourist?.current_location && typeof window !== "undefined") {
      // fallback: re-render will center
    }
  };

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
            onClick={handleCenterMe}
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
            <InfoRow
              label="Current Zone"
              value={tourist?.current_zone ?? currentZone?.name ?? "Detecting…"}
            />
            <InfoRow
              label="Zone Type"
              value={currentZone?.type ? currentZone.type.charAt(0).toUpperCase() + currentZone.type.slice(1) : "—"}
            />
            <InfoRow
              label="Coordinates"
              value={
                tourist?.current_location
                  ? `${tourist.current_location.latitude.toFixed(5)}, ${tourist.current_location.longitude.toFixed(5)}`
                  : "—"
              }
            />
            <InfoRow label="Last Update" value="Live — tracking active" />
            <InfoRow
              label="Safety Status"
              value={tourist?.status === "safe" ? "✓ Safe" : (tourist?.status ?? "Unknown")}
            />
          </div>

          {/* Current zone alert */}
          {currentZone && (currentZone.type === "danger" || currentZone.type === "restricted" || currentZone.type === "warning") && (
            <div className={cn(
              "rounded-lg p-3 border",
              currentZone.type === "danger" || currentZone.type === "restricted"
                ? "bg-red-50 border-red-200"
                : "bg-yellow-50 border-yellow-200"
            )}>
              <div className="flex items-center gap-2 mb-1">
                <ShieldAlert className={cn(
                  "w-4 h-4",
                  currentZone.type === "danger" || currentZone.type === "restricted"
                    ? "text-ts-alert-red" : "text-yellow-600"
                )} />
                <p className={cn(
                  "text-xs font-bold uppercase",
                  currentZone.type === "danger" || currentZone.type === "restricted"
                    ? "text-ts-alert-red" : "text-yellow-700"
                )}>
                  {currentZone.type === "restricted" ? "Restricted Area" :
                   currentZone.type === "danger" ? "Danger Zone" : "Warning Zone"}
                </p>
              </div>
              <p className="text-xs text-ts-navy">{currentZone.name}</p>
            </div>
          )}

          {currentZone && currentZone.type === "safe" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-ts-green flex-shrink-0" />
              <p className="text-xs text-ts-green font-medium">You are in a safe zone</p>
            </div>
          )}

          {/* Movement trail */}
          <div className="border-t border-ts-mid pt-4">
            <h4 className="text-xs font-semibold text-ts-navy mb-2">Movement Trail</h4>
            <p className="text-xs text-ts-slate/50">
              Real-time GPS breadcrumbs shown on map. Trail preserved for 24 hours.
            </p>
          </div>

          {/* Nearby zone alerts */}
          <div className="border-t border-ts-mid pt-4">
            <h4 className="text-xs font-semibold text-ts-navy mb-2">
              Nearby Alerts
              {alertZones.length > 0 && (
                <span className="ml-1.5 bg-ts-alert-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {alertZones.length}
                </span>
              )}
            </h4>
            {alertZones.length === 0 ? (
              <p className="text-xs text-ts-slate/50">No restricted zones nearby.</p>
            ) : (
              <div className="space-y-2">
                {alertZones.slice(0, 4).map((z) => (
                  <div key={z.id} className="flex items-start gap-2">
                    <AlertTriangle className={cn(
                      "w-3.5 h-3.5 mt-0.5 flex-shrink-0",
                      z.type === "danger" || z.type === "restricted" ? "text-ts-alert-red" : "text-yellow-500"
                    )} />
                    <div>
                      <p className="text-xs font-medium text-ts-navy leading-tight">{z.name}</p>
                      <p className="text-[10px] text-ts-slate/50">
                        {z.alert_count} alert{z.alert_count !== 1 ? "s" : ""} · {z.type}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
      <span className="font-medium text-ts-navy text-xs max-w-[144px] text-right truncate">{value}</span>
    </div>
  );
}
