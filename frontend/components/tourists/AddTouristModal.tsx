"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  UserPlus,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Download,
  ChevronDown,
} from "lucide-react";
import { touristApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AddTouristModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialMode?: Mode;
}

type Mode = "single" | "csv";

interface SingleForm {
  full_name: string;
  email: string;
  phone: string;
  nationality: string;
  passport_number: string;
  date_of_birth: string;
  gender: "male" | "female" | "other";
  blood_group: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  address: string;
  visa_number: string;
  visa_expiry: string;
}

const EMPTY_FORM: SingleForm = {
  full_name: "",
  email: "",
  phone: "",
  nationality: "",
  passport_number: "",
  date_of_birth: "",
  gender: "other",
  blood_group: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  address: "",
  visa_number: "",
  visa_expiry: "",
};

interface CSVRow {
  full_name: string;
  email: string;
  phone: string;
  nationality: string;
  passport_number: string;
  date_of_birth: string;
  gender: string;
  [key: string]: string;
}

interface ImportResult {
  imported: number;
  failed: number;
  errors?: Array<{ row: number; message: string }>;
}

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

const CSV_TEMPLATE_HEADERS =
  "full_name,email,phone,nationality,passport_number,date_of_birth,gender,blood_group,emergency_contact_name,emergency_contact_phone,visa_number,visa_expiry";

function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function AddTouristModal({ open, onClose, onSuccess, initialMode = "single" }: AddTouristModalProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [form, setForm] = useState<SingleForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<SingleForm>>({});

  // CSV state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CSVRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleClose() {
    if (submitting || importing) return;
    setForm(EMPTY_FORM);
    setErrors({});
    setCsvFile(null);
    setCsvPreview([]);
    setCsvErrors([]);
    setImportResult(null);
    onClose();
  }

  function validate(): boolean {
    const e: Partial<SingleForm> = {};
    if (!form.full_name.trim()) e.full_name = "Name is required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Valid email required";
    if (!form.phone.trim()) e.phone = "Phone is required";
    if (!form.nationality.trim()) e.nationality = "Nationality is required";
    if (!form.passport_number.trim()) e.passport_number = "Passport number is required";
    if (!form.date_of_birth) e.date_of_birth = "Date of birth is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSingleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await touristApi.create(form);
      toast.success(`Tourist "${form.full_name}" added successfully`);
      onSuccess();
      handleClose();
    } catch {
      toast.error("Failed to add tourist");
    } finally {
      setSubmitting(false);
    }
  }

  function handleFileChange(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }
    setCsvFile(file);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        setCsvErrors(["CSV must have a header row and at least one data row"]);
        setCsvPreview([]);
        return;
      }
      const headers = parseCsvRow(lines[0]).map((h) => h.toLowerCase().trim());
      const required = ["full_name", "nationality", "passport_number"];
      const missing = required.filter((r) => !headers.includes(r));
      if (missing.length > 0) {
        setCsvErrors([`Missing required columns: ${missing.join(", ")}`]);
        setCsvPreview([]);
        return;
      }
      const errs: string[] = [];
      const rows: CSVRow[] = lines.slice(1).map((line, idx) => {
        const vals = parseCsvRow(line);
        const row: CSVRow = {
          full_name: "",
          email: "",
          phone: "",
          nationality: "",
          passport_number: "",
          date_of_birth: "",
          gender: "other",
        };
        headers.forEach((h, i) => {
          row[h] = vals[i] ?? "";
        });
        if (!row.full_name) errs.push(`Row ${idx + 2}: full_name is required`);
        if (!row.nationality) errs.push(`Row ${idx + 2}: nationality is required`);
        if (!row.passport_number) errs.push(`Row ${idx + 2}: passport_number is required`);
        return row;
      });
      setCsvErrors(errs);
      setCsvPreview(rows.slice(0, 5));
    };
    reader.readAsText(file);
  }

  async function handleCSVImport() {
    if (!csvFile || csvErrors.length > 0) return;
    setImporting(true);
    try {
      const text = await csvFile.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const headers = parseCsvRow(lines[0]).map((h) => h.toLowerCase().trim());
      const rows = lines.slice(1).map((line) => {
        const vals = parseCsvRow(line);
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
        return row;
      });
      const res = await touristApi.bulkImport(rows);
      const result = res.data as ImportResult;
      setImportResult(result);
      toast.success(`Imported ${result.imported} tourist${result.imported !== 1 ? "s" : ""}`);
      if (result.failed === 0) {
        onSuccess();
      }
    } catch {
      toast.error("Import failed. Please check your CSV file.");
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const sample =
      CSV_TEMPLATE_HEADERS +
      "\nJohn Doe,john@example.com,+911234567890,American,US1234567,1990-05-15,male,O+,Jane Doe,+911234567891,V1234567,2025-12-31";
    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tourist_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const setField = useCallback(
    (key: keyof SingleForm, val: string) => {
      setForm((prev) => ({ ...prev, [key]: val }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    []
  );

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col mx-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-ts-mid flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-ts-navy/10 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-ts-navy" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-ts-navy">Add Tourist</h2>
                  <p className="text-xs text-ts-slate/60">Register a new tourist in the system</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 hover:bg-ts-light rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-ts-slate" />
              </button>
            </div>

            {/* Mode tabs */}
            <div className="flex gap-1 px-6 pt-4 flex-shrink-0">
              {(["single", "csv"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                    mode === m
                      ? "bg-ts-navy text-white"
                      : "bg-ts-light text-ts-slate/70 hover:bg-ts-mid/60"
                  )}
                >
                  {m === "single" ? (
                    <UserPlus className="w-3.5 h-3.5" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  {m === "single" ? "Single Tourist" : "Import CSV"}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4">
              {mode === "single" ? (
                <form id="add-tourist-form" onSubmit={handleSingleSubmit} className="space-y-5">
                  {/* Section: Personal Info */}
                  <section>
                    <p className="text-xs font-semibold text-ts-slate/50 uppercase tracking-wider mb-3">
                      Personal Information
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        label="Full Name *"
                        value={form.full_name}
                        onChange={(v) => setField("full_name", v)}
                        error={errors.full_name}
                        placeholder="e.g. John Doe"
                      />
                      <Field
                        label="Email *"
                        type="email"
                        value={form.email}
                        onChange={(v) => setField("email", v)}
                        error={errors.email}
                        placeholder="john@example.com"
                      />
                      <Field
                        label="Phone *"
                        value={form.phone}
                        onChange={(v) => setField("phone", v)}
                        error={errors.phone}
                        placeholder="+91 98765 43210"
                      />
                      <Field
                        label="Date of Birth *"
                        type="date"
                        value={form.date_of_birth}
                        onChange={(v) => setField("date_of_birth", v)}
                        error={errors.date_of_birth}
                      />
                      <div>
                        <label className="block text-xs font-medium text-ts-slate mb-1">
                          Gender
                        </label>
                        <select
                          value={form.gender}
                          onChange={(e) =>
                            setField("gender", e.target.value as SingleForm["gender"])
                          }
                          className="w-full px-3 py-2 text-sm border border-ts-mid rounded-lg focus:outline-none focus:ring-2 focus:ring-ts-teal/30 bg-white"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-ts-slate mb-1">
                          Blood Group
                        </label>
                        <select
                          value={form.blood_group}
                          onChange={(e) => setField("blood_group", e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-ts-mid rounded-lg focus:outline-none focus:ring-2 focus:ring-ts-teal/30 bg-white"
                        >
                          <option value="">Select…</option>
                          {BLOOD_GROUPS.map((bg) => (
                            <option key={bg} value={bg}>
                              {bg}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </section>

                  {/* Section: Travel Documents */}
                  <section>
                    <p className="text-xs font-semibold text-ts-slate/50 uppercase tracking-wider mb-3">
                      Travel Documents
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        label="Nationality *"
                        value={form.nationality}
                        onChange={(v) => setField("nationality", v)}
                        error={errors.nationality}
                        placeholder="e.g. American"
                      />
                      <Field
                        label="Passport Number *"
                        value={form.passport_number}
                        onChange={(v) => setField("passport_number", v)}
                        error={errors.passport_number}
                        placeholder="e.g. US1234567"
                      />
                      <Field
                        label="Visa Number"
                        value={form.visa_number}
                        onChange={(v) => setField("visa_number", v)}
                        placeholder="e.g. V9876543"
                      />
                      <Field
                        label="Visa Expiry"
                        type="date"
                        value={form.visa_expiry}
                        onChange={(v) => setField("visa_expiry", v)}
                      />
                    </div>
                  </section>

                  {/* Section: Emergency Contact */}
                  <section>
                    <p className="text-xs font-semibold text-ts-slate/50 uppercase tracking-wider mb-3">
                      Emergency Contact
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        label="Contact Name"
                        value={form.emergency_contact_name}
                        onChange={(v) => setField("emergency_contact_name", v)}
                        placeholder="e.g. Jane Doe"
                      />
                      <Field
                        label="Contact Phone"
                        value={form.emergency_contact_phone}
                        onChange={(v) => setField("emergency_contact_phone", v)}
                        placeholder="+1 555 123 4567"
                      />
                    </div>
                  </section>

                  {/* Section: Address */}
                  <section>
                    <p className="text-xs font-semibold text-ts-slate/50 uppercase tracking-wider mb-3">
                      Address
                    </p>
                    <textarea
                      value={form.address}
                      onChange={(e) => setField("address", e.target.value)}
                      placeholder="Home / hotel address"
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-ts-mid rounded-lg focus:outline-none focus:ring-2 focus:ring-ts-teal/30 resize-none"
                    />
                  </section>
                </form>
              ) : (
                <div className="space-y-5">
                  {/* CSV instructions */}
                  <div className="bg-ts-light rounded-xl p-4 flex items-start gap-3">
                    <FileText className="w-5 h-5 text-ts-teal flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ts-navy">CSV Import Guidelines</p>
                      <ul className="text-xs text-ts-slate/70 mt-1.5 space-y-1 list-disc list-inside">
                        <li>Required columns: <span className="font-mono">full_name, nationality, passport_number</span></li>
                        <li>Optional: <span className="font-mono">email, phone, date_of_birth, gender, blood_group, visa_number, visa_expiry, emergency_contact_name, emergency_contact_phone</span></li>
                        <li>First row must be the header row</li>
                        <li>UTF-8 encoding, comma-separated</li>
                      </ul>
                    </div>
                  </div>

                  {/* Download template */}
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 text-xs font-medium text-ts-teal hover:text-ts-teal/80 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download CSV template
                  </button>

                  {/* Drop zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                      csvFile
                        ? "border-ts-teal/60 bg-ts-teal/5"
                        : "border-ts-mid hover:border-ts-teal/40 hover:bg-ts-light"
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    {csvFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle className="w-8 h-8 text-ts-teal" />
                        <p className="text-sm font-semibold text-ts-navy">{csvFile.name}</p>
                        <p className="text-xs text-ts-slate/60">
                          {csvPreview.length > 0
                            ? `${csvPreview.length}+ rows detected — click to change`
                            : "Click to change file"}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8 text-ts-slate/30" />
                        <p className="text-sm font-semibold text-ts-slate/60">
                          Drop CSV file here or click to browse
                        </p>
                        <p className="text-xs text-ts-slate/40">.csv files only</p>
                      </div>
                    )}
                  </div>

                  {/* Validation errors */}
                  {csvErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1.5">
                      <div className="flex items-center gap-2 text-ts-alert-red mb-2">
                        <AlertCircle className="w-4 h-4" />
                        <p className="text-xs font-semibold">Validation Errors ({csvErrors.length})</p>
                      </div>
                      {csvErrors.slice(0, 5).map((err, i) => (
                        <p key={i} className="text-xs text-red-700 font-mono">{err}</p>
                      ))}
                      {csvErrors.length > 5 && (
                        <p className="text-xs text-red-500">…and {csvErrors.length - 5} more errors</p>
                      )}
                    </div>
                  )}

                  {/* Preview table */}
                  {csvPreview.length > 0 && csvErrors.length === 0 && (
                    <div>
                      <p className="text-xs font-semibold text-ts-slate/60 uppercase tracking-wider mb-2">
                        Preview (first {csvPreview.length} rows)
                      </p>
                      <div className="overflow-x-auto rounded-xl border border-ts-mid">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-ts-light">
                              <th className="px-3 py-2 text-left font-semibold text-ts-slate">Name</th>
                              <th className="px-3 py-2 text-left font-semibold text-ts-slate">Nationality</th>
                              <th className="px-3 py-2 text-left font-semibold text-ts-slate">Passport</th>
                              <th className="px-3 py-2 text-left font-semibold text-ts-slate">Email</th>
                            </tr>
                          </thead>
                          <tbody>
                            {csvPreview.map((row, i) => (
                              <tr key={i} className="border-t border-ts-mid/50">
                                <td className="px-3 py-2 font-medium text-ts-navy">{row.full_name}</td>
                                <td className="px-3 py-2 text-ts-slate/70">{row.nationality}</td>
                                <td className="px-3 py-2 font-mono text-ts-slate/70">{row.passport_number}</td>
                                <td className="px-3 py-2 text-ts-slate/70">{row.email || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Import result */}
                  {importResult && (
                    <div
                      className={cn(
                        "rounded-xl p-4 flex items-start gap-3",
                        importResult.failed === 0
                          ? "bg-green-50 border border-green-200"
                          : "bg-yellow-50 border border-yellow-200"
                      )}
                    >
                      <CheckCircle
                        className={cn(
                          "w-5 h-5 flex-shrink-0 mt-0.5",
                          importResult.failed === 0 ? "text-ts-green" : "text-yellow-600"
                        )}
                      />
                      <div>
                        <p className="text-sm font-semibold text-ts-navy">
                          Import Complete
                        </p>
                        <p className="text-xs text-ts-slate/70 mt-0.5">
                          {importResult.imported} tourist{importResult.imported !== 1 ? "s" : ""} imported
                          {importResult.failed > 0 && `, ${importResult.failed} failed`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-ts-mid flex-shrink-0">
              <button
                onClick={handleClose}
                disabled={submitting || importing}
                className="px-4 py-2 text-sm font-medium text-ts-slate border border-ts-mid rounded-lg hover:bg-ts-light transition-colors disabled:opacity-50"
              >
                {importResult?.failed === 0 && mode === "csv" ? "Close" : "Cancel"}
              </button>
              {mode === "single" ? (
                <button
                  type="submit"
                  form="add-tourist-form"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 bg-ts-navy text-white text-sm font-semibold rounded-lg hover:bg-ts-navy/90 transition-colors disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Adding…
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Add Tourist
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleCSVImport}
                  disabled={!csvFile || csvErrors.length > 0 || importing || !!importResult}
                  className="flex items-center gap-2 px-5 py-2 bg-ts-navy text-white text-sm font-semibold rounded-lg hover:bg-ts-navy/90 transition-colors disabled:opacity-50"
                >
                  {importing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Importing…
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Import {csvPreview.length > 0 ? `(${csvPreview.length}+ rows)` : "CSV"}
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
}

function Field({ label, value, onChange, error, placeholder, type = "text" }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-ts-slate mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ts-teal/30",
          error ? "border-ts-alert-red bg-red-50" : "border-ts-mid"
        )}
      />
      {error && <p className="text-xs text-ts-alert-red mt-0.5">{error}</p>}
    </div>
  );
}
