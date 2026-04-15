"use client";

import { useEffect, useState } from "react";
import { authorityApi } from "@/lib/api";
import type { AuthorityProfile } from "@/types";
import {
  ShieldCheck,
  Building2,
  MapPin,
  Phone,
  Mail,
  BadgeCheck,
  Plus,
  X,
  Save,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const AUTHORITY_TYPE_LABELS: Record<string, string> = {
  police: "Police / Law Enforcement",
  agency: "Travel Agency",
  hospital: "Hospital / Medical",
  other: "Other",
};

const TOUR_TYPE_OPTIONS = [
  "Adventure",
  "Heritage",
  "Beach",
  "Wildlife",
  "Religious",
  "Hill Station",
  "Cultural",
  "Trek",
  "Budget",
  "Luxury",
];

export default function AuthorityProfilePage() {
  const [profile, setProfile] = useState<AuthorityProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editData, setEditData] = useState({
    org_name: "",
    badge_number: "",
    contact_phone: "",
    contact_email: "",
    agency_tour_types: [] as string[],
    jurisdiction_spots: [] as string[],
  });
  const [newSpot, setNewSpot] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await authorityApi.getMe();
      setProfile(res.data);
      setEditData({
        org_name: res.data.org_name,
        badge_number: res.data.badge_number ?? "",
        contact_phone: res.data.contact_phone ?? "",
        contact_email: res.data.contact_email ?? "",
        agency_tour_types: res.data.agency_tour_types ?? [],
        jurisdiction_spots: res.data.jurisdiction_spots ?? [],
      });
    } catch {
      toast.error("Could not load authority profile");
    } finally {
      setLoading(false);
    }
  }

  async function saveChanges() {
    setSaving(true);
    try {
      const res = await authorityApi.updateMe({
        org_name: editData.org_name || undefined,
        badge_number: editData.badge_number || undefined,
        contact_phone: editData.contact_phone || undefined,
        contact_email: editData.contact_email || undefined,
        agency_tour_types: editData.agency_tour_types,
        jurisdiction_spots: editData.jurisdiction_spots,
      });
      setProfile(res.data);
      setEditing(false);
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  function addSpot() {
    const spot = newSpot.trim();
    if (!spot) return;
    if (editData.jurisdiction_spots.includes(spot)) {
      toast.error("Spot already added");
      return;
    }
    setEditData((p) => ({ ...p, jurisdiction_spots: [...p.jurisdiction_spots, spot] }));
    setNewSpot("");
  }

  function removeSpot(spot: string) {
    setEditData((p) => ({
      ...p,
      jurisdiction_spots: p.jurisdiction_spots.filter((s) => s !== spot),
    }));
  }

  function toggleTourType(t: string) {
    setEditData((p) => ({
      ...p,
      agency_tour_types: p.agency_tour_types.includes(t)
        ? p.agency_tour_types.filter((x) => x !== t)
        : [...p.agency_tour_types, t],
    }));
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 text-center text-ts-slate/50 py-20">
        <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No authority profile found for your account.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-ts-navy">Authority Profile</h1>
          <p className="text-xs text-ts-slate/50 mt-0.5">
            Your organisation details and jurisdiction spots
          </p>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 border border-ts-mid text-ts-navy px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-ts-light transition-colors"
          >
            <PenLine className="w-4 h-4" /> Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={saveChanges}
              disabled={saving}
              className="flex items-center gap-2 bg-ts-teal text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-ts-teal/90 disabled:opacity-60"
            >
              <Save className="w-4 h-4" /> Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2.5 border border-ts-mid rounded-xl text-sm text-ts-slate hover:bg-ts-light"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Identity card */}
      <div className="bg-white rounded-2xl border border-ts-mid p-5 mb-4 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-ts-navy rounded-2xl flex items-center justify-center">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            {editing ? (
              <input
                className="input font-semibold text-ts-navy mb-1"
                value={editData.org_name}
                onChange={(e) => setEditData((p) => ({ ...p, org_name: e.target.value }))}
                placeholder="Organisation name"
              />
            ) : (
              <p className="font-bold text-ts-navy text-lg">{profile.org_name}</p>
            )}
            <div className="flex items-center gap-2">
              <span className="bg-ts-navy/10 text-ts-navy text-[11px] font-medium px-2 py-0.5 rounded-full">
                {AUTHORITY_TYPE_LABELS[profile.authority_type] ?? profile.authority_type}
              </span>
              {profile.verified && (
                <span className="flex items-center gap-1 bg-green-100 text-green-700 text-[11px] font-medium px-2 py-0.5 rounded-full border border-green-200">
                  <BadgeCheck className="w-3 h-3" /> Verified
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label text-[11px]">Badge / Licence No.</label>
            {editing ? (
              <input
                className="input"
                value={editData.badge_number}
                onChange={(e) =>
                  setEditData((p) => ({ ...p, badge_number: e.target.value }))
                }
                placeholder="e.g. TN-CID-9034"
              />
            ) : (
              <p className="text-sm text-ts-navy font-medium">
                {profile.badge_number ?? "—"}
              </p>
            )}
          </div>
          <div>
            <label className="label text-[11px]">Contact Phone</label>
            {editing ? (
              <input
                className="input"
                value={editData.contact_phone}
                onChange={(e) =>
                  setEditData((p) => ({ ...p, contact_phone: e.target.value }))
                }
                placeholder="+91 9876543210"
              />
            ) : (
              <p className="text-sm text-ts-navy font-medium flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-ts-slate/40" />
                {profile.contact_phone ?? "—"}
              </p>
            )}
          </div>
          <div className="col-span-2">
            <label className="label text-[11px]">Contact Email</label>
            {editing ? (
              <input
                className="input"
                type="email"
                value={editData.contact_email}
                onChange={(e) =>
                  setEditData((p) => ({ ...p, contact_email: e.target.value }))
                }
                placeholder="contact@organisation.gov"
              />
            ) : (
              <p className="text-sm text-ts-navy font-medium flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-ts-slate/40" />
                {profile.contact_email ?? "—"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tour types (agencies) */}
      {profile.authority_type === "agency" && (
        <div className="bg-white rounded-2xl border border-ts-mid p-5 mb-4 shadow-sm">
          <h3 className="font-semibold text-ts-navy text-sm mb-3">Tour Types Offered</h3>
          <div className="flex flex-wrap gap-2">
            {TOUR_TYPE_OPTIONS.map((t) => {
              const active = (editing ? editData.agency_tour_types : (profile.agency_tour_types ?? [])).includes(t);
              return (
                <button
                  key={t}
                  disabled={!editing}
                  onClick={() => editing && toggleTourType(t)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs border font-medium transition-colors",
                    active
                      ? "bg-ts-teal/10 text-ts-teal border-ts-teal/30"
                      : "bg-ts-light text-ts-slate/60 border-ts-mid",
                    editing && "cursor-pointer hover:border-ts-teal/50"
                  )}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Jurisdiction spots */}
      <div className="bg-white rounded-2xl border border-ts-mid p-5 shadow-sm">
        <h3 className="font-semibold text-ts-navy text-sm mb-1">Jurisdiction Spots</h3>
        <p className="text-xs text-ts-slate/50 mb-3">
          Tourist spots under your authority's jurisdiction. The map filters tourists in these areas.
        </p>

        {editing && (
          <div className="flex gap-2 mb-3">
            <input
              className="input flex-1"
              value={newSpot}
              onChange={(e) => setNewSpot(e.target.value)}
              placeholder="e.g. Botanical Garden, Ooty Lake"
              onKeyDown={(e) => e.key === "Enter" && addSpot()}
            />
            <button
              onClick={addSpot}
              className="flex items-center gap-1 bg-ts-navy text-white px-3 py-2 rounded-lg text-sm hover:bg-ts-navy/90"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {(editing ? editData.jurisdiction_spots : (profile.jurisdiction_spots ?? [])).map(
            (spot) => (
              <span
                key={spot}
                className="flex items-center gap-1.5 bg-ts-light border border-ts-mid text-ts-navy text-xs px-3 py-1.5 rounded-full"
              >
                <MapPin className="w-3 h-3 text-ts-teal" />
                {spot}
                {editing && (
                  <button
                    onClick={() => removeSpot(spot)}
                    className="ml-0.5 text-ts-slate/40 hover:text-ts-alert-red transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            )
          )}
          {(editing ? editData.jurisdiction_spots : (profile.jurisdiction_spots ?? [])).length ===
            0 && (
            <p className="text-xs text-ts-slate/40">No spots configured yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
