"use client";

import { useAlertStore } from "@/store/alertStore";
import { useSOSStore } from "@/store/sosStore";
import { Bell, X, AlertTriangle, Siren } from "lucide-react";
import { cn, formatRelativeTime, severityBadgeColor } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function AlertsRightPanel() {
  const { alerts, selectedAlert, selectAlert } = useAlertStore();
  const { activeEvents } = useSOSStore();
  const [activeTab, setActiveTab] = useState<"alerts" | "sos">("alerts");

  const recentAlerts = alerts.slice(0, 20);
  const sosEvents = activeEvents.slice(0, 10);

  return (
    <div className="right-panel w-72 flex-shrink-0">
      {/* Header */}
      <div className="panel-header">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("alerts")}
            className={cn(
              "px-3 py-1 text-xs font-semibold rounded transition-colors",
              activeTab === "alerts"
                ? "bg-ts-navy text-white"
                : "text-ts-slate hover:bg-ts-light"
            )}
          >
            <Bell className="w-3 h-3 inline mr-1" />
            Alerts
          </button>
          <button
            onClick={() => setActiveTab("sos")}
            className={cn(
              "px-3 py-1 text-xs font-semibold rounded transition-colors relative",
              activeTab === "sos"
                ? "bg-ts-alert-red text-white"
                : "text-ts-slate hover:bg-ts-light"
            )}
          >
            <Siren className="w-3 h-3 inline mr-1" />
            SOS
            {sosEvents.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-ts-alert-red text-white text-[10px] w-3.5 h-3.5 rounded-full flex items-center justify-center">
                {sosEvents.length}
              </span>
            )}
          </button>
        </div>
        <button
          onClick={() => selectAlert(null)}
          className="text-ts-slate/50 hover:text-ts-slate"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <AnimatePresence mode="wait">
          {activeTab === "alerts" ? (
            <motion.div
              key="alerts"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="divide-y divide-ts-mid/50"
            >
              {recentAlerts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-ts-slate/40">
                  <Bell className="w-8 h-8 mb-2" />
                  <p className="text-sm">No recent alerts</p>
                </div>
              )}
              {recentAlerts.map((alert) => (
                <button
                  key={alert.id}
                  onClick={() => selectAlert(alert)}
                  className={cn(
                    "w-full text-left px-3 py-3 hover:bg-ts-light/80 transition-colors",
                    selectedAlert?.id === alert.id && "bg-ts-light"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        "status-pill mt-0.5 flex-shrink-0",
                        severityBadgeColor(alert.severity)
                      )}
                    >
                      {alert.severity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-ts-navy truncate">
                        {alert.title}
                      </p>
                      <p className="text-xs text-ts-slate/60 truncate mt-0.5">
                        {alert.description}
                      </p>
                      <p className="text-[11px] text-ts-slate/40 mt-1">
                        {formatRelativeTime(alert.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="sos"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="divide-y divide-ts-mid/50"
            >
              {sosEvents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-ts-slate/40">
                  <AlertTriangle className="w-8 h-8 mb-2" />
                  <p className="text-sm">No active SOS</p>
                </div>
              )}
              {sosEvents.map((event) => (
                <div
                  key={event.incident_id}
                  className="px-3 py-3 border-l-2 border-ts-alert-red"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="status-pill bg-ts-alert-red text-white animate-pulse">
                      SOS ACTIVE
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-ts-navy">
                    {event.tourist_name}
                  </p>
                  <p className="text-xs text-ts-slate/60">{event.zone_name}</p>
                  <p className="text-[11px] text-ts-slate/40 mt-1">
                    {formatRelativeTime(event.triggered_at)}
                  </p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
