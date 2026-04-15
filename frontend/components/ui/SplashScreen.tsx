"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert } from "lucide-react";

export default function SplashScreen({
  onFinish,
}: {
  onFinish?: () => void;
}) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        if (onFinish) {
          onFinish();
        } else {
          router.replace("/auth/login");
        }
      }, 600);
    }, 2200);
    return () => clearTimeout(t);
  }, [onFinish, router]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ts-navy"
        >
          {/* Logo mark */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
            className="w-24 h-24 bg-ts-saffron rounded-3xl flex items-center justify-center shadow-2xl mb-6"
          >
            <ShieldAlert className="w-14 h-14 text-white" />
          </motion.div>

          {/* Brand name */}
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-4xl font-extrabold text-white tracking-tight"
          >
            TourSafe
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
            className="mt-2 text-white/50 text-sm"
          >
            Smart Tourist Safety System
          </motion.p>

          {/* Pulse ring */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [0.8, 1.6, 0.8], opacity: [0.4, 0, 0.4] }}
            transition={{ repeat: Infinity, duration: 2, delay: 0.8 }}
            className="absolute w-36 h-36 rounded-full border-2 border-ts-saffron/40"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
