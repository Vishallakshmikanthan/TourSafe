"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Map, AlertOctagon, CreditCard,
  User, FileText, Shield, ChevronLeft, ChevronRight,
  LogOut, Wifi, WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useSOSStore } from "@/store/sosStore";

const NAV_ITEMS = [
  { href: "/tourist/dashboard", label: "My Dashboard", icon: LayoutDashboard },
  { href: "/tourist/map", label: "My Location", icon: Map },
  { href: "/tourist/sos", label: "SOS Emergency", icon: AlertOctagon, emergency: true },
  { href: "/tourist/digital-id", label: "Digital ID", icon: CreditCard },
  { href: "/tourist/profile", label: "My Profile", icon: User },
  { href: "/tourist/incidents", label: "Incidents", icon: FileText },
];

export function TouristSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuthStore();
  const { activeEvents } = useSOSStore();
  const [collapsed, setCollapsed] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  return (
    <aside
      className={cn(
        "flex flex-col bg-ts-navy text-white h-screen transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/10">
        <div className="w-8 h-8 bg-ts-saffron rounded-lg flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="font-bold text-sm leading-tight">TourSafe</p>
            <p className="text-[10px] text-white/50">Tourist Portal</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, emergency }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? emergency
                    ? "bg-ts-alert-red text-white"
                    : "bg-white/15 text-white"
                  : emergency
                  ? "text-red-300 hover:bg-ts-alert-red/30"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", emergency && "text-red-300")} />
              {!collapsed && <span>{label}</span>}
              {!collapsed && emergency && activeEvents.length > 0 && (
                <span className="ml-auto bg-ts-alert-red text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">
                  ACTIVE
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-3">
        {!collapsed && user && (
          <div className="mb-2 px-2">
            <p className="text-xs font-medium text-white truncate">{user.name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              {online
                ? <Wifi className="w-3 h-3 text-green-400" />
                : <WifiOff className="w-3 h-3 text-red-400" />}
              <p className="text-[10px] text-white/40">{online ? "Online" : "Offline"}</p>
            </div>
          </div>
        )}
        <div className="flex gap-1">
          <button
            onClick={signOut}
            title="Sign out"
            className="flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors text-xs"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && "Sign Out"}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg text-white/40 hover:bg-white/10 hover:text-white transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
