"use client";

import { useEffect, useState } from "react";
import { touristApi } from "@/lib/api";
import type { Tourist } from "@/types";
import { User, Heart, Phone, Shield, Save, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/authStore";

type Tab = "personal" | "medical" | "contacts" | "privacy";

export default function TouristProfilePage() {
  const { user } = useAuthStore();
  const [tourist, setTourist] = useState<Tourist | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("personal");
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Partial<Tourist>>({});

  useEffect(() => {
    touristApi
      .getMe()
      .then((r) => {
        setTourist(r.data);
        setForm(r.data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await touristApi.update(tourist!.id, form);
      setTourist(res.data);
      setForm(res.data);
      setEditMode(false);
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  const TABS = [
    { key: "personal" as Tab, label: "Personal Info", icon: User },
    { key: "medical" as Tab, label: "Medical Info", icon: Heart },
    { key: "contacts" as Tab, label: "Emergency Contacts", icon: Phone },
    { key: "privacy" as Tab, label: "Privacy & Consent", icon: Shield },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-ts-navy">My Profile</h1>
          <p className="text-xs text-ts-slate/60 mt-0.5">Manage your personal and medical information</p>
        </div>
        {!editMode ? (
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-2 text-sm border border-ts-mid px-4 py-2 rounded-lg text-ts-navy hover:bg-ts-light transition-colors"
          >
            <Edit2 className="w-4 h-4" /> Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => { setEditMode(false); setForm(tourist ?? {}); }}
              className="flex items-center gap-2 text-sm border border-ts-mid px-4 py-2 rounded-lg text-ts-slate hover:bg-ts-light transition-colors"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 text-sm bg-ts-navy text-white px-4 py-2 rounded-lg hover:bg-ts-navy/90 transition-colors disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      {/* Avatar + name */}
      <div className="bg-white rounded-xl border border-ts-mid p-5 flex items-center gap-5 mb-5">
        <div className="w-16 h-16 rounded-full bg-ts-navy flex items-center justify-center shrink-0">
          <span className="text-2xl font-bold text-white">
            {tourist?.full_name?.charAt(0) ?? "T"}
          </span>
        </div>
        <div>
          <h2 className="text-lg font-bold text-ts-navy">{tourist?.full_name ?? "—"}</h2>
          <p className="text-sm text-ts-slate/60">{tourist?.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-ts-green/10 text-ts-green px-2 py-0.5 rounded-full font-medium">
              {tourist?.status ?? "active"}
            </span>
            <span className="text-xs text-ts-slate/50">{tourist?.nationality}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-ts-light rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-colors",
              tab === t.key
                ? "bg-white text-ts-navy shadow-sm"
                : "text-ts-slate/60 hover:text-ts-slate"
            )}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-xl border border-ts-mid p-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : (
          <>
            {tab === "personal" && (
              <PersonalTab form={form} setForm={setForm} editMode={editMode} />
            )}
            {tab === "medical" && (
              <MedicalTab form={form} setForm={setForm} editMode={editMode} />
            )}
            {tab === "contacts" && (
              <ContactsTab form={form} setForm={setForm} editMode={editMode} />
            )}
            {tab === "privacy" && (
              <PrivacyTab form={form} setForm={setForm} editMode={editMode} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ——— Sub-tabs ———

function PersonalTab({ form, setForm, editMode }: any) {
  const fields = [
    { label: "Full Name", key: "full_name", type: "text" },
    { label: "Email", key: "email", type: "email" },
    { label: "Phone", key: "phone", type: "tel" },
    { label: "Nationality", key: "nationality", type: "text" },
    { label: "Passport / ID Number", key: "passport_number", type: "text" },
    { label: "Date of Birth", key: "date_of_birth", type: "date" },
  ];
  return (
    <div className="grid grid-cols-2 gap-4">
      {fields.map((f) => (
        <FormField
          key={f.key}
          label={f.label}
          value={form[f.key] ?? ""}
          onChange={(v) => setForm({ ...form, [f.key]: v })}
          type={f.type}
          editMode={editMode}
        />
      ))}
    </div>
  );
}

function MedicalTab({ form, setForm, editMode }: any) {
  const med = form.medical_info ?? {};
  const update = (key: string, value: any) =>
    setForm({ ...form, medical_info: { ...med, [key]: value } });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Blood Group"
          value={med.blood_group ?? ""}
          onChange={(v) => update("blood_group", v)}
          editMode={editMode}
        />
        <FormField
          label="Known Allergies"
          value={med.allergies ?? ""}
          onChange={(v) => update("allergies", v)}
          editMode={editMode}
        />
      </div>
      <FormField
        label="Medical Conditions"
        value={med.conditions ?? ""}
        onChange={(v) => update("conditions", v)}
        editMode={editMode}
        multiline
      />
      <FormField
        label="Medications"
        value={med.medications ?? ""}
        onChange={(v) => update("medications", v)}
        editMode={editMode}
        multiline
      />
    </div>
  );
}

function ContactsTab({ form, setForm, editMode }: any) {
  const contacts: any[] = form.emergency_contacts ?? [];
  function addContact() {
    setForm({
      ...form,
      emergency_contacts: [...contacts, { name: "", phone: "", relation: "" }],
    });
  }
  function removeContact(i: number) {
    const updated = contacts.filter((_, idx) => idx !== i);
    setForm({ ...form, emergency_contacts: updated });
  }
  function updateContact(i: number, key: string, value: string) {
    const updated = contacts.map((c, idx) => (idx === i ? { ...c, [key]: value } : c));
    setForm({ ...form, emergency_contacts: updated });
  }
  return (
    <div className="space-y-3">
      {contacts.map((c, i) => (
        <div key={i} className="grid grid-cols-3 gap-3 p-3 bg-ts-light rounded-lg relative">
          {["name", "phone", "relation"].map((k) => (
            <FormField
              key={k}
              label={k.charAt(0).toUpperCase() + k.slice(1)}
              value={c[k] ?? ""}
              onChange={(v) => updateContact(i, k, v)}
              editMode={editMode}
            />
          ))}
          {editMode && (
            <button
              onClick={() => removeContact(i)}
              className="absolute top-2 right-2 p-1 text-red-400 hover:bg-red-50 rounded"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      {editMode && (
        <button
          onClick={addContact}
          className="flex items-center gap-2 text-xs text-ts-teal hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Add contact
        </button>
      )}
      {contacts.length === 0 && !editMode && (
        <p className="text-sm text-ts-slate/50 text-center py-6">No emergency contacts added</p>
      )}
    </div>
  );
}

function PrivacyTab({ form, setForm, editMode }: any) {
  const consent = form.consent ?? {};
  const update = (key: string, value: boolean) =>
    setForm({ ...form, consent: { ...consent, [key]: value } });
  const items = [
    { key: "location_tracking", label: "Real-time location tracking", desc: "Share GPS location with authorities" },
    { key: "data_analytics", label: "Anonymous analytics", desc: "Contribute to safety heatmaps" },
    { key: "alerts", label: "Emergency alerts", desc: "Receive push notifications for zone alerts" },
    { key: "data_retention_90d", label: "90-day data retention", desc: "Keep incident history for 90 days" },
  ];
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.key} className="flex items-start justify-between gap-4 py-3 border-b border-ts-mid/50 last:border-0">
          <div>
            <p className="text-sm font-medium text-ts-navy">{item.label}</p>
            <p className="text-xs text-ts-slate/50 mt-0.5">{item.desc}</p>
          </div>
          <button
            disabled={!editMode}
            onClick={() => update(item.key, !consent[item.key])}
            className={cn(
              "relative w-10 h-5 rounded-full transition-colors shrink-0 mt-0.5",
              consent[item.key] ? "bg-ts-green" : "bg-ts-mid",
              !editMode && "cursor-default"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                consent[item.key] && "translate-x-5"
              )}
            />
          </button>
        </div>
      ))}
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  editMode,
  type = "text",
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  editMode: boolean;
  type?: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="text-xs text-ts-slate/60 font-medium">{label}</label>
      {multiline ? (
        <textarea
          readOnly={!editMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className={cn(
            "mt-1 w-full border rounded-lg px-3 py-2 text-sm resize-none transition-colors",
            editMode
              ? "border-ts-mid focus:outline-none focus:ring-2 focus:ring-ts-navy/30"
              : "border-transparent bg-ts-light text-ts-navy"
          )}
        />
      ) : (
        <input
          type={type}
          readOnly={!editMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "mt-1 w-full border rounded-lg px-3 py-2 text-sm transition-colors",
            editMode
              ? "border-ts-mid focus:outline-none focus:ring-2 focus:ring-ts-navy/30"
              : "border-transparent bg-ts-light text-ts-navy"
          )}
        />
      )}
    </div>
  );
}
