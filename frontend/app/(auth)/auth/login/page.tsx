"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, Loader2, ShieldAlert, User, Info } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Tab = "tourist" | "authority";

const ADMIN_ACCOUNTS = [
  { email: "admin@toursafe.com", label: "TourSafe Admin" },
  { email: "admin@tnpol.gov.in", label: "TN Police" },
];

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("authority");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpMode, setOtpMode] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  const supabase = createClient();

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?role=tourist`,
          queryParams: { access_type: "offline", prompt: "consent" },
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
        const { error } = await supabase.auth.verifyOtp({
          email, token: otpCode, type: "email",
        });
        if (error) throw error;
        // Stamp tourist role into user_metadata so middleware can read it.
        await supabase.auth.updateUser({ data: { role: "tourist" } });
        // Force a session refresh so the NEW JWT (with role="tourist") is
        // written to the cookie before the navigation request hits middleware.
        // Without this, middleware reads the stale JWT and may redirect to /admin.
        await supabase.auth.refreshSession();
        router.replace("/tourist/dashboard");
        return;
      }
      if (tab === "tourist" && !otpMode) {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
        setOtpMode(true);
        toast.success("OTP sent to your email");
        setLoading(false);
        return;
      }
      // Authority: email + password
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const role =
        (data.user?.app_metadata?.role as string | undefined) ??
        (data.user?.user_metadata?.role as string | undefined);
      router.replace(role === "tourist" ? "/tourist/dashboard" : "/admin/dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Tab bar */}
        <div className="flex">
          <button
            onClick={() => { setTab("authority"); setOtpMode(false); setEmail(""); setPassword(""); }}
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
            onClick={() => { setTab("tourist"); setOtpMode(false); setEmail(""); setPassword(""); }}
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
          <h2 className="text-xl font-bold text-ts-navy mb-1">
            {tab === "authority" ? "Authority Portal" : "Tourist Access"}
          </h2>
          <p className="text-sm text-ts-slate/60 mb-5">
            {tab === "authority"
              ? "Sign in to the command center"
              : otpMode
              ? "Enter the OTP sent to your email"
              : "Enter your email to receive a one-time code"}
          </p>

          {/* Admin credential hint (authority only) */}
          {tab === "authority" && (
            <div className="mb-5 rounded-xl border border-ts-navy/20 bg-ts-navy/5 p-3">
              <div className="flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-ts-navy mt-0.5 shrink-0" />
                <div className="text-xs text-ts-navy/70">
                  <p className="font-semibold text-ts-navy mb-1">Demo Admin Accounts</p>
                  <div className="space-y-1">
                    {ADMIN_ACCOUNTS.map((a) => (
                      <div key={a.email} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => { setEmail(a.email); setPassword("admin@123"); }}
                          className="font-mono text-ts-teal hover:underline"
                        >
                          {a.email}
                        </button>
                        <span className="text-ts-slate/40">â€” {a.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-1.5 text-ts-slate/50">Password: <span className="font-mono text-ts-navy">admin@123</span></p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {!otpMode && (
              <div>
                <label className="block text-xs font-semibold text-ts-slate mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ts-slate/40" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={tab === "authority" ? "admin@toursafe.com" : "your@email.com"}
                    required
                    className="w-full pl-9 pr-4 py-2.5 border border-ts-mid rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ts-teal/30 focus:border-ts-teal"
                  />
                </div>
              </div>
            )}

            {tab === "authority" && !otpMode && (
              <div>
                <label className="block text-xs font-semibold text-ts-slate mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ts-slate/40" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                    required
                    className="w-full pl-9 pr-4 py-2.5 border border-ts-mid rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ts-teal/30 focus:border-ts-teal"
                  />
                </div>
              </div>
            )}

            {tab === "tourist" && otpMode && (
              <div>
                <label className="block text-xs font-semibold text-ts-slate mb-1.5">One-Time Password</label>
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
                  â† Change email
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors",
                tab === "authority" ? "bg-ts-navy hover:bg-ts-navy/90" : "bg-ts-teal hover:bg-ts-teal/90",
                loading && "opacity-70 cursor-not-allowed"
              )}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {tab === "tourist" && !otpMode ? "Send OTP" : "Sign In"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Google Sign In â€” tourists only */}
            {tab === "tourist" && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-ts-mid" />
                  <span className="text-xs text-ts-slate/40 font-medium">or</span>
                  <div className="flex-1 h-px bg-ts-mid" />
                </div>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg text-sm font-semibold border border-ts-mid bg-white hover:bg-ts-light/60 transition-colors text-ts-slate disabled:opacity-60"
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
              </>
            )}
          </form>

          {/* Register links */}
          <div className="mt-4 text-center">
            {tab === "tourist" && !otpMode && (
              <p className="text-xs text-ts-slate/50">
                New here?{" "}
                <a href="/register" className="text-ts-teal font-medium hover:underline">
                  Create tourist account
                </a>
              </p>
            )}
            {tab === "authority" && (
              <p className="text-xs text-ts-slate/50">
                New organisation?{" "}
                <a href="/auth/register-authority" className="text-ts-navy font-medium hover:underline">
                  Register authority
                </a>
              </p>
            )}
          </div>
        </div>

        <div className="bg-ts-light/50 border-t border-ts-mid px-6 py-3">
          <p className="text-[11px] text-ts-slate/50 text-center">
            ðŸ”’ Secured by Supabase Auth + Polygon DID verification
          </p>
        </div>

        {process.env.NEXT_PUBLIC_DEV_BYPASS === "true" && (
          <div className="border-t border-orange-200 bg-orange-50 px-6 py-4">
            <p className="text-[11px] font-semibold text-orange-600 text-center mb-3 uppercase tracking-wide">
              âš¡ Dev Mode â€” Skip Auth
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
    </div>
  );
}

