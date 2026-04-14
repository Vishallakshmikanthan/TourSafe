"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { zoneApi } from "@/lib/api";
import type { GeoZone } from "@/types";
import { Plus, Pencil, Trash2, ShieldCheck, MapPin, Radio, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn, zoneTypeColor } from "@/lib/utils";

const ZoneDrawMap = dynamic(() => import("@/components/map/ZoneDrawMapClient"), { ssr: false });

const ZONE_TYPES = ["safe", "restricted", "emergency", "monitoring"] as const;

export default function ZonesPage() {
  const [zones, setZones] = useState<GeoZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<GeoZone | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState({ name: "", type: "safe", description: "", radius: 1000 });
  const [drawnPolygon, setDrawnPolygon] = useState<number[][][] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchZones();
  }, []);

  async function fetchZones() {
    try {
      const res = await zoneApi.getAll();
      setZones(res.data ?? []);
    } catch {
      toast.error("Failed to load zones");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setFormMode("create");
    setForm({ name: "", type: "safe", description: "", radius: 1000 });
    setDrawnPolygon(null);
    setSelectedZone(null);
    setShowForm(true);
  }

  function openEdit(zone: GeoZone) {
    setFormMode("edit");
    setSelectedZone(zone);
    setForm({
      name: zone.name,
      type: zone.type,
      description: zone.description ?? "",
      radius: zone.radius ?? 1000,
    });
    setDrawnPolygon(null);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Zone name is required");
      return;
    }
    setSaving(true);
    try {
      if (formMode === "create") {
        await zoneApi.create({
          ...form,
          polygon: drawnPolygon
            ? { type: "Polygon", coordinates: drawnPolygon }
            : undefined,
        });
        toast.success("Zone created");
      } else if (selectedZone) {
        await zoneApi.update(selectedZone.id, { ...form });
        toast.success("Zone updated");
      }
      setShowForm(false);
      fetchZones();
    } catch {
      toast.error("Failed to save zone");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this geo-zone? This cannot be undone.")) return;
    try {
      await zoneApi.delete(id);
      toast.success("Zone deleted");
      fetchZones();
    } catch {
      toast.error("Failed to delete zone");
    }
  }

  const typeIcon = (type: string) => {
    switch (type) {
      case "safe": return <ShieldCheck className="w-4 h-4" />;
      case "restricted": return <AlertTriangle className="w-4 h-4" />;
      case "emergency": return <Radio className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ts-navy">Zone Management</h1>
          <p className="text-xs text-ts-slate/60 mt-0.5">
            Draw and manage geofences for tourist safety monitoring
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-ts-navy text-white text-sm px-4 py-2 rounded-lg hover:bg-ts-navy/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Zone
        </button>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Zone list */}
        <div className="w-[320px] flex flex-col gap-2 overflow-y-auto scrollbar-thin">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-ts-mid/60 rounded-xl animate-pulse" />
            ))
          ) : zones.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-ts-slate/50">
              <MapPin className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">No zones defined yet</p>
              <button
                onClick={openCreate}
                className="mt-3 text-xs text-ts-teal underline underline-offset-2"
              >
                Create your first zone
              </button>
            </div>
          ) : (
            zones.map((zone) => (
              <div
                key={zone.id}
                onClick={() => setSelectedZone(zone)}
                className={cn(
                  "bg-white border rounded-xl p-4 cursor-pointer transition-all hover:shadow-sm",
                  selectedZone?.id === zone.id
                    ? "border-ts-navy ring-1 ring-ts-navy/20"
                    : "border-ts-mid"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium",
                        zoneTypeColor(zone.type)
                      )}
                    >
                      {typeIcon(zone.type)}
                      {zone.type}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(zone); }}
                      className="p-1.5 hover:bg-ts-mid/50 rounded text-ts-slate transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(zone.id); }}
                      className="p-1.5 hover:bg-red-50 rounded text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="font-semibold text-ts-navy text-sm mt-1.5">{zone.name}</p>
                <div className="flex gap-3 mt-1.5 text-xs text-ts-slate/60">
                  <span>{zone.tourist_count ?? 0} tourists</span>
                  <span>{zone.alert_count ?? 0} alerts</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Map */}
        <div className="flex-1 bg-ts-mid/20 rounded-xl overflow-hidden border border-ts-mid">
          <ZoneDrawMap
            zones={zones}
            selectedZone={selectedZone ?? undefined}
            drawMode={showForm && formMode === "create"}
            onPolygonDrawn={setDrawnPolygon}
          />
        </div>
      </div>

      {/* Form panel */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 bg-white border-t border-ts-mid shadow-2xl z-50 p-6"
          >
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-ts-navy">
                  {formMode === "create" ? "Create New Zone" : "Edit Zone"}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-xs text-ts-slate/50 hover:text-ts-slate"
                >
                  Cancel
                </button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label className="text-xs text-ts-slate font-medium">Zone Name *</label>
                  <input
                    className="mt-1 w-full border border-ts-mid rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ts-navy/30"
                    placeholder="e.g. Taj Mahal Safe Zone"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-ts-slate font-medium">Zone Type *</label>
                  <select
                    className="mt-1 w-full border border-ts-mid rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ts-navy/30"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    {ZONE_TYPES.map((t) => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-ts-slate font-medium">Radius (m)</label>
                  <input
                    type="number"
                    min={100}
                    max={50000}
                    className="mt-1 w-full border border-ts-mid rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ts-navy/30"
                    value={form.radius}
                    onChange={(e) => setForm({ ...form, radius: +e.target.value })}
                  />
                </div>
                <div className="col-span-4">
                  <label className="text-xs text-ts-slate font-medium">Description</label>
                  <textarea
                    rows={2}
                    className="mt-1 w-full border border-ts-mid rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ts-navy/30 resize-none"
                    placeholder="Optional description..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>
              {formMode === "create" && (
                <p className="text-xs text-ts-teal mt-3">
                  Draw a polygon on the map to define zone boundaries, or a radius will be used.
                </p>
              )}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm border border-ts-mid rounded-lg text-ts-slate hover:bg-ts-mid/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 text-sm bg-ts-navy text-white rounded-lg hover:bg-ts-navy/90 transition-colors disabled:opacity-60"
                >
                  {saving ? "Saving…" : formMode === "create" ? "Create Zone" : "Update Zone"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
