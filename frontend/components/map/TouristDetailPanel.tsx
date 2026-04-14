"use client";

import type { TouristMarker } from "@/types";
import { MapPin, Clock, Activity, PhoneCall, FileText, Navigation } from "lucide-react";
import { cn, formatRelativeTime, getStatusDot } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { touristApi, alertApi } from "@/lib/api";
import type { Alert, Tourist } from "@/types";

interface Props {
  tourist: TouristMarker | null;
}

export function TouristDetailPanel({ tourist }: Props) {
  const [touristDetails, setTouristDetails] = useState<Tourist | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    if (!tourist) {
      setTouristDetails(null);
      setRecentAlerts([]);
      return;
    }
    Promise.all([
      touristApi.getById(tourist.tourist_id),
      alertApi.getAll({ tourist_id: tourist.tourist_id, limit: 5 }),
    ]).then(([t, a]) => {
      setTouristDetails(t.data);
      setRecentAlerts(a.data?.items ?? []);
    }).catch(() => {
      setTouristDetails(null);
    });
  }, [tourist]);

  return (
    <aside className="w-80 right-panel flex-shrink-0 overflow-y-auto scrollbar-thin">
      <div className="panel-header">
        <p className="text-xs font-semibold text-ts-navy">Tourist Details</p>
        {tourist && (
          <span
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium",
              tourist.status === "sos"
                ? "text-ts-alert-red"
                : tourist.status === "alert"
                ? "text-ts-saffron"
                : "text-ts-green"
            )}
          >
            <span className={cn("w-2 h-2 rounded-full", getStatusDot(tourist.status))} />
            {tourist.status.toUpperCase()}
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!tourist ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-ts-slate/30"
          >
            <MapPin className="w-10 h-10 mb-3" />
            <p className="text-sm">Select a tourist marker</p>
          </motion.div>
        ) : (
          <motion.div
            key={tourist.tourist_id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 space-y-4"
          >
            {/* Identity */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-ts-navy/10 flex items-center justify-center text-ts-navy font-bold text-sm">
                {tourist.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-ts-navy text-sm">{tourist.name}</p>
                <p className="text-xs text-ts-slate/60">
                  {touristDetails?.nationality ?? "—"}
                </p>
              </div>
            </div>

            {/* Location */}
            <div className="bg-ts-light rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-ts-slate/60 uppercase tracking-wider">
                Location
              </p>
              <div className="flex items-center gap-2 text-xs">
                <Navigation className="w-3.5 h-3.5 text-ts-teal flex-shrink-0" />
                <span className="font-mono text-ts-navy">
                  {tourist.latitude.toFixed(5)}, {tourist.longitude.toFixed(5)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-ts-slate/60">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                Last seen {formatRelativeTime(tourist.last_seen)}
              </div>
            </div>

            {/* Recent alerts */}
            {recentAlerts.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-ts-slate/60 uppercase tracking-wider mb-2">
                  Recent Alerts
                </p>
                <div className="space-y-1.5">
                  {recentAlerts.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-2 p-2 bg-ts-light rounded-lg"
                    >
                      <Activity className="w-3 h-3 text-ts-saffron flex-shrink-0" />
                      <p className="text-xs truncate flex-1">{a.title}</p>
                      <span className="text-[10px] text-ts-slate/50 flex-shrink-0">
                        {formatRelativeTime(a.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button className="flex items-center justify-center gap-1.5 py-2 bg-ts-navy text-white text-xs font-semibold rounded-lg hover:bg-ts-navy/90 transition-colors">
                <PhoneCall className="w-3.5 h-3.5" />
                Contact
              </button>
              <button className="flex items-center justify-center gap-1.5 py-2 bg-ts-teal text-white text-xs font-semibold rounded-lg hover:bg-ts-teal/90 transition-colors">
                <FileText className="w-3.5 h-3.5" />
                E-FIR
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
