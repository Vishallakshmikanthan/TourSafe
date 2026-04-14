"use client";

import { useEffect, useState } from "react";
import { zoneApi } from "@/lib/api";
import type { GeoZone } from "@/types";
import { cn } from "@/lib/utils";
import { Layers, AlertTriangle } from "lucide-react";
import Link from "next/link";

const zoneTypeColors: Record<string, string> = {
  safe: "bg-green-100 text-ts-green",
  warning: "bg-orange-100 text-ts-saffron",
  danger: "bg-red-100 text-ts-alert-red",
  restricted: "bg-gray-100 text-ts-slate",
};

export function ZoneOverviewTable() {
  const [zones, setZones] = useState<GeoZone[]>([]);

  useEffect(() => {
    zoneApi
      .getAll()
      .then((r) => setZones(r.data?.items ?? []))
      .catch(() => setZones([]));
  }, []);

  return (
    <div className="bg-white rounded-xl border border-ts-mid shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-ts-mid">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-ts-navy" />
          <h3 className="font-semibold text-ts-navy text-sm">Zone Status</h3>
        </div>
        <Link
          href="/admin/zones"
          className="text-xs text-ts-teal hover:underline"
        >
          Manage →
        </Link>
      </div>

      <div className="divide-y divide-ts-mid/50">
        {zones.length === 0 ? (
          <p className="text-center py-6 text-xs text-ts-slate/40">
            No zones configured
          </p>
        ) : (
          zones.slice(0, 6).map((zone) => (
            <div
              key={zone.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-ts-light/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    zone.type === "safe"
                      ? "bg-ts-green"
                      : zone.type === "warning"
                      ? "bg-ts-saffron"
                      : zone.type === "danger"
                      ? "bg-ts-alert-red"
                      : "bg-ts-slate"
                  )}
                />
                <p className="text-xs font-medium text-ts-navy truncate">
                  {zone.name}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-ts-slate/60">
                  {zone.tourist_count} tourists
                </span>
                {zone.alert_count > 0 && (
                  <span className="flex items-center gap-0.5 text-xs text-ts-saffron font-semibold">
                    <AlertTriangle className="w-3 h-3" />
                    {zone.alert_count}
                  </span>
                )}
                <span
                  className={cn(
                    "status-pill text-[10px]",
                    zoneTypeColors[zone.type]
                  )}
                >
                  {zone.type}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
