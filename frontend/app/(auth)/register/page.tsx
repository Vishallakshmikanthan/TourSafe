"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Globe,
  CreditCard,
  Heart,
  Phone,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ─── Step types ──────────────────────────────────────────────────────────────
interface FormData {
  // Step 1: Account
  email: string;
  password: string;
  // Step 2: Identity
  full_name: string;
  nationality: string;
  passport_number: string;
  date_of_birth: string;
  gender: "male" | "female" | "other" | "";
  phone: string;
  // Step 3: Medical
  blood_group: string;
  medical_conditions: string[];
  allergies: string[];
  // Step 4: Emergency contacts
  emergency_contacts: { name: string; phone: string; relationship: string }[];
  // Step 5: Consent
  consent_tracking: boolean;
  consent_data_sharing: boolean;
  consent_emergency: boolean;
}

const INITIAL_FORM: FormData = {
  email: "",
  password: "",
  full_name: "",
  nationality: "",
  passport_number: "",
  date_of_birth: "",
  gender: "",
  phone: "",
  blood_group: "",
  medical_conditions: [],
  allergies: [],
  emergency_contacts: [{ name: "", phone: "", relationship: "" }],
  consent_tracking: false,
  consent_data_sharing: false,
  consent_emergency: false,
};

const STEPS = [
  { id: 1, label: "Account", icon: User },
  { id: 2, label: "Identity", icon: Globe },
  { id: 3, label: "Medical", icon: Heart },
  { id: 4, label: "Contacts", icon: Phone },
  { id: 5, label: "Consent", icon: CreditCard },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [conditionInput, setConditionInput] = useState("");
  const [allergyInput, setAllergyInput] = useState("");

  function update(field: keyof FormData, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function canProceed(): boolean {
    if (step === 1) return !!(form.email && form.password && form.password.length >= 8);
    if (step === 2)
      return !!(form.full_name && form.nationality && form.passport_number && form.phone);
    if (step === 5)
      return !!(form.consent_tracking && form.consent_data_sharing && form.consent_emergency);
    return true;
  }

  async function handleSubmit() {
    setLoading(true);
    const supabase = createClient();
    try {
      // 1. Create Supabase auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { role: "tourist", full_name: form.full_name },
        },
      });
      if (authError) throw authError;

      // 2. Get session token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // 3. Create tourist profile via backend API
      if (session?.access_token) {
        await api.post(
          "/tourists",
          {
            full_name: form.full_name,
            nationality: form.nationality,
            passport_number: form.passport_number,
            phone: form.phone,
            email: form.email,
            date_of_birth: form.date_of_birth || undefined,
            gender: form.gender || undefined,
            blood_group: form.blood_group || undefined,
            medical_conditions: form.medical_conditions,
            allergies: form.allergies,
            emergency_contacts: form.emergency_contacts.filter((c) => c.name && c.phone),
          },
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }
        );
      }

      toast.success("Account created! Redirecting to dashboard…");
      // Show unique ID notification
      if (authData?.user?.id) {
        const shortId = authData.user.id.slice(0, 8).toUpperCase();
        toast.info(
          `Your Unique ID: TS-${shortId} — A copy has been sent to your email. Keep it safe!`,
          { duration: 10000 }
        );
      }
      router.replace("/tourist/dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-lg">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Step indicator */}
        <div className="flex border-b border-ts-mid">
          {STEPS.map((s) => {
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div
                key={s.id}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                  active
                    ? "text-ts-navy bg-ts-light/50"
                    : done
                    ? "text-ts-teal"
                    : "text-ts-slate/40"
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
                  {done ? <Check className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
                </div>
                <span className="hidden sm:block">{s.label}</span>
              </div>
            );
          })}
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              {step === 1 && (
                <StepAccount form={form} update={update} />
              )}
              {step === 2 && (
                <StepIdentity form={form} update={update} />
              )}
              {step === 3 && (
                <StepMedical
                  form={form}
                  update={update}
                  conditionInput={conditionInput}
                  setConditionInput={setConditionInput}
                  allergyInput={allergyInput}
                  setAllergyInput={setAllergyInput}
                />
              )}
              {step === 4 && (
                <StepContacts form={form} update={update} />
              )}
              {step === 5 && (
                <StepConsent form={form} update={update} />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-ts-mid">
            {step > 1 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-2 text-sm text-ts-slate hover:text-ts-navy transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <Link
                href="/auth/login"
                className="text-sm text-ts-slate/60 hover:text-ts-slate transition-colors"
              >
                Already have an account?
              </Link>
            )}

            {step < 5 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-5 py-2.5 bg-ts-navy text-white text-sm font-semibold rounded-lg hover:bg-ts-navy/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed() || loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-ts-teal text-white text-sm font-semibold rounded-lg hover:bg-ts-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Create Account
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Account ──────────────────────────────────────────────────────────
function StepAccount({
  form,
  update,
}: {
  form: FormData;
  update: (k: keyof FormData, v: unknown) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-ts-navy">Create Your Account</h2>
        <p className="text-sm text-ts-slate/60 mt-0.5">
          Set up your TourSafe login credentials
        </p>
      </div>
      <Field
        label="Email address"
        type="email"
        value={form.email}
        onChange={(v) => update("email", v)}
        placeholder="you@example.com"
        required
      />
      <Field
        label="Password"
        type="password"
        value={form.password}
        onChange={(v) => update("password", v)}
        placeholder="At least 8 characters"
        required
      />
      {form.password && form.password.length < 8 && (
        <p className="text-xs text-ts-alert-red">Password must be at least 8 characters</p>
      )}
    </div>
  );
}

// ─── Step 2: Identity ─────────────────────────────────────────────────────────
function StepIdentity({
  form,
  update,
}: {
  form: FormData;
  update: (k: keyof FormData, v: unknown) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-ts-navy">Personal Information</h2>
        <p className="text-sm text-ts-slate/60 mt-0.5">
          Identity details for your tourist profile
        </p>
      </div>
      <Field
        label="Full name (as on passport)"
        value={form.full_name}
        onChange={(v) => update("full_name", v)}
        placeholder="John Doe"
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Nationality"
          value={form.nationality}
          onChange={(v) => update("nationality", v)}
          placeholder="American"
          required
        />
        <Field
          label="Passport number"
          value={form.passport_number}
          onChange={(v) => update("passport_number", v)}
          placeholder="A1234567"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Phone (with country code)"
          value={form.phone}
          onChange={(v) => update("phone", v)}
          placeholder="+1 555 0100"
          required
        />
        <Field
          label="Date of birth"
          type="date"
          value={form.date_of_birth}
          onChange={(v) => update("date_of_birth", v)}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-ts-slate mb-1.5">Gender</label>
        <div className="flex gap-3">
          {(["male", "female", "other"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => update("gender", g)}
              className={cn(
                "flex-1 py-2 text-sm rounded-lg border transition-colors capitalize",
                form.gender === g
                  ? "bg-ts-navy text-white border-ts-navy"
                  : "border-ts-mid text-ts-slate hover:bg-ts-light"
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Medical ──────────────────────────────────────────────────────────
function StepMedical({
  form,
  update,
  conditionInput,
  setConditionInput,
  allergyInput,
  setAllergyInput,
}: {
  form: FormData;
  update: (k: keyof FormData, v: unknown) => void;
  conditionInput: string;
  setConditionInput: (v: string) => void;
  allergyInput: string;
  setAllergyInput: (v: string) => void;
}) {
  function addTag(type: "medical_conditions" | "allergies", input: string, setInput: (v: string) => void) {
    const trimmed = input.trim();
    if (!trimmed) return;
    const current = form[type] as string[];
    if (!current.includes(trimmed)) {
      update(type, [...current, trimmed]);
    }
    setInput("");
  }
  function removeTag(type: "medical_conditions" | "allergies", val: string) {
    update(type, (form[type] as string[]).filter((v) => v !== val));
  }

  const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-ts-navy">Medical Information</h2>
        <p className="text-sm text-ts-slate/60 mt-0.5">
          Optional but helps first responders in emergencies
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-ts-slate mb-1.5">Blood group</label>
        <div className="flex flex-wrap gap-2">
          {BLOOD_GROUPS.map((bg) => (
            <button
              key={bg}
              type="button"
              onClick={() => update("blood_group", form.blood_group === bg ? "" : bg)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                form.blood_group === bg
                  ? "bg-ts-alert-red text-white border-ts-alert-red"
                  : "border-ts-mid text-ts-slate hover:bg-ts-light"
              )}
            >
              {bg}
            </button>
          ))}
        </div>
      </div>

      <TagInput
        label="Medical conditions"
        tags={form.medical_conditions}
        input={conditionInput}
        setInput={setConditionInput}
        onAdd={() => addTag("medical_conditions", conditionInput, setConditionInput)}
        onRemove={(v) => removeTag("medical_conditions", v)}
        placeholder="e.g. Diabetes, Asthma"
      />

      <TagInput
        label="Allergies"
        tags={form.allergies}
        input={allergyInput}
        setInput={setAllergyInput}
        onAdd={() => addTag("allergies", allergyInput, setAllergyInput)}
        onRemove={(v) => removeTag("allergies", v)}
        placeholder="e.g. Penicillin, Peanuts"
      />
    </div>
  );
}

// ─── Step 4: Emergency Contacts ───────────────────────────────────────────────
function StepContacts({
  form,
  update,
}: {
  form: FormData;
  update: (k: keyof FormData, v: unknown) => void;
}) {
  function updateContact(idx: number, field: string, val: string) {
    const updated = form.emergency_contacts.map((c, i) =>
      i === idx ? { ...c, [field]: val } : c
    );
    update("emergency_contacts", updated);
  }
  function addContact() {
    update("emergency_contacts", [
      ...form.emergency_contacts,
      { name: "", phone: "", relationship: "" },
    ]);
  }
  function removeContact(idx: number) {
    update(
      "emergency_contacts",
      form.emergency_contacts.filter((_, i) => i !== idx)
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-ts-navy">Emergency Contacts</h2>
        <p className="text-sm text-ts-slate/60 mt-0.5">
          People to notify in case of emergency
        </p>
      </div>

      {form.emergency_contacts.map((contact, idx) => (
        <div key={idx} className="bg-ts-light rounded-xl p-4 space-y-3 relative">
          {form.emergency_contacts.length > 1 && (
            <button
              onClick={() => removeContact(idx)}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-ts-mid transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-ts-alert-red" />
            </button>
          )}
          <p className="text-xs font-semibold text-ts-navy">Contact {idx + 1}</p>
          <Field
            label="Full name"
            value={contact.name}
            onChange={(v) => updateContact(idx, "name", v)}
            placeholder="Jane Doe"
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Phone"
              value={contact.phone}
              onChange={(v) => updateContact(idx, "phone", v)}
              placeholder="+1 555 0200"
            />
            <Field
              label="Relationship"
              value={contact.relationship}
              onChange={(v) => updateContact(idx, "relationship", v)}
              placeholder="Spouse, Parent…"
            />
          </div>
        </div>
      ))}

      {form.emergency_contacts.length < 3 && (
        <button
          onClick={addContact}
          className="flex items-center gap-2 text-sm text-ts-teal hover:text-ts-teal/80 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add another contact
        </button>
      )}
    </div>
  );
}

// ─── Step 5: Consent ──────────────────────────────────────────────────────────
function StepConsent({
  form,
  update,
}: {
  form: FormData;
  update: (k: keyof FormData, v: unknown) => void;
}) {
  const items = [
    {
      key: "consent_tracking" as keyof FormData,
      title: "Location Tracking",
      desc: "Allow TourSafe to track your GPS location in real-time to ensure your safety.",
    },
    {
      key: "consent_data_sharing" as keyof FormData,
      title: "Data Sharing with Authorities",
      desc: "Share your profile and location data with authorized safety personnel.",
    },
    {
      key: "consent_emergency" as keyof FormData,
      title: "Emergency Notification",
      desc: "Notify your emergency contacts and local authorities in case of an SOS event.",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-ts-navy">Privacy & Consent</h2>
        <p className="text-sm text-ts-slate/60 mt-0.5">
          Please review and accept all consents to use TourSafe
        </p>
      </div>

      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => update(item.key, !form[item.key])}
          className={cn(
            "w-full text-left flex items-start gap-4 p-4 rounded-xl border-2 transition-all",
            form[item.key]
              ? "border-ts-teal bg-ts-teal/5"
              : "border-ts-mid hover:border-ts-slate/40"
          )}
        >
          <div
            className={cn(
              "w-5 h-5 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors",
              form[item.key]
                ? "bg-ts-teal border-ts-teal"
                : "border-ts-mid"
            )}
          >
            {form[item.key] && <Check className="w-3 h-3 text-white" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-ts-navy">{item.title}</p>
            <p className="text-xs text-ts-slate/60 mt-0.5">{item.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ts-slate mb-1.5">
        {label}
        {required && <span className="text-ts-alert-red ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-ts-mid rounded-lg focus:outline-none focus:ring-2 focus:ring-ts-navy/30 focus:border-ts-navy/50 transition-colors"
      />
    </div>
  );
}

function TagInput({
  label,
  tags,
  input,
  setInput,
  onAdd,
  onRemove,
  placeholder,
}: {
  label: string;
  tags: string[];
  input: string;
  setInput: (v: string) => void;
  onAdd: () => void;
  onRemove: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ts-slate mb-1.5">{label}</label>
      <div className="flex gap-2 mb-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onAdd())}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-sm border border-ts-mid rounded-lg focus:outline-none focus:ring-2 focus:ring-ts-navy/30"
        />
        <button
          type="button"
          onClick={onAdd}
          className="px-3 py-2 bg-ts-navy text-white text-sm rounded-lg hover:bg-ts-navy/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 bg-ts-light px-2.5 py-1 rounded-full text-xs text-ts-navy font-medium"
            >
              {tag}
              <button
                onClick={() => onRemove(tag)}
                className="hover:text-ts-alert-red transition-colors"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
