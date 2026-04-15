"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ShieldAlert, User, Building2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function SelectRolePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function choose(role: "tourist" | "authority") {
    setSaving(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.updateUser({
        data: { role },
      });
      if (error) throw error;
      router.replace(role === "tourist" ? "/tourist/dashboard" : "/admin/dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to set role");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-ts-light flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-ts-mid shadow-lg p-8 max-w-sm w-full text-center"
      >
        {/* Logo */}
        <div className="w-14 h-14 bg-ts-navy rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7 text-ts-saffron" />
        </div>
        <h1 className="text-lg font-bold text-ts-navy mb-1">Who are you?</h1>
        <p className="text-sm text-ts-slate/60 mb-6">
          Choose how you'll be using TourSafe. This sets your access level.
        </p>

        <div className="flex flex-col gap-3">
          <button
            disabled={saving}
            onClick={() => choose("tourist")}
            className="flex items-center gap-4 p-4 rounded-xl border-2 border-ts-mid hover:border-ts-teal hover:bg-ts-teal/5 transition-all group disabled:opacity-60"
          >
            <div className="w-10 h-10 bg-ts-teal/10 rounded-xl flex items-center justify-center group-hover:bg-ts-teal/20">
              <User className="w-5 h-5 text-ts-teal" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-ts-navy text-sm">Tourist / Traveller</p>
              <p className="text-xs text-ts-slate/50">Track my trip, SOS, digital ID</p>
            </div>
          </button>

          <button
            disabled={saving}
            onClick={() => choose("authority")}
            className="flex items-center gap-4 p-4 rounded-xl border-2 border-ts-mid hover:border-ts-navy hover:bg-ts-navy/5 transition-all group disabled:opacity-60"
          >
            <div className="w-10 h-10 bg-ts-navy/10 rounded-xl flex items-center justify-center group-hover:bg-ts-navy/20">
              <Building2 className="w-5 h-5 text-ts-navy" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-ts-navy text-sm">Authority / Organisation</p>
              <p className="text-xs text-ts-slate/50">Police, travel agency, hospital</p>
            </div>
          </button>
        </div>

        {saving && (
          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-ts-slate/50">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Setting up your account…
          </div>
        )}
      </motion.div>
    </div>
  );
}
