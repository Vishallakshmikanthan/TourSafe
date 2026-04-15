"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { safetyCheckApi } from "@/lib/api";
import type { SafetyCheck } from "@/types";
import { ShieldAlert, CheckCircle, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const POLL_INTERVAL = 30_000; // 30 seconds
const COUNTDOWN_SECONDS = 60;

export default function SafetyCheckModal() {
  const [check, setCheck] = useState<SafetyCheck | null>(null);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [responding, setResponding] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(
    (checkId: string) => {
      setCountdown(COUNTDOWN_SECONDS);
      clearCountdown();
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearCountdown();
            // Auto-escalate on timeout
            safetyCheckApi.escalate(checkId).catch(() => {});
            setCheck(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [clearCountdown]
  );

  const poll = useCallback(async () => {
    try {
      const res = await safetyCheckApi.getPending();
      const pending: SafetyCheck[] = res.data;
      if (pending.length > 0 && !check) {
        const latest = pending[0];
        setCheck(latest);
        startCountdown(latest.id);
      }
    } catch {
      // Silently ignore poll errors
    }
  }, [check, startCountdown]);

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      clearCountdown();
    };
  }, [poll, clearCountdown]);

  const respond = async (response: "safe" | "unsafe") => {
    if (!check) return;
    setResponding(true);
    try {
      await safetyCheckApi.respond(check.id, response);
    } finally {
      clearCountdown();
      setCheck(null);
      setResponding(false);
    }
  };

  return (
    <AnimatePresence>
      {check && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className="bg-white rounded-2xl max-w-xs w-full p-6 shadow-2xl text-center"
          >
            {/* Pulsing icon */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-ts-saffron/10 flex items-center justify-center relative">
              <span className="absolute inset-0 rounded-full bg-ts-saffron/20 animate-ping" />
              <ShieldAlert className="w-8 h-8 text-ts-saffron relative z-10" />
            </div>

            <h2 className="text-lg font-bold text-ts-navy mb-1">Are you safe?</h2>
            <p className="text-sm text-ts-slate/70 mb-1">
              {check.reason ?? "Your safety check has been triggered."}
            </p>
            <p className="text-xs text-ts-slate/50 mb-5">
              Authorities will be alerted automatically in{" "}
              <span className="font-bold text-ts-saffron">{countdown}s</span> if
              you don't respond.
            </p>

            {/* Countdown ring */}
            <div className="flex justify-center mb-5">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="4"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 20}`}
                    strokeDashoffset={`${2 * Math.PI * 20 * (1 - countdown / COUNTDOWN_SECONDS)}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <span className="text-xs font-bold text-ts-navy relative z-10">
                  {countdown}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                disabled={responding}
                onClick={() => respond("safe")}
                className="flex-1 flex items-center justify-center gap-2 bg-ts-green text-white px-4 py-3 rounded-xl font-semibold text-sm hover:bg-ts-green/90 disabled:opacity-60"
              >
                <CheckCircle className="w-4 h-4" />
                I'm Safe
              </button>
              <button
                disabled={responding}
                onClick={() => respond("unsafe")}
                className="flex-1 flex items-center justify-center gap-2 bg-ts-alert-red text-white px-4 py-3 rounded-xl font-semibold text-sm hover:bg-ts-alert-red/90 disabled:opacity-60"
              >
                <AlertTriangle className="w-4 h-4" />
                Need Help
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
