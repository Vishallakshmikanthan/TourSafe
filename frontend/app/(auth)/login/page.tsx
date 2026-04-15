"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Loader2, ShieldAlert, User } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Tab = "tourist" | "authority";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("authority");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpMode, setOtpMode] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (tab === "tourist" && otpMode) {
        // Tourist OTP verification
        const { error } = await supabase.auth.verifyOtp({
          email,
          token: otpCode,
          type: "email",
        });
        if (error) throw error;
        // Stamp tourist role and refresh session so middleware reads the
        // updated JWT (role="tourist") instead of a potentially stale one.
        await supabase.auth.updateUser({ data: { role: "tourist" } });
        await supabase.auth.refreshSession();
        router.replace("/tourist/dashboard");
        return;
      }

      if (tab === "tourist" && !otpMode) {
        // Tourist: send magic link / OTP
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
        setOtpMode(true);
        toast.success("OTP sent to your email");
        setLoading(false);
        return;
      }

      // Authority: email + password
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      const role = data.user?.user_metadata?.role;
      if (role === "tourist") {
        router.replace("/tourist/dashboard");
      } else {
        router.replace("/admin/dashboard");
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Authentication failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md"
    >
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Tab bar */}
        <div className="flex">
          <button
            onClick={() => { setTab("authority"); setOtpMode(false); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold border-b-2 transition-colors",
              tab === "authority"
                ? "border-ts-navy text-ts-navy bg-ts-light/50"
                : "border-transparent text-ts-slate/60 hover:text-ts-slate"
            )}
          >
            <ShieldAlert className="w-4 h-4" />
            Authority Login
          </button>
          <button
            onClick={() => { setTab("tourist"); setOtpMode(false); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold border-b-2 transition-colors",
              tab === "tourist"
                ? "border-ts-teal text-ts-teal bg-ts-light/50"
                : "border-transparent text-ts-slate/60 hover:text-ts-slate"
            )}
          >
            <User className="w-4 h-4" />
            Tourist Login
          </button>
        </div>

        <div className="p-8">
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-xl font-bold text-ts-navy mb-1">
              {tab === "authority" ? "Authority Portal" : "Tourist Access"}
            </h2>
            <p className="text-sm text-ts-slate/60 mb-6">
              {tab === "authority"
                ? "Sign in to the command center"
                : otpMode
                ? "Enter the OTP sent to your email"
                : "Enter your email to receive a one-time code"}
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              {!otpMode && (
                <div>
                  <label className="block text-xs font-semibold text-ts-slate mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ts-slate/40" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="official@toursafe.in"
                      required
                      className="w-full pl-9 pr-4 py-2.5 border border-ts-mid rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ts-teal/30 focus:border-ts-teal"
                    />
                  </div>
                </div>
              )}

              {/* Password (authority only) */}
              {tab === "authority" && !otpMode && (
                <div>
                  <label className="block text-xs font-semibold text-ts-slate mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ts-slate/40" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-9 pr-4 py-2.5 border border-ts-mid rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ts-teal/30 focus:border-ts-teal"
                    />
                  </div>
                </div>
              )}

              {/* OTP field for tourist */}
              {tab === "tourist" && otpMode && (
                <div>
                  <label className="block text-xs font-semibold text-ts-slate mb-1.5">
                    One-Time Password
                  </label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="6-digit code"
                    maxLength={6}
                    required
                    className="w-full px-4 py-2.5 border border-ts-mid rounded-lg text-sm tracking-widest text-center font-mono focus:outline-none focus:ring-2 focus:ring-ts-teal/30 focus:border-ts-teal"
                  />
                  <button
                    type="button"
                    onClick={() => setOtpMode(false)}
                    className="text-xs text-ts-teal hover:underline mt-2"
                  >
                    ← Change email
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-all",
                  tab === "authority"
                    ? "bg-ts-navy hover:bg-ts-navy/90"
                    : "bg-ts-teal hover:bg-ts-teal/90",
                  loading && "opacity-70 cursor-not-allowed"
                )}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {tab === "tourist" && !otpMode
                      ? "Send OTP"
                      : "Sign In"}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>

        {/* Bottom note */}
        <div className="bg-ts-light/50 border-t border-ts-mid px-6 py-3 space-y-1.5">
          <p className="text-[11px] text-ts-slate/50 text-center">
            🔒 Secured by Supabase Auth + Polygon DID verification
          </p>
          {tab === "tourist" && (
            <p className="text-[11px] text-ts-slate/50 text-center">
              New tourist?{" "}
              <a href="/register" className="text-ts-teal hover:underline">
                Create account
              </a>
            </p>
          )}
          {tab === "authority" && (
            <p className="text-[11px] text-ts-slate/50 text-center">
              New authority?{" "}
              <a href="/auth/register-authority" className="text-ts-teal hover:underline">
                Register organisation
              </a>
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
