"use client";

import { useEffect, useState } from "react";
import { efirApi } from "@/lib/api";
import type { EFIR } from "@/types";
import { FileText, Download, Search, Filter, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { cn, formatDateTime, incidentStatusColor } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/authStore";

export default function TouristIncidentsPage() {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<EFIR[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<EFIR | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    efirApi
      .getMine()
      .then((r) => setRecords(r.data ?? []))
      .catch(() => toast.error("Failed to load incidents"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = records.filter(
    (r) =>
      (r.efir_number ?? r.fir_number ?? "").toLowerCase().includes(search.toLowerCase()) ||
      r.incident_type.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDownload(id: string, efirNumber: string) {
    setDownloading(id);
    try {
      const res = await efirApi.download(id);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `EFIR_${efirNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download PDF");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-ts-navy">My Incidents</h1>
        <p className="text-xs text-ts-slate/60 mt-0.5">
          History of SOS events, alerts, and E-FIR reports for your stay
        </p>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ts-slate/40" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm border border-ts-mid rounded-lg focus:outline-none focus:ring-2 focus:ring-ts-navy/30"
            placeholder="Search by type or E-FIR number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-ts-slate/40">
          <ShieldAlert className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">No incidents found</p>
          <p className="text-xs mt-1">Your stay is incident-free</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((record) => (
            <div
              key={record.id}
              onClick={() => setSelected(selected?.id === record.id ? null : record)}
              className={cn(
                "bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-sm",
                selected?.id === record.id ? "border-ts-navy ring-1 ring-ts-navy/20" : "border-ts-mid"
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-ts-slate/50">{record.efir_number}</span>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        incidentStatusColor(record.status)
                      )}
                    >
                      {record.status}
                    </span>
                  </div>
                  <p className="font-semibold text-ts-navy text-sm">{record.incident_type}</p>
                  <p className="text-xs text-ts-slate/50 mt-0.5">{record.location_description}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-ts-slate/50">{formatDateTime(record.created_at)}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownload(record.id, record.efir_number ?? record.fir_number ?? record.id); }}
                    className="mt-2 flex items-center gap-1 text-xs text-ts-teal hover:underline disabled:opacity-50"
                    disabled={downloading === record.id}
                  >
                    <Download className="w-3.5 h-3.5" />
                    {downloading === record.id ? "Downloading…" : "Download PDF"}
                  </button>
                </div>
              </div>

              {selected?.id === record.id && (
                <div className="mt-3 pt-3 border-t border-ts-mid/50">
                  <p className="text-xs text-ts-slate/60 leading-relaxed">{record.description}</p>
                  {record.submitted_at && (
                    <p className="text-xs text-ts-slate/40 mt-2">
                      Submitted to authorities: {formatDateTime(record.submitted_at)}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
