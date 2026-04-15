"use client";

import { useEffect, useState, useCallback } from "react";
import { touristApi } from "@/lib/api";
import type { Tourist } from "@/types";
import { cn, formatRelativeTime, getStatusDot } from "@/lib/utils";
import {
  Search,
  Users,
  MapPin,
  ChevronRight,
  Globe,
  CreditCard,
  RefreshCw,
  UserPlus,
  Upload,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TouristProfileDrawer } from "@/components/tourists/TouristProfileDrawer";
import { AddTouristModal } from "@/components/tourists/AddTouristModal";

export default function AdminTouristsPage() {
  const [tourists, setTourists] = useState<Tourist[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Tourist | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addDropOpen, setAddDropOpen] = useState(false);
  const [addMode, setAddMode] = useState<"single" | "csv">("single");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await touristApi.getAll({ search: query, page, limit: 25 });
      setTourists(res.data?.items ?? []);
      setTotal(res.data?.total ?? 0);
    } catch {
      setTourists([]);
    } finally {
      setLoading(false);
    }
  }, [query, page]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="flex h-full">
      {/* List pane */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="px-6 py-5 border-b border-ts-mid bg-white flex-shrink-0 flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-ts-navy">Tourist Database</h1>
            <p className="text-sm text-ts-slate/60 mt-0.5">
              {total.toLocaleString()} registered tourists
            </p>
          </div>
          <div className="flex-1" />
          {/* Search */}
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ts-slate/40" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search by name, passport, email..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-ts-mid rounded-lg focus:outline-none focus:ring-2 focus:ring-ts-teal/30"
            />
          </div>

          {/* Add Tourist split button */}
          <div className="relative flex-shrink-0">
            <div className="flex rounded-lg overflow-hidden border border-ts-navy">
              <button
                onClick={() => { setAddMode("single"); setAddModalOpen(true); setAddDropOpen(false); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-ts-navy text-white text-sm font-semibold hover:bg-ts-navy/90 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Add Tourist
              </button>
              <button
                onClick={() => setAddDropOpen((v) => !v)}
                className="px-2 py-2 bg-ts-navy/90 text-white hover:bg-ts-navy/70 transition-colors border-l border-white/20"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
            <AnimatePresence>
              {addDropOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-ts-mid z-50 overflow-hidden"
                >
                  <button
                    onClick={() => { setAddMode("single"); setAddModalOpen(true); setAddDropOpen(false); }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-ts-navy hover:bg-ts-light transition-colors text-left"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-ts-teal" />
                    Single Tourist
                  </button>
                  <button
                    onClick={() => { setAddMode("csv"); setAddModalOpen(true); setAddDropOpen(false); }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-ts-navy hover:bg-ts-light transition-colors text-left border-t border-ts-mid/50"
                  >
                    <Upload className="w-3.5 h-3.5 text-ts-teal" />
                    Import CSV
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={load}
            className="p-2 rounded-lg hover:bg-ts-light transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4 text-ts-slate", loading && "animate-spin")} />
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto scrollbar-thin">
          <table className="data-table">
            <thead className="sticky top-0 z-10">
              <tr>
                <th>Tourist</th>
                <th>Nationality</th>
                <th>Passport</th>
                <th>DID Status</th>
                <th>Zone</th>
                <th>Last Seen</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j}>
                        <div className="h-4 bg-ts-mid/50 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : tourists.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-ts-slate/40">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    No tourists found
                  </td>
                </tr>
              ) : (
                tourists.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelected(t)}
                    className={cn(
                      "cursor-pointer",
                      selected?.id === t.id && "bg-ts-navy/5"
                    )}
                  >
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-ts-teal/10 flex items-center justify-center text-xs font-bold text-ts-teal flex-shrink-0">
                          {t.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-ts-navy">{t.full_name}</p>
                          <p className="text-[11px] text-ts-slate/50">{t.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-xs">
                        <Globe className="w-3 h-3 text-ts-slate/40" />
                        {t.nationality}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-xs font-mono">
                        <CreditCard className="w-3 h-3 text-ts-slate/40" />
                        {t.passport_number}
                      </div>
                    </td>
                    <td>
                      <span
                        className={cn(
                          "status-pill",
                          t.did_status === "active"
                            ? "bg-green-100 text-ts-green"
                            : t.did_status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-ts-alert-red"
                        )}
                      >
                        {t.did_status}
                      </span>
                    </td>
                    <td className="text-xs">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-ts-slate/40 flex-shrink-0" />
                        <span className="truncate max-w-[120px]">{(t as any).current_zone ?? "—"}</span>
                      </div>
                    </td>
                    <td className="text-xs text-ts-slate/60">
                      {(t as any).last_seen ?? (t.last_seen_at ? formatRelativeTime(t.last_seen_at) : "—")}
                    </td>
                    <td>
                      <ChevronRight className="w-4 h-4 text-ts-slate/30" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-ts-mid bg-white flex-shrink-0">
          <p className="text-xs text-ts-slate/60">
            Showing {Math.min((page - 1) * 25 + 1, total)}–{Math.min(page * 25, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 text-xs font-medium border border-ts-mid rounded-lg disabled:opacity-40 hover:bg-ts-light transition-colors"
            >
              Previous
            </button>
            <button
              disabled={page * 25 >= total}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 text-xs font-medium border border-ts-mid rounded-lg disabled:opacity-40 hover:bg-ts-light transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Detail pane */}
      <AnimatePresence>
        {selected && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 360, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l border-ts-mid overflow-hidden flex-shrink-0"
          >
            <TouristProfileDrawer
              tourist={selected}
              onClose={() => setSelected(null)}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Add Tourist Modal */}
      <AddTouristModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={load}
        initialMode={addMode}
      />
    </div>
  );
}
