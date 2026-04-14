"use client";

import { useMapStore } from "@/store/mapStore";
import { Thermometer, MapPin, Layers, Map, Route } from "lucide-react";
import { cn } from "@/lib/utils";

export function MapControlBar() {
  const {
    showHeatmap,
    showMarkers,
    showZones,
    showTrails,
    toggleHeatmap,
    toggleMarkers,
    toggleZones,
    toggleTrails,
  } = useMapStore();

  const controls = [
    { label: "Heatmap", icon: Thermometer, active: showHeatmap, toggle: toggleHeatmap },
    { label: "Markers", icon: MapPin, active: showMarkers, toggle: toggleMarkers },
    { label: "Zones", icon: Layers, active: showZones, toggle: toggleZones },
    { label: "Trails", icon: Route, active: showTrails, toggle: toggleTrails },
  ];

  return (
    <div className="flex items-center gap-1 bg-ts-light rounded-lg p-1">
      {controls.map((c) => (
        <button
          key={c.label}
          onClick={c.toggle}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
            c.active
              ? "bg-ts-navy text-white shadow-sm"
              : "text-ts-slate/60 hover:text-ts-slate hover:bg-white"
          )}
        >
          <c.icon className="w-3.5 h-3.5" />
          {c.label}
        </button>
      ))}
    </div>
  );
}
