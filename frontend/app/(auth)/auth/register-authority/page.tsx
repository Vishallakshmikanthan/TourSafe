"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  Building2,
  Phone,
  Mail,
  Hash,
  MapPin,
  Tag,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

type AuthorityType = "police" | "agency" | "hospital" | "other";

interface FormData {
  // Credentials
  email: string;
  password: string;
  // Organisation
  authority_type: AuthorityType;
  org_name: string;
  badge_number: string;
  contact_phone: string;
  // Agency details (if type = agency)
  agency_tour_types: string[];
  // Jurisdiction
  jurisdiction_spots: string[];
}

const INITIAL_FORM: FormData = {
  email: "",
  password: "",
  authority_type: "police",
  org_name: "",
  badge_number: "",
  contact_phone: "",
  agency_tour_types: [],
  jurisdiction_spots: [],
};

const STEPS = [
  { id: 1, label: "Account" },
  { id: 2, label: "Organisation" },
  { id: 3, label: "Jurisdiction" },
];

const TOUR_TYPE_OPTIONS = [
  "Pilgrimage",
  "Educational",
  "Adventure",
  "Cultural",
  "Wildlife",
  "Medical",
  "Leisure",
  "Corporate",
];

export default function AuthorityRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [spotInput, setSpotInput] = useState("");

  function update<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function canProceed() {
    if (step === 1) return !!(form.email && form.password && form.password.length >= 8);
    if (step === 2) return !!(form.org_name && form.badge_number);
    return true;
  }

  function addSpot() {
    const s = spotInput.trim();
    if (s && !form.jurisdiction_spots.includes(s)) {
      update("jurisdiction_spots", [...form.jurisdiction_spots, s]);
    }
    setSpotInput("");
  }

  function toggleTourType(t: string) {
    if (form.agency_tour_types.includes(t)) {
      update(
        "agency_tour_types",
        form.agency_tour_types.filter((x) => x !== t)
      );
    } else {
      update("agency_tour_types", [...form.agency_tour_types, t]);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    const supabase = createClient();
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { role: "authority", org_name: form.org_name },
        },
      });
      if (authError) throw authError;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        await api.post(
          "/authority",
          {
            authority_type: form.authority_type,
            org_name: form.org_name,
            badge_number: form.badge_number,
            contact_phone: form.contact_phone,
            contact_email: form.email,
            agency_tour_types: form.agency_tour_types,
            jurisdiction_spots: form.jurisdiction_spots,
          },
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );
      }

      toast.success("Authority account created! Pending verification.");
      router.replace("/admin/dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-lg">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Step bar */}
        <div className="flex border-b border-ts-mid">
          {STEPS.map((s) => {
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div
                key={s.id}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                  active ? "text-ts-navy bg-ts-light/50" : done ? "text-ts-teal" : "text-ts-slate/40"
                )}
              >
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors",
                    active
                      ? "border-ts-navy bg-ts-navy text-white"
                      : done
                      ? "border-ts-teal bg-ts-teal text-white"
                      : "border-ts-mid text-ts-slate/40"
                  )}
                >
                  {done ? <Check className="w-3.5 h-3.5" /> : <span>{s.id}</span>}
                </div>
                <span className="hidden sm:block">{s.label}</span>
              </div>
            );
          })}
        </div>

        <div className="p-8">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 bg-ts-navy/10 rounded-lg flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-ts-navy" />
            </div>
            <div>
              <h2 className="font-bold text-ts-navy text-base">Authority Registration</h2>
              <p className="text-xs text-ts-slate/60">Police Station / Travel Agency</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {step === 1 && (
                <>
                  <Field label="Official Email" icon={<Mail className="w-4 h-4" />}>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="officer@police.gov.in"
                      required
                      className="input"
                    />
                  </Field>
                  <Field label="Password (min. 8 chars)" icon={<Hash className="w-4 h-4" />}>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      placeholder="••••••••"
                      required
                      className="input"
                    />
                  </Field>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-ts-slate mb-1.5">
                      Organisation Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { value: "police", label: "Police Station" },
                          { value: "agency", label: "Travel Agency" },
                          { value: "hospital", label: "Hospital" },
                          { value: "other", label: "Other Authority" },
                        ] as { value: AuthorityType; label: string }[]
                      ).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => update("authority_type", opt.value)}
                          className={cn(
                            "py-2 px-3 rounded-lg border text-sm font-medium transition-colors",
                            form.authority_type === opt.value
                              ? "border-ts-navy bg-ts-navy text-white"
                              : "border-ts-mid text-ts-slate hover:bg-ts-light"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Field label="Organisation / Station Name" icon={<Building2 className="w-4 h-4" />}>
                    <input
                      type="text"
                      value={form.org_name}
                      onChange={(e) => update("org_name", e.target.value)}
                      placeholder="Ooty Police Station"
                      required
                      className="input"
                    />
                  </Field>

                  <Field label="Badge / Registration Number" icon={<Hash className="w-4 h-4" />}>
                    <input
                      type="text"
                      value={form.badge_number}
                      onChange={(e) => update("badge_number", e.target.value)}
                      placeholder="TN-12345"
                      required
                      className="input"
                    />
                  </Field>

                  <Field label="Contact Phone" icon={<Phone className="w-4 h-4" />}>
                    <input
                      type="tel"
                      value={form.contact_phone}
                      onChange={(e) => update("contact_phone", e.target.value)}
                      placeholder="+91 90000 00000"
                      className="input"
                    />
                  </Field>

                  {form.authority_type === "agency" && (
                    <div>
                      <label className="block text-xs font-semibold text-ts-slate mb-2">
                        Tour Types Handled
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {TOUR_TYPE_OPTIONS.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => toggleTourType(t)}
                            className={cn(
                              "px-3 py-1 rounded-full border text-xs font-medium transition-colors",
                              form.agency_tour_types.includes(t)
                                ? "bg-ts-teal border-ts-teal text-white"
                                : "border-ts-mid text-ts-slate hover:bg-ts-light"
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {step === 3 && (
                <>
                  <p className="text-xs text-ts-slate/60 mb-3">
                    Register the tourist spots under your jurisdiction. Tourists in these
                    spots will be routed to your authority for monitoring.
                  </p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ts-slate/40" />
                      <input
                        type="text"
                        value={spotInput}
                        onChange={(e) => setSpotInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSpot())}
                        placeholder="e.g. Guna Caves, Ooty Lake…"
                        className="w-full pl-9 pr-3 py-2.5 border border-ts-mid rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ts-teal/30"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addSpot}
                      className="px-4 py-2.5 bg-ts-navy text-white rounded-lg text-sm hover:bg-ts-navy/90 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.jurisdiction_spots.map((spot) => (
                      <span
                        key={spot}
                        className="flex items-center gap-1.5 bg-ts-light border border-ts-mid rounded-full px-3 py-1 text-xs text-ts-navy"
                      >
                        <Tag className="w-3 h-3" />
                        {spot}
                        <button
                          type="button"
                          onClick={() =>
                            update(
                              "jurisdiction_spots",
                              form.jurisdiction_spots.filter((s) => s !== spot)
                            )
                          }
                          className="ml-0.5 text-ts-slate/50 hover:text-ts-alert-red"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {form.jurisdiction_spots.length === 0 && (
                      <p className="text-xs text-ts-slate/40 italic">
                        No spots added yet. You can add them later too.
                      </p>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Nav buttons */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 border border-ts-mid rounded-lg text-sm text-ts-slate hover:bg-ts-light transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            {step < STEPS.length ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed()}
                className="flex-1 flex items-center justify-center gap-1.5 bg-ts-navy text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-ts-navy/90 transition-colors disabled:opacity-50"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-ts-teal text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-ts-teal/90 transition-colors disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Register Authority
              </button>
            )}
          </div>
        </div>

        <div className="bg-ts-light/50 border-t border-ts-mid px-6 py-3">
          <p className="text-[11px] text-ts-slate/50 text-center">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-ts-teal hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ts-slate mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ts-slate/40">{icon}</span>
        <div className="[&_input]:w-full [&_input]:pl-9 [&_input]:pr-4 [&_input]:py-2.5 [&_input]:border [&_input]:border-ts-mid [&_input]:rounded-lg [&_input]:text-sm [&_input]:focus:outline-none [&_input]:focus:ring-2 [&_input]:focus:ring-ts-teal/30 [&_input]:focus:border-ts-teal">
          {children}
        </div>
      </div>
    </div>
  );
}
