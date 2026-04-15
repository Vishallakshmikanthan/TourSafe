"use client";

import type { TouristMarker } from "@/types";
import {
  MapPin, Clock, Activity, PhoneCall, FileText, Navigation,
  Battery, AlertTriangle, Heart, User, Shield, ChevronRight,
  Mail, Phone, X,
} from "lucide-react";
import { cn, formatRelativeTime, getStatusDot } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { touristApi, alertApi, efirApi } from "@/lib/api";
import type { Alert, Tourist } from "@/types";
import { toast } from "sonner";

interface Props {
  tourist: TouristMarker | null;
}

export function TouristDetailPanel({ tourist }: Props) {
  const router = useRouter();
  const [touristDetails, setTouristDetails] = useState<Tourist | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [contactOpen, setContactOpen] = useState(false);
  const [creatingEFIR, setCreatingEFIR] = useState(false);

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

  async function handleCreateEFIR() {
    if (!tourist) return;
    setCreatingEFIR(true);
    try {
      await efirApi.create({
        tourist_id: tourist.tourist_id,
        tourist_name: tourist.name,
        incident_type: "general",
        incident_date: new Date().toISOString().split("T")[0],
        incident_location: `${tourist.latitude.toFixed(5)}, ${tourist.longitude.toFixed(5)}`,
        description: `E-FIR initiated from map for tourist ${tourist.name}`,
        evidence_urls: [],
      });
      toast.success("E-FIR draft created");
      router.push("/admin/efir");
    } catch {
      toast.error("Failed to create E-FIR");
    } finally {
      setCreatingEFIR(false);
    }
  }

  const batteryColor = (pct?: number) => {
    if (!pct) return "text-ts-slate/40";
    if (pct < 20) return "text-ts-alert-red";
    if (pct < 40) return "text-ts-saffron";
    return "text-ts-green";
  };

  const anomalyColor = (score?: number) => {
    if (!score) return "text-ts-green";
    if (score > 0.7) return "text-ts-alert-red";
    if (score > 0.4) return "text-ts-saffron";
    return "text-ts-green";
  };

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
            <p className="text-xs mt-1 text-center px-6 text-ts-slate/20">Click any dot on the map to view full details</p>
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
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0",
                tourist.status === "sos" ? "bg-ts-alert-red" :
                tourist.status === "alert" ? "bg-ts-saffron" : "bg-ts-navy"
              )}>
                {tourist.name.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-ts-navy text-sm">{tourist.name}</p>
                <p className="text-xs text-ts-slate/60">
                  {touristDetails?.nationality ?? "—"}{touristDetails?.age ? `, ${touristDetails.age}y` : ""}
                </p>
                {touristDetails?.blood_type && (
                  <span className="inline-block text-[10px] bg-red-100 text-ts-alert-red px-1.5 py-0.5 rounded font-bold mt-0.5">
                    {touristDetails.blood_type}
                  </span>
                )}
              </div>
            </div>

            {/* Vitals */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-ts-light rounded-lg p-2 flex items-center gap-2">
                <Battery className={cn("w-4 h-4 flex-shrink-0", batteryColor(touristDetails?.battery_pct))} />
                <div>
                  <p className="text-[10px] text-ts-slate/50">Battery</p>
                  <p className={cn("text-xs font-bold", batteryColor(touristDetails?.battery_pct))}>
                    {touristDetails?.battery_pct != null ? `${touristDetails.battery_pct}%` : "—"}
                  </p>
                </div>
              </div>
              <div className="bg-ts-light rounded-lg p-2 flex items-center gap-2">
                <Activity className={cn("w-4 h-4 flex-shrink-0", anomalyColor(touristDetails?.anomaly_score))} />
                <div>
                  <p className="text-[10px] text-ts-slate/50">Anomaly</p>
                  <p className={cn("text-xs font-bold", anomalyColor(touristDetails?.anomaly_score))}>
                    {touristDetails?.anomaly_score != null ? touristDetails.anomaly_score.toFixed(2) : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-ts-light rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-ts-slate/60 uppercase tracking-wider">Location</p>
              <div className="flex items-center gap-2 text-xs">
                <Navigation className="w-3.5 h-3.5 text-ts-teal flex-shrink-0" />
                <span className="font-mono text-ts-navy">
                  {tourist.latitude.toFixed(5)}, {tourist.longitude.toFixed(5)}
                </span>
              </div>
              {touristDetails?.current_zone && (
                <div className="flex items-center gap-2 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-ts-saffron flex-shrink-0" />
                  <span className="text-ts-navy font-medium truncate">{touristDetails.current_zone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-ts-slate/60">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                {touristDetails?.last_seen ?? `Last seen ${formatRelativeTime(tourist.last_seen)}`}
              </div>
            </div>

            {/* Medical alert */}
            {((touristDetails?.medical_conditions?.length ?? 0) > 0 || (touristDetails?.allergies?.length ?? 0) > 0) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Heart className="w-3.5 h-3.5 text-ts-alert-red" />
                  <p className="text-xs font-bold text-ts-alert-red uppercase tracking-wider">Medical Alert</p>
                </div>
                {touristDetails?.medical_conditions && touristDetails.medical_conditions.length > 0 && (
                  <p className="text-xs text-ts-navy">
                    <span className="font-semibold">Conditions: </span>
                    {touristDetails.medical_conditions.join(", ")}
                  </p>
                )}
                {touristDetails?.allergies && touristDetails.allergies.length > 0 && (
                  <p className="text-xs text-ts-navy">
                    <span className="font-semibold">Allergies: </span>
                    {touristDetails.allergies.join(", ")}
                  </p>
                )}
              </div>
            )}

            {/* Emergency contact */}
            {touristDetails?.emergency_contact_name && (
              <div className="bg-ts-light rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold text-ts-slate/60 uppercase tracking-wider">Emergency Contact</p>
                <p className="text-xs font-semibold text-ts-navy">{touristDetails.emergency_contact_name}</p>
                <p className="text-[11px] text-ts-slate/60">{touristDetails.emergency_contact_relation}</p>
                <a
                  href={`tel:${touristDetails.emergency_contact_phone}`}
                  className="text-xs text-ts-teal font-mono hover:underline"
                >
                  {touristDetails.emergency_contact_phone}
                </a>
              </div>
            )}

            {/* Recent alerts */}
            {recentAlerts.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-ts-slate/60 uppercase tracking-wider mb-2">
                  Recent Alerts
                </p>
                <div className="space-y-1.5">
                  {recentAlerts.slice(0, 3).map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-2 p-2 bg-ts-light rounded-lg"
                    >
                      <AlertTriangle className={cn(
                        "w-3 h-3 flex-shrink-0",
                        a.severity === "critical" ? "text-ts-alert-red" :
                        a.severity === "high" ? "text-ts-saffron" : "text-yellow-500"
                      )} />
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
              <button
                onClick={() => setContactOpen(true)}
                disabled={!touristDetails}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-ts-navy text-white text-xs font-semibold rounded-lg hover:bg-ts-navy/90 transition-colors disabled:opacity-50"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                Contact
              </button>
              <button
                onClick={handleCreateEFIR}
                disabled={creatingEFIR || !tourist}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-ts-teal text-white text-xs font-semibold rounded-lg hover:bg-ts-teal/90 transition-colors disabled:opacity-60"
              >
                {creatingEFIR ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
                E-FIR
              </button>
            </div>

            {/* View full profile */}
            <button
              onClick={() => router.push("/admin/tourists")}
              className="w-full flex items-center justify-between px-3 py-2 border border-ts-mid text-xs text-ts-navy font-medium rounded-lg hover:bg-ts-light transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-ts-teal" />
                View Full Profile
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-ts-slate/40" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contact Info Modal */}
      <AnimatePresence>
        {contactOpen && touristDetails && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setContactOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl shadow-2xl w-80 p-5 mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-ts-navy">Contact Information</p>
                <button
                  onClick={() => setContactOpen(false)}
                  className="p-1 hover:bg-ts-light rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-ts-slate" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-ts-navy/10 flex items-center justify-center text-ts-navy font-bold text-sm flex-shrink-0">
                    {tourist?.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ts-navy">{tourist?.name}</p>
                    <p className="text-xs text-ts-slate/60">{touristDetails.nationality}</p>
                  </div>
                </div>

                {touristDetails.phone ? (
                  <a
                    href={`tel:${touristDetails.phone}`}
                    className="flex items-center gap-3 p-3 bg-ts-light rounded-xl hover:bg-ts-mid/40 transition-colors group"
                  >
                    <Phone className="w-4 h-4 text-ts-teal flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-ts-slate/50 uppercase tracking-wider">Phone</p>
                      <p className="text-sm font-semibold text-ts-navy group-hover:text-ts-teal transition-colors">
                        {touristDetails.phone}
                      </p>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-ts-light rounded-xl opacity-50">
                    <Phone className="w-4 h-4 text-ts-slate/40 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-ts-slate/50 uppercase tracking-wider">Phone</p>
                      <p className="text-sm text-ts-slate/40">Not available</p>
                    </div>
                  </div>
                )}

                {touristDetails.email ? (
                  <a
                    href={`mailto:${touristDetails.email}`}
                    className="flex items-center gap-3 p-3 bg-ts-light rounded-xl hover:bg-ts-mid/40 transition-colors group"
                  >
                    <Mail className="w-4 h-4 text-ts-teal flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-ts-slate/50 uppercase tracking-wider">Email</p>
                      <p className="text-sm font-semibold text-ts-navy group-hover:text-ts-teal transition-colors truncate">
                        {touristDetails.email}
                      </p>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-ts-light rounded-xl opacity-50">
                    <Mail className="w-4 h-4 text-ts-slate/40 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-ts-slate/50 uppercase tracking-wider">Email</p>
                      <p className="text-sm text-ts-slate/40">Not available</p>
                    </div>
                  </div>
                )}

                {(touristDetails as { emergency_contact_name?: string; emergency_contact_phone?: string }).emergency_contact_name && (
                  <div className="border border-ts-mid rounded-xl p-3 space-y-1.5">
                    <p className="text-[10px] text-ts-slate/50 uppercase tracking-wider font-semibold">
                      Emergency Contact
                    </p>
                    <p className="text-xs font-semibold text-ts-navy">
                      {(touristDetails as { emergency_contact_name?: string }).emergency_contact_name}
                    </p>
                    {(touristDetails as { emergency_contact_phone?: string }).emergency_contact_phone && (
                      <a
                        href={`tel:${(touristDetails as { emergency_contact_phone?: string }).emergency_contact_phone}`}
                        className="text-xs text-ts-teal font-mono hover:underline"
                      >
                        {(touristDetails as { emergency_contact_phone?: string }).emergency_contact_phone}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </aside>
  );
}
