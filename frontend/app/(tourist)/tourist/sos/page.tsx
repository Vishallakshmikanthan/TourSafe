"use client";

import { useEffect, useCallback, useState } from "react";
import { useSosStore } from "@/store/sosStore";
import { sosApi, touristApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { ShieldAlert, Phone, CheckCircle, X, Clock, MapPin, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function SOSPage() {
  const { user } = useAuthStore();
  const {
    sosStatus,
    countdownSeconds,
    startCountdown,
    cancelCountdown,
    decrementCountdown,
    activeEvents,
  } = useSosStore();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sending, setSending] = useState(false);

  // Get GPS location on mount
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  // Keyboard shortcut CTRL+SHIFT+S
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key === "S" && sosStatus === "idle") {
        e.preventDefault();
        handleSOSPress();
      }
      if (e.key === "Escape" && sosStatus === "countdown") {
        cancelCountdown();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [sosStatus]);

  // Countdown timer
  useEffect(() => {
    if (sosStatus !== "countdown") return;
    if (countdownSeconds <= 0) {
      dispatchSOS();
      return;
    }
    const timer = setTimeout(() => decrementCountdown(), 1000);
    return () => clearTimeout(timer);
  }, [sosStatus, countdownSeconds]);

  function handleSOSPress() {
    if (sosStatus !== "idle") return;
    startCountdown();
  }

  async function dispatchSOS() {
    setSending(true);
    try {
      await sosApi.trigger({
        latitude: location?.lat ?? 0,
        longitude: location?.lng ?? 0,
        description: "Emergency SOS triggered from TourSafe app",
      });
      useSosStore.getState().setSosStatus("triggered");
      toast.error("SOS DISPATCHED — Authorities notified", { duration: 8000 });
    } catch {
      useSosStore.getState().setSosStatus("idle");
      toast.error("Failed to dispatch SOS. Call 112 directly.");
    } finally {
      setSending(false);
    }
  }

  const latestSOS = activeEvents[0];

  return (
    <div className="min-h-screen bg-ts-navy flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background pulse rings for SOS active state */}
      {(sosStatus === "triggered" || sosStatus === "countdown") && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="absolute rounded-full border-2 border-red-500/20"
              style={{
                width: `${200 + i * 120}px`,
                height: `${200 + i * 120}px`,
                animation: `ping ${1 + i * 0.3}s cubic-bezier(0,0,0.2,1) infinite`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center max-w-lg w-full">
        {/* Status banner */}
        <AnimatePresence mode="wait">
          {sosStatus === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-8 text-center"
            >
              <p className="text-white/60 text-sm mb-1">Press in case of emergency</p>
              <p className="text-xs text-white/30">Keyboard shortcut: Ctrl + Shift + S</p>
            </motion.div>
          )}
          {sosStatus === "countdown" && (
            <motion.div
              key="countdown"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="mb-8 text-center"
            >
              <p className="text-red-400 font-bold text-lg">
                Dispatching in {countdownSeconds}s…
              </p>
              <p className="text-white/50 text-sm mt-1">Press ESC or click Cancel to abort</p>
            </motion.div>
          )}
          {(sosStatus === "triggered" || sosStatus === "acknowledged") && (
            <motion.div
              key="active"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 text-center"
            >
              <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/40 text-red-400 rounded-full px-4 py-2 text-sm font-semibold mb-2">
                <AlertTriangle className="w-4 h-4" /> SOS ACTIVE
              </div>
              <p className="text-white/60 text-xs">
                {sosStatus === "acknowledged"
                  ? "Authorities acknowledged — help is on the way"
                  : "Alerting nearby authorities…"}
              </p>
            </motion.div>
          )}
          {sosStatus === "resolved" && (
            <motion.div
              key="resolved"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8 text-center"
            >
              <CheckCircle className="w-12 h-12 text-ts-green mx-auto mb-2" />
              <p className="text-white font-bold">Incident Resolved</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MAIN SOS BUTTON */}
        <motion.button
          whileHover={sosStatus === "idle" ? { scale: 1.05 } : {}}
          whileTap={sosStatus === "idle" ? { scale: 0.97 } : {}}
          onClick={handleSOSPress}
          disabled={sosStatus !== "idle" || sending}
          className={cn(
            "relative w-56 h-56 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all select-none",
            sosStatus === "idle"
              ? "bg-ts-alert-red hover:bg-red-700 cursor-pointer"
              : sosStatus === "countdown"
              ? "bg-red-700 cursor-default"
              : "bg-red-900 cursor-default opacity-80"
          )}
        >
          {sosStatus === "countdown" ? (
            <>
              <span className="text-white font-black text-7xl leading-none">{countdownSeconds}</span>
              <span className="text-white/70 text-sm mt-2">DISPATCHING</span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-16 h-16 text-white mb-2" />
              <span className="text-white font-black text-3xl tracking-widest">SOS</span>
              <span className="text-white/70 text-xs mt-1">
                {sosStatus === "idle" ? "EMERGENCY" : "ACTIVE"}
              </span>
            </>
          )}
        </motion.button>

        {/* Cancel button during countdown */}
        <AnimatePresence>
          {sosStatus === "countdown" && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={cancelCountdown}
              className="mt-6 flex items-center gap-2 text-white/60 hover:text-white border border-white/20 hover:border-white/40 px-6 py-2.5 rounded-full text-sm transition-colors"
            >
              <X className="w-4 h-4" /> Cancel
            </motion.button>
          )}
        </AnimatePresence>

        {/* Location indicator */}
        {location && (
          <div className="mt-8 flex items-center gap-2 text-white/40 text-xs">
            <MapPin className="w-3.5 h-3.5" />
            GPS: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
          </div>
        )}

        {/* Emergency numbers */}
        <div className="mt-10 grid grid-cols-3 gap-3 w-full">
          {[
            { label: "Police", number: "100" },
            { label: "Ambulance", number: "108" },
            { label: "Emergency", number: "112" },
          ].map((c) => (
            <a
              key={c.label}
              href={`tel:${c.number}`}
              className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 text-center transition-colors"
            >
              <Phone className="w-4 h-4 text-white/50 mx-auto mb-1" />
              <p className="text-white/80 font-bold text-sm">{c.number}</p>
              <p className="text-white/40 text-xs">{c.label}</p>
            </a>
          ))}
        </div>

        {/* Active SOS status */}
        {latestSOS && sosStatus !== "idle" && (
          <div className="mt-6 w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-white/50" />
              <span className="text-white/60 text-xs">SOS Reference: {(latestSOS.id ?? latestSOS.incident_id).slice(0, 8).toUpperCase()}</span>
            </div>
            <p className="text-white/80 text-xs">
              Status: <span className="font-semibold text-ts-saffron">{latestSOS.status}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
