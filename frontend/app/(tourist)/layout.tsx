"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import {
  LayoutDashboard,
  Map,
  ShieldAlert,
  CreditCard,
  User,
  FileText,
  LogOut,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const VoiceSOS = dynamic(() => import("@/components/sos/VoiceSOS"), { ssr: false });
const SafetyCheckModal = dynamic(
  () => import("@/components/safety-check/SafetyCheckModal"),
  { ssr: false }
);

const NAV_ITEMS = [
  { href: "/tourist/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/tourist/map", icon: Map, label: "My Location" },
  { href: "/tourist/sos", icon: ShieldAlert, label: "SOS Emergency", accent: true },
  { href: "/tourist/itinerary", icon: CalendarDays, label: "My Itinerary" },
  { href: "/tourist/digital-id", icon: CreditCard, label: "Digital ID" },
  { href: "/tourist/profile", icon: User, label: "My Profile" },
  { href: "/tourist/incidents", icon: FileText, label: "Incidents" },
];

export default function TouristLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut, initializeAuth } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    initializeAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen bg-ts-light overflow-hidden">
      {/* Sidebar - CSS transition for zero-jank collapse */}
      <aside
        className={cn(
          "relative flex flex-col bg-ts-navy border-r border-white/10 shrink-0 overflow-hidden transition-[width] duration-200",
          collapsed ? "w-16" : "w-[220px]"
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-white/10 shrink-0 gap-3">
          <div className="w-8 h-8 bg-ts-saffron rounded-lg flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <span className="font-bold text-white text-sm whitespace-nowrap">TourSafe</span>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto scrollbar-thin">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm",
                  item.accent
                    ? active
                      ? "bg-ts-alert-red text-white"
                      : "bg-ts-alert-red/20 text-red-300 hover:bg-ts-alert-red/30"
                    : active
                    ? "bg-white/15 text-white"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && (
                  <span className="whitespace-nowrap">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User info + sign out */}
        <div className="border-t border-white/10 p-3">
          <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
            <div className="w-8 h-8 rounded-full bg-ts-saffron/30 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-ts-saffron">
                {user?.full_name?.charAt(0) ?? "T"}
              </span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">
                  {user?.full_name ?? "Tourist"}
                </p>
                <p className="text-xs text-white/40 truncate">{user?.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={() => signOut()}
            className={cn(
              "mt-2 flex items-center gap-2 text-white/50 hover:text-white/80 text-xs transition-colors w-full",
              collapsed ? "justify-center" : "px-1"
            )}
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-4 -right-3 w-6 h-6 bg-white border border-ts-mid rounded-full flex items-center justify-center shadow-sm z-10 hover:bg-ts-light transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5 text-ts-slate" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5 text-ts-slate" />
          )}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">{children}</main>

      {/* Global tourist components */}
      <VoiceSOS />
      <SafetyCheckModal />
    </div>
  );
}
