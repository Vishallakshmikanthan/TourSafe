"use client";

import { useEffect, useState } from "react";
import { itineraryApi } from "@/lib/api";
import type { Itinerary, ItineraryStop, ItineraryStopCreate, StopType } from "@/types";
import {
  CalendarDays,
  MapPin,
  Hotel,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  PenLine,
  X,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const STOP_TYPE_ICONS: Record<StopType, React.ReactNode> = {
  hotel: <Hotel className="w-4 h-4" />,
  tourist_spot: <MapPin className="w-4 h-4" />,
  transport: <CalendarDays className="w-4 h-4" />,
  restaurant: <MapPin className="w-4 h-4" />,
  other: <MapPin className="w-4 h-4" />,
};

const STOP_TYPE_COLORS: Record<StopType, string> = {
  hotel: "bg-blue-100 text-blue-700 border-blue-200",
  tourist_spot: "bg-green-100 text-green-700 border-green-200",
  transport: "bg-purple-100 text-purple-700 border-purple-200",
  restaurant: "bg-orange-100 text-orange-700 border-orange-200",
  other: "bg-gray-100 text-gray-700 border-gray-200",
};

interface NewStopForm {
  spot_name: string;
  address: string;
  stop_type: StopType;
  planned_arrival: string;
  planned_departure: string;
  expected_duration_hours: string;
  latitude: string;
  longitude: string;
  notes: string;
}

const EMPTY_STOP: NewStopForm = {
  spot_name: "",
  address: "",
  stop_type: "tourist_spot",
  planned_arrival: "",
  planned_departure: "",
  expected_duration_hours: "3",
  latitude: "",
  longitude: "",
  notes: "",
};

export default function ItineraryPage() {
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [addingStopFor, setAddingStopFor] = useState<string | null>(null);
  const [newStop, setNewStop] = useState<NewStopForm>(EMPTY_STOP);
  const [newItinerary, setNewItinerary] = useState({
    title: "",
    start_date: "",
    end_date: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await itineraryApi.getAll();
      setItineraries(res.data);
      if (res.data.length > 0) setExpandedId(res.data[0].id);
    } catch {
      toast.error("Failed to load itineraries");
    } finally {
      setLoading(false);
    }
  }

  async function createItinerary() {
    if (!newItinerary.title || !newItinerary.start_date || !newItinerary.end_date) {
      toast.error("Title and dates are required");
      return;
    }
    setSaving(true);
    try {
      const res = await itineraryApi.create({ ...newItinerary, stops: [] });
      setItineraries((prev) => [res.data, ...prev]);
      setExpandedId(res.data.id);
      setShowNewForm(false);
      setNewItinerary({ title: "", start_date: "", end_date: "", notes: "" });
      toast.success("Itinerary created!");
    } catch {
      toast.error("Failed to create itinerary");
    } finally {
      setSaving(false);
    }
  }

  async function addStop(itineraryId: string) {
    if (!newStop.spot_name) {
      toast.error("Spot name is required");
      return;
    }
    setSaving(true);
    try {
      const payload: ItineraryStopCreate = {
        spot_name: newStop.spot_name,
        address: newStop.address || undefined,
        stop_type: newStop.stop_type,
        planned_arrival: newStop.planned_arrival || undefined,
        planned_departure: newStop.planned_departure || undefined,
        expected_duration_hours: parseFloat(newStop.expected_duration_hours) || 3,
        latitude: newStop.latitude ? parseFloat(newStop.latitude) : undefined,
        longitude: newStop.longitude ? parseFloat(newStop.longitude) : undefined,
        notes: newStop.notes || undefined,
      };
      const res = await itineraryApi.addStop(itineraryId, payload);
      setItineraries((prev) =>
        prev.map((it) =>
          it.id === itineraryId
            ? { ...it, stops: [...it.stops, res.data] }
            : it
        )
      );
      setAddingStopFor(null);
      setNewStop(EMPTY_STOP);
      toast.success("Stop added!");
    } catch {
      toast.error("Failed to add stop");
    } finally {
      setSaving(false);
    }
  }

  async function deleteStop(itineraryId: string, stopId: string) {
    try {
      await itineraryApi.deleteStop(itineraryId, stopId);
      setItineraries((prev) =>
        prev.map((it) =>
          it.id === itineraryId
            ? { ...it, stops: it.stops.filter((s) => s.id !== stopId) }
            : it
        )
      );
      toast.success("Stop removed");
    } catch {
      toast.error("Failed to remove stop");
    }
  }

  async function deleteItinerary(id: string) {
    try {
      await itineraryApi.delete(id);
      setItineraries((prev) => prev.filter((it) => it.id !== id));
      toast.success("Itinerary deleted");
    } catch {
      toast.error("Failed to delete itinerary");
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-ts-navy">My Itinerary</h1>
          <p className="text-xs text-ts-slate/60 mt-0.5">
            Your trip schedule — AI monitors this to keep you safe
          </p>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="flex items-center gap-2 bg-ts-navy text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-ts-navy/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Trip
        </button>
      </div>

      {/* New itinerary form */}
      <AnimatePresence>
        {showNewForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-2xl border border-ts-mid p-5 mb-5 shadow-sm">
              <h3 className="font-semibold text-ts-navy mb-4">Add New Trip</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="col-span-2">
                  <label className="label">Trip Title</label>
                  <input
                    className="input"
                    value={newItinerary.title}
                    onChange={(e) =>
                      setNewItinerary((p) => ({ ...p, title: e.target.value }))
                    }
                    placeholder="e.g. Ooty Summer Trip 2026"
                  />
                </div>
                <div>
                  <label className="label">From Date</label>
                  <input
                    type="date"
                    className="input"
                    value={newItinerary.start_date}
                    onChange={(e) =>
                      setNewItinerary((p) => ({ ...p, start_date: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="label">To Date</label>
                  <input
                    type="date"
                    className="input"
                    value={newItinerary.end_date}
                    onChange={(e) =>
                      setNewItinerary((p) => ({ ...p, end_date: e.target.value }))
                    }
                  />
                </div>
                <div className="col-span-2">
                  <label className="label">Notes (optional)</label>
                  <textarea
                    className="input resize-none"
                    rows={2}
                    value={newItinerary.notes}
                    onChange={(e) =>
                      setNewItinerary((p) => ({ ...p, notes: e.target.value }))
                    }
                    placeholder="Any special arrangements…"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={createItinerary}
                  disabled={saving}
                  className="flex items-center gap-2 bg-ts-teal text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-ts-teal/90 disabled:opacity-60"
                >
                  <Save className="w-4 h-4" /> Save Trip
                </button>
                <button
                  onClick={() => setShowNewForm(false)}
                  className="px-4 py-2 border border-ts-mid rounded-lg text-sm text-ts-slate hover:bg-ts-light"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {itineraries.length === 0 && (
        <div className="text-center py-16 text-ts-slate/40">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No trips yet. Create your first itinerary above.</p>
        </div>
      )}

      <div className="space-y-4">
        {itineraries.map((it) => (
          <div
            key={it.id}
            className="bg-white rounded-2xl border border-ts-mid shadow-sm overflow-hidden"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-ts-light/50 transition-colors"
              onClick={() => setExpandedId(expandedId === it.id ? null : it.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-ts-navy/10 rounded-xl flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-ts-navy" />
                </div>
                <div>
                  <p className="font-semibold text-ts-navy text-sm">{it.title}</p>
                  <p className="text-xs text-ts-slate/60">
                    {it.start_date} → {it.end_date} · {it.stops.length} stops
                  </p>
                </div>
                {it.is_active && (
                  <span className="ml-1 bg-green-100 text-green-700 border border-green-200 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                    Active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteItinerary(it.id);
                  }}
                  className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-ts-slate/40 hover:text-ts-alert-red"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {expandedId === it.id ? (
                  <ChevronUp className="w-4 h-4 text-ts-slate/60" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-ts-slate/60" />
                )}
              </div>
            </div>

            {/* Stops list */}
            <AnimatePresence>
              {expandedId === it.id && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-ts-mid px-4 pb-4 pt-3 space-y-2">
                    {it.stops.length === 0 && (
                      <p className="text-xs text-ts-slate/50 py-2">
                        No stops added. Add hotel stays and tourist spots below.
                      </p>
                    )}
                    {it.stops.map((stop) => (
                      <StopCard
                        key={stop.id}
                        stop={stop}
                        onDelete={() => deleteStop(it.id, stop.id)}
                      />
                    ))}

                    {/* Add stop form */}
                    {addingStopFor === it.id ? (
                      <div className="bg-ts-light/50 rounded-xl border border-ts-mid p-4 mt-3">
                        <h4 className="text-xs font-semibold text-ts-navy mb-3">Add Stop / Spot</h4>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div className="col-span-2">
                            <label className="label">Spot / Hotel Name *</label>
                            <input
                              className="input"
                              value={newStop.spot_name}
                              onChange={(e) =>
                                setNewStop((p) => ({ ...p, spot_name: e.target.value }))
                              }
                              placeholder="Guna Caves, Hotel Meadows…"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="label">Address</label>
                            <input
                              className="input"
                              value={newStop.address}
                              onChange={(e) =>
                                setNewStop((p) => ({ ...p, address: e.target.value }))
                              }
                              placeholder="Full address"
                            />
                          </div>
                          <div>
                            <label className="label">Type</label>
                            <select
                              className="input"
                              value={newStop.stop_type}
                              onChange={(e) =>
                                setNewStop((p) => ({
                                  ...p,
                                  stop_type: e.target.value as StopType,
                                }))
                              }
                            >
                              <option value="hotel">Hotel / Stay</option>
                              <option value="tourist_spot">Tourist Spot</option>
                              <option value="transport">Transport Hub</option>
                              <option value="restaurant">Restaurant</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="label">Expected Duration (hrs)</label>
                            <input
                              type="number"
                              className="input"
                              value={newStop.expected_duration_hours}
                              onChange={(e) =>
                                setNewStop((p) => ({
                                  ...p,
                                  expected_duration_hours: e.target.value,
                                }))
                              }
                              min="0.5"
                              step="0.5"
                            />
                          </div>
                          <div>
                            <label className="label">Planned Arrival</label>
                            <input
                              type="datetime-local"
                              className="input"
                              value={newStop.planned_arrival}
                              onChange={(e) =>
                                setNewStop((p) => ({
                                  ...p,
                                  planned_arrival: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <label className="label">Planned Departure</label>
                            <input
                              type="datetime-local"
                              className="input"
                              value={newStop.planned_departure}
                              onChange={(e) =>
                                setNewStop((p) => ({
                                  ...p,
                                  planned_departure: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <label className="label">Latitude (optional)</label>
                            <input
                              type="number"
                              className="input"
                              value={newStop.latitude}
                              onChange={(e) =>
                                setNewStop((p) => ({ ...p, latitude: e.target.value }))
                              }
                              placeholder="e.g. 11.4102"
                              step="any"
                            />
                          </div>
                          <div>
                            <label className="label">Longitude (optional)</label>
                            <input
                              type="number"
                              className="input"
                              value={newStop.longitude}
                              onChange={(e) =>
                                setNewStop((p) => ({ ...p, longitude: e.target.value }))
                              }
                              placeholder="e.g. 76.6950"
                              step="any"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="label">Notes</label>
                            <input
                              className="input"
                              value={newStop.notes}
                              onChange={(e) =>
                                setNewStop((p) => ({ ...p, notes: e.target.value }))
                              }
                              placeholder="Room number, contact person…"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => addStop(it.id)}
                            disabled={saving}
                            className="flex items-center gap-2 bg-ts-teal text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-ts-teal/90 disabled:opacity-60"
                          >
                            <Save className="w-3.5 h-3.5" /> Save Stop
                          </button>
                          <button
                            onClick={() => {
                              setAddingStopFor(null);
                              setNewStop(EMPTY_STOP);
                            }}
                            className="px-3 py-2 border border-ts-mid rounded-lg text-xs text-ts-slate hover:bg-ts-light"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setAddingStopFor(it.id);
                          setNewStop(EMPTY_STOP);
                        }}
                        className="mt-2 flex items-center gap-2 text-xs text-ts-teal hover:text-ts-teal/80 font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add stop / hotel
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

function StopCard({
  stop,
  onDelete,
}: {
  stop: ItineraryStop;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-ts-light/40 rounded-xl border border-ts-mid/50">
      <div
        className={cn(
          "mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center border flex-shrink-0",
          STOP_TYPE_COLORS[stop.stop_type]
        )}
      >
        {STOP_TYPE_ICONS[stop.stop_type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ts-navy truncate">{stop.spot_name}</p>
        {stop.address && (
          <p className="text-[11px] text-ts-slate/60 truncate">{stop.address}</p>
        )}
        <div className="flex items-center gap-3 mt-1">
          {stop.planned_arrival && (
            <span className="flex items-center gap-1 text-[11px] text-ts-slate/60">
              <CalendarDays className="w-3 h-3" />
              {stop.planned_arrival.slice(0, 16).replace("T", " ")}
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px] text-ts-slate/60">
            <Clock className="w-3 h-3" />
            {stop.expected_duration_hours}h expected
          </span>
        </div>
      </div>
      <button
        onClick={onDelete}
        className="p-1.5 hover:bg-red-50 rounded-lg text-ts-slate/30 hover:text-ts-alert-red transition-colors flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
