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
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            // pass intended role so callback can redirect correctly
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setGoogleLoading(false);
    }
  }

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

              {/* Divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-ts-mid" />
                <span className="text-xs text-ts-slate/40 font-medium">or</span>
                <div className="flex-1 h-px bg-ts-mid" />
              </div>

              {/* Google Sign In */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg text-sm font-semibold border border-ts-mid bg-white hover:bg-ts-light/60 transition-all text-ts-slate disabled:opacity-60"
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Continue with Google
              </button>
            </form>
          </motion.div>
        </div>

        {/* Bottom note */}
        <div className="bg-ts-light/50 border-t border-ts-mid px-6 py-3">
          <p className="text-[11px] text-ts-slate/50 text-center">
            🔒 Secured by Supabase Auth + Polygon DID verification
          </p>
        </div>

        {/* Dev bypass — only shown when NEXT_PUBLIC_DEV_BYPASS=true */}
        {process.env.NEXT_PUBLIC_DEV_BYPASS === "true" && (
          <div className="border-t border-orange-200 bg-orange-50 px-6 py-4">
            <p className="text-[11px] font-semibold text-orange-600 text-center mb-3 uppercase tracking-wide">
              ⚡ Dev Mode — Skip Auth
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.replace("/admin/dashboard")}
                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-ts-navy text-white hover:bg-ts-navy/80 transition-colors"
              >
                Enter as Admin
              </button>
              <button
                type="button"
                onClick={() => router.replace("/tourist/dashboard")}
                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-ts-teal text-white hover:bg-ts-teal/80 transition-colors"
              >
                Enter as Tourist
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
