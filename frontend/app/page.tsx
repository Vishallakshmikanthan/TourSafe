"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SplashScreen from "@/components/ui/SplashScreen";

export default function HomePage() {
  const router = useRouter();
  // Show splash only once — skip it if user has already seen it this session
  const [showSplash] = useState(() => {
    if (typeof window === "undefined") return false;
    if (sessionStorage.getItem("splash_shown")) return false;
    sessionStorage.setItem("splash_shown", "1");
    return true;
  });

  useEffect(() => {
    // If no splash (returning user in same session), redirect immediately
    if (!showSplash) {
      router.replace("/auth/login");
    }
  }, [showSplash, router]);

  if (showSplash) {
    return (
      <SplashScreen
        onFinish={() => router.replace("/auth/login")}
      />
    );
  }
  return null;
}
