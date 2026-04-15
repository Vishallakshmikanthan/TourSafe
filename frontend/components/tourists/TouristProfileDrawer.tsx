"use client";

import type { Tourist } from "@/types";
import { X, User, Mail, Phone, Globe, CreditCard, ShieldCheck, MapPin, FileText, Heart, Battery, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useMapStore } from "@/store/mapStore";

interface Props {
  tourist: Tourist;
  onClose: () => void;
}

export function TouristProfileDrawer({ tourist, onClose }: Props) {
  const router = useRouter();
  const { selectMarker } = useMapStore();

  const handleTrackOnMap = () => {
    if (tourist.current_location) {
      selectMarker({
        tourist_id: tourist.id,
        name: tourist.full_name,
        latitude: tourist.current_location.latitude,
        longitude: tourist.current_location.longitude,
        status: (tourist.status as "safe" | "alert" | "sos" | "inactive") ?? "safe",
        last_seen: tourist.last_seen_at ?? new Date().toISOString(),
      });
    }
    router.push("/admin/map");
    onClose();
  };

  const handleGenerateEFIR = () => {
    router.push("/admin/efir");
    onClose();
  };

  const t = tourist as Tourist & {
    battery_pct?: number;
    anomaly_score?: number;
    blood_type?: string;
    medical_conditions?: string[];
    allergies?: string[];
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_relation?: string;
    age?: number;
    last_seen?: string;
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-ts-mid">
        <p className="font-semibold text-ts-navy text-sm">Tourist Profile</p>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-ts-light transition-colors"
        >
          <X className="w-4 h-4 text-ts-slate/60" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-5">
        {/* Identity */}
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white",
            tourist.status === "sos" ? "bg-ts-alert-red" :
            tourist.status === "alert" || tourist.status === "warning" ? "bg-ts-saffron" : "bg-ts-navy"
          )}>
            {tourist.full_name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-ts-navy">{tourist.full_name}</p>
            <p className="text-xs text-ts-slate/60">{tourist.nationality}{t.age ? `, ${t.age}y` : ""}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={cn(
                "status-pill",
                tourist.did_status === "active"
                  ? "bg-green-100 text-ts-green"
                  : tourist.did_status === "pending"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-ts-alert-red"
              )}>
                DID {tourist.did_status}
              </span>
              {t.blood_type && (
                <span className="text-[10px] bg-red-100 text-ts-alert-red px-1.5 py-0.5 rounded font-bold">
                  {t.blood_type}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Vitals */}
        {(t.battery_pct != null || t.anomaly_score != null) && (
          <div className="grid grid-cols-2 gap-2">
            {t.battery_pct != null && (
              <div className="bg-ts-light rounded-lg p-2.5 flex items-center gap-2">
                <Battery className={cn("w-4 h-4", t.battery_pct < 20 ? "text-ts-alert-red" : t.battery_pct < 40 ? "text-ts-saffron" : "text-ts-green")} />
                <div>
                  <p className="text-[10px] text-ts-slate/50">Battery</p>
                  <p className={cn("text-xs font-bold", t.battery_pct < 20 ? "text-ts-alert-red" : t.battery_pct < 40 ? "text-ts-saffron" : "text-ts-green")}>
                    {t.battery_pct}%
                  </p>
                </div>
              </div>
            )}
            {t.anomaly_score != null && (
              <div className="bg-ts-light rounded-lg p-2.5 flex items-center gap-2">
                <Activity className={cn("w-4 h-4", t.anomaly_score > 0.7 ? "text-ts-alert-red" : t.anomaly_score > 0.4 ? "text-ts-saffron" : "text-ts-green")} />
                <div>
                  <p className="text-[10px] text-ts-slate/50">Anomaly Score</p>
                  <p className={cn("text-xs font-bold", t.anomaly_score > 0.7 ? "text-ts-alert-red" : t.anomaly_score > 0.4 ? "text-ts-saffron" : "text-ts-green")}>
                    {t.anomaly_score.toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Current zone */}
        {tourist.current_zone && (
          <div className="flex items-center gap-2 bg-ts-light rounded-lg px-3 py-2">
            <MapPin className="w-4 h-4 text-ts-saffron flex-shrink-0" />
            <div>
              <p className="text-[10px] text-ts-slate/50">Current Zone</p>
              <p className="text-xs font-semibold text-ts-navy">{tourist.current_zone}</p>
            </div>
            <div className="ml-auto text-[10px] text-ts-slate/50">{t.last_seen ?? tourist.last_seen_at ?? "—"}</div>
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-1 gap-3">
          <InfoRow icon={Globe} label="Nationality" value={tourist.nationality} />
          <InfoRow icon={CreditCard} label="Passport / ID" value={tourist.passport_number} mono />
          <InfoRow icon={Phone} label="Phone" value={tourist.phone} />
          {tourist.email && <InfoRow icon={Mail} label="Email" value={tourist.email} />}
          <InfoRow
            icon={ShieldCheck}
            label="DID Address"
            value={tourist.did_address ? `${tourist.did_address.slice(0, 10)}...${tourist.did_address.slice(-6)}` : "Not assigned"}
            mono
          />
        </div>

        {/* Medical alert */}
        {((t.medical_conditions?.length ?? 0) > 0 || (t.allergies?.length ?? 0) > 0) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-ts-alert-red" />
              <p className="text-xs font-bold text-ts-alert-red uppercase tracking-wider">Medical Info</p>
            </div>
            {t.medical_conditions && t.medical_conditions.length > 0 && (
              <p className="text-xs text-ts-navy">
                <span className="font-semibold">Conditions: </span>
                {t.medical_conditions.join(", ")}
              </p>
            )}
            {t.allergies && t.allergies.length > 0 && (
              <p className="text-xs text-ts-navy">
                <span className="font-semibold">Allergies: </span>
                {t.allergies.join(", ")}
              </p>
            )}
          </div>
        )}

        {/* Emergency contact */}
        {t.emergency_contact_name && (
          <div className="bg-ts-light rounded-lg p-3 space-y-1">
            <p className="text-xs font-semibold text-ts-slate/60 uppercase tracking-wider">Emergency Contact</p>
            <p className="text-xs font-bold text-ts-navy">{t.emergency_contact_name}</p>
            <p className="text-[11px] text-ts-slate/60">{t.emergency_contact_relation}</p>
            <a href={`tel:${t.emergency_contact_phone}`} className="text-xs text-ts-teal font-mono hover:underline">
              {t.emergency_contact_phone}
            </a>
          </div>
        )}

        {/* Quick actions */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-ts-slate/60 uppercase tracking-wider">Quick Actions</p>
          <button
            onClick={handleTrackOnMap}
            className="w-full flex items-center gap-2 px-4 py-2.5 bg-ts-navy text-white text-sm font-medium rounded-lg hover:bg-ts-navy/90 transition-colors"
          >
            <MapPin className="w-4 h-4" />
            Track on Map
          </button>
          <button
            onClick={handleGenerateEFIR}
            className="w-full flex items-center gap-2 px-4 py-2.5 border border-ts-mid text-ts-navy text-sm font-medium rounded-lg hover:bg-ts-light transition-colors"
          >
            <FileText className="w-4 h-4" />
            Generate E-FIR
          </button>
          {tourist.phone && (
            <a
              href={`tel:${tourist.phone}`}
              className="w-full flex items-center gap-2 px-4 py-2.5 border border-ts-mid text-ts-navy text-sm font-medium rounded-lg hover:bg-ts-light transition-colors"
            >
              <Phone className="w-4 h-4" />
              Call Tourist
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-ts-light flex items-center justify-center flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-ts-teal" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-ts-slate/50 font-medium">{label}</p>
        <p className={cn("text-xs text-ts-navy font-medium truncate", mono && "font-mono")}>{value}</p>
      </div>
    </div>
  );
}
