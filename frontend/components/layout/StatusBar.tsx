"use client";

import { useSOSStore } from "@/store/sosStore";
import { useAlertStore } from "@/store/alertStore";
import { Wifi, Users, Siren, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatusBar() {
  const { activeEvents } = useSOSStore();
  const { alerts } = useAlertStore();
  const activeAlerts = alerts.filter((a) => a.status === "active").length;
  const activeSOS = activeEvents.filter((e) => e.status === "reported").length;

  return (
    <footer className="h-7 bg-ts-navy border-t border-white/10 flex items-center px-4 gap-5 text-xs flex-shrink-0">
      {/* WS status */}
      <div className="flex items-center gap-1.5 text-white/70">
        <Wifi className="w-3 h-3 text-ts-green" />
        <span>WebSocket Connected</span>
      </div>

      <div className="w-px h-3 bg-white/20" />

      <div className="flex items-center gap-1.5 text-white/70">
        <Users className="w-3 h-3" />
        <span>Active Tourists: <span className="text-white font-semibold">—</span></span>
      </div>

      <div className="w-px h-3 bg-white/20" />

      <div
        className={cn(
          "flex items-center gap-1.5",
          activeSOS > 0 ? "text-ts-alert-red font-semibold" : "text-white/70"
        )}
      >
        <Siren className={cn("w-3 h-3", activeSOS > 0 && "animate-pulse")} />
        <span>
          SOS Active:{" "}
          <span className={cn("font-semibold", activeSOS > 0 ? "text-ts-alert-red" : "text-white")}>
            {activeSOS}
          </span>
        </span>
      </div>

      <div className="w-px h-3 bg-white/20" />

      <div className="flex items-center gap-1.5 text-white/70">
        <Activity className="w-3 h-3" />
        <span>
          Alerts:{" "}
          <span className={cn("font-semibold", activeAlerts > 0 ? "text-ts-saffron" : "text-white")}>
            {activeAlerts}
          </span>
        </span>
      </div>

      <div className="flex-1" />

      <span className="text-white/40 font-mono text-[11px]">TourSafe v1.0.0</span>
    </footer>
  );
}
