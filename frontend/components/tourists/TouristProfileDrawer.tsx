"use client";

import type { Tourist } from "@/types";
import { X, User, Mail, Phone, Globe, CreditCard, ShieldCheck, MapPin, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  tourist: Tourist;
  onClose: () => void;
}

export function TouristProfileDrawer({ tourist, onClose }: Props) {
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
          <div className="w-14 h-14 rounded-full bg-ts-navy/10 flex items-center justify-center text-xl font-bold text-ts-navy">
            {tourist.full_name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-ts-navy">{tourist.full_name}</p>
            <p className="text-xs text-ts-slate/60">{tourist.email}</p>
            <span
              className={cn(
                "status-pill mt-1",
                tourist.did_status === "active"
                  ? "bg-green-100 text-ts-green"
                  : tourist.did_status === "pending"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-ts-alert-red"
              )}
            >
              DID {tourist.did_status}
            </span>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-1 gap-3">
          <InfoRow icon={Globe} label="Nationality" value={tourist.nationality} />
          <InfoRow icon={CreditCard} label="Passport" value={tourist.passport_number} mono />
          <InfoRow icon={Phone} label="Phone" value={tourist.phone} />
          <InfoRow icon={Mail} label="Email" value={tourist.email} />
          <InfoRow
            icon={ShieldCheck}
            label="DID Address"
            value={tourist.did_address ? `${tourist.did_address.slice(0, 10)}...${tourist.did_address.slice(-6)}` : "Not assigned"}
            mono
          />
        </div>

        {/* Quick actions */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-ts-slate/60 uppercase tracking-wider">
            Quick Actions
          </p>
          <button className="w-full flex items-center gap-2 px-4 py-2.5 bg-ts-navy text-white text-sm font-medium rounded-lg hover:bg-ts-navy/90 transition-colors">
            <MapPin className="w-4 h-4" />
            Track on Map
          </button>
          <button className="w-full flex items-center gap-2 px-4 py-2.5 border border-ts-mid text-ts-navy text-sm font-medium rounded-lg hover:bg-ts-light transition-colors">
            <FileText className="w-4 h-4" />
            Generate E-FIR
          </button>
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
