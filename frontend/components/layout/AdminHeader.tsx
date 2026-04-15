"use client";

import { Bell, Search, Wifi, WifiOff, AlertTriangle, Clock } from "lucide-react";
import { useAlertStore } from "@/store/alertStore";
import { useSOSStore } from "@/store/sosStore";
import { useAuthStore } from "@/store/authStore";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface AdminHeaderProps {
  zoneName?: string;
}

export function AdminHeader({ zoneName = "All Zones" }: AdminHeaderProps) {
  const { unreadCount } = useAlertStore();
  const { activeEvents } = useSOSStore();
  const { initializeAuth } = useAuthStore();
  // null on server; populated only after mount to prevent hydration mismatch
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [wsConnected] = useState(true);

  useEffect(() => {
    initializeAuth();
    setCurrentTime(new Date());
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <header className="h-14 bg-white border-b border-ts-mid flex items-center px-4 gap-4 flex-shrink-0">
      {/* Zone selector */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-ts-slate/60 font-medium">Zone:</span>
        <span className="font-semibold text-ts-navy">{zoneName}</span>
      </div>

      <div className="h-5 w-px bg-ts-mid" />

      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ts-slate/40" />
        <input
          type="text"
          placeholder="Search tourists, alerts..."
          className="w-full pl-9 pr-4 py-1.5 text-sm bg-ts-light border border-ts-mid rounded-lg focus:outline-none focus:ring-2 focus:ring-ts-teal/30"
        />
      </div>

      <div className="flex-1" />

      {/* Active SOS indicator */}
      {activeEvents.filter((e) => e.status === "reported").length > 0 && (
        <div className="flex items-center gap-1.5 bg-ts-alert-red/10 text-ts-alert-red px-3 py-1.5 rounded-lg text-xs font-bold border border-ts-alert-red/20 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5" />
          {activeEvents.filter((e) => e.status === "reported").length} ACTIVE SOS
        </div>
      )}

      {/* WebSocket status */}
      <div
        className={cn(
          "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded",
          wsConnected ? "text-ts-green" : "text-ts-alert-red"
        )}
      >
        {wsConnected ? (
          <Wifi className="w-3.5 h-3.5" />
        ) : (
          <WifiOff className="w-3.5 h-3.5" />
        )}
        {wsConnected ? "Live" : "Offline"}
      </div>

      {/* Alerts */}
      <button className="relative p-2 rounded-lg hover:bg-ts-light transition-colors">
        <Bell className="w-4 h-4 text-ts-slate" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-ts-alert-red text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Clock — suppressed during SSR to avoid hydration mismatch */}
      <div className="flex items-center gap-1.5 text-xs text-ts-slate/60 font-mono">
        <Clock className="w-3.5 h-3.5" />
        {currentTime ? format(currentTime, "HH:mm:ss") : "--:--:--"}
      </div>
    </header>
  );
}
