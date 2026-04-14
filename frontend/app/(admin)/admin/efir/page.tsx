"use client";

import { useEffect, useState } from "react";
import { efirApi } from "@/lib/api";
import type { EFIR } from "@/types";
import { FileText, Download, Send, Archive, Eye, Filter, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatDateTime, incidentStatusColor } from "@/lib/utils";

type EFIRTab = "draft" | "submitted" | "archived";

export default function EFIRPage() {
  const [tab, setTab] = useState<EFIRTab>("draft");
  const [records, setRecords] = useState<EFIR[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EFIR | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    fetchRecords();
  }, [tab]);

  async function fetchRecords() {
    setLoading(true);
    try {
      const res = await efirApi.getAll({ status: tab });
      setRecords(res.data ?? []);
    } catch {
      toast.error("Failed to load E-FIR records");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(id: string) {
    setSubmitting(id);
    try {
      await efirApi.submit(id);
      toast.success("E-FIR submitted to police portal");
      fetchRecords();
      if (selected?.id === id) setSelected(null);
    } catch {
      toast.error("Failed to submit E-FIR");
    } finally {
      setSubmitting(null);
    }
  }

  async function handleArchive(id: string) {
    try {
      await efirApi.archive(id);
      toast.success("E-FIR archived");
      fetchRecords();
      if (selected?.id === id) setSelected(null);
    } catch {
      toast.error("Failed to archive E-FIR");
    }
  }

  async function handleDownload(id: string, efirNumber: string) {
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
    }
  }

  const TABS: { key: EFIRTab; label: string; color: string }[] = [
    { key: "draft", label: "Drafts", color: "text-ts-slate" },
    { key: "submitted", label: "Submitted", color: "text-ts-teal" },
    { key: "archived", label: "Archived", color: "text-ts-slate/50" },
  ];

  return (
    <div className="flex flex-col h-full gap-0 p-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ts-navy">E-FIR System</h1>
        <p className="text-xs text-ts-slate/60 mt-0.5">
          Electronic First Information Reports — draft, review, and submit to police portal
        </p>
      </div>

      <div className="flex gap-6 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "pb-2 text-sm font-medium border-b-2 transition-colors",
              tab === t.key
                ? "border-ts-navy text-ts-navy"
                : "border-transparent text-ts-slate/50 hover:text-ts-slate"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* List */}
        <div className="w-[420px] flex flex-col gap-2 overflow-y-auto scrollbar-thin pr-1">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 bg-ts-mid/60 rounded-xl animate-pulse" />
            ))
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-ts-slate/50">
              <FileText className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">No {tab} E-FIRs</p>
            </div>
          ) : (
            records.map((efir) => (
              <div
                key={efir.id}
                onClick={() => setSelected(efir)}
                className={cn(
                  "bg-white border rounded-xl p-4 cursor-pointer transition-all hover:shadow-sm",
                  selected?.id === efir.id
                    ? "border-ts-navy ring-1 ring-ts-navy/20"
                    : "border-ts-mid"
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono text-ts-slate/60">{efir.efir_number}</span>
                    <p className="font-semibold text-ts-navy text-sm mt-0.5 leading-tight">
                      {efir.tourist_name}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      incidentStatusColor(efir.status)
                    )}
                  >
                    {efir.status}
                  </span>
                </div>
                <p className="text-xs text-ts-slate/60 mt-2 line-clamp-2">{efir.description}</p>
                <p className="text-xs text-ts-slate/40 mt-1">{formatDateTime(efir.created_at)}</p>
              </div>
            ))
          )}
        </div>

        {/* Detail panel */}
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="flex-1 bg-white border border-ts-mid rounded-xl p-6 overflow-y-auto scrollbar-thin"
            >
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-xs font-mono text-ts-slate/60">{selected.efir_number}</p>
                  <h2 className="text-lg font-bold text-ts-navy mt-0.5">
                    {selected.tourist_name}
                  </h2>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(selected.id, selected.efir_number ?? selected.fir_number ?? selected.id)}
                    className="flex items-center gap-1.5 text-xs border border-ts-mid px-3 py-1.5 rounded-lg text-ts-slate hover:bg-ts-light transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF
                  </button>
                  {selected.status === "draft" && (
                    <>
                      <button
                        onClick={() => handleSubmit(selected.id)}
                        disabled={submitting === selected.id}
                        className="flex items-center gap-1.5 text-xs bg-ts-teal text-white px-3 py-1.5 rounded-lg hover:bg-ts-teal/90 transition-colors disabled:opacity-60"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {submitting === selected.id ? "Submitting…" : "Submit to Portal"}
                      </button>
                      <button
                        onClick={() => handleArchive(selected.id)}
                        className="flex items-center gap-1.5 text-xs border border-ts-mid px-3 py-1.5 rounded-lg text-ts-slate/60 hover:bg-ts-mid/40 transition-colors"
                      >
                        <Archive className="w-3.5 h-3.5" /> Archive
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-5">
                <Field label="Tourist Nationality" value={selected.nationality} />
                <Field label="Passport / ID" value={selected.passport_number} />
                <Field label="Incident Type" value={selected.incident_type} />
                <Field label="Location" value={selected.location_description} />
                <Field label="Created At" value={formatDateTime(selected.created_at)} />
                <Field label="Submitted At" value={selected.submitted_at ? formatDateTime(selected.submitted_at) : "—"} />
              </div>

              <div className="mb-5">
                <p className="text-xs font-medium text-ts-slate mb-1">Incident Description</p>
                <p className="text-sm text-ts-navy/80 bg-ts-light rounded-lg p-3 leading-relaxed whitespace-pre-line">
                  {selected.description}
                </p>
              </div>

              {selected.attachments && selected.attachments.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-ts-slate mb-2">Attachments</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.attachments.map((att, i) => (
                      <a
                        key={i}
                        href={att}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs border border-ts-mid px-3 py-1.5 rounded-lg text-ts-teal hover:bg-ts-light transition-colors flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" /> {att.split("/").pop() ?? `Attachment ${i + 1}`}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selected.status === "submitted" && (
                <div className="mt-4 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Submitted to CCTNS portal. Police authority notified.
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 bg-ts-light border border-ts-mid rounded-xl flex flex-col items-center justify-center text-ts-slate/40"
            >
              <FileText className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Select an E-FIR to view details</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-ts-slate/60 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-ts-navy">{value ?? "—"}</p>
    </div>
  );
}
