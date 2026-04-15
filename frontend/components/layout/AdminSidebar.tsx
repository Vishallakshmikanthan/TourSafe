"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  Bell,
  Users,
  BarChart3,
  Layers,
  FileText,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAlertStore } from "@/store/alertStore";

const navItems = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/map", icon: Map, label: "Map Command Center" },
  { href: "/admin/alerts", icon: Bell, label: "Alerts" },
  { href: "/admin/tourists", icon: Users, label: "Tourists" },
  { href: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/admin/zones", icon: Layers, label: "Zone Management" },
  { href: "/admin/efir", icon: FileText, label: "E-FIR System" },
  { href: "/admin/authority-profile", icon: Building2, label: "My Organisation" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { unreadCount } = useAlertStore();

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-ts-navy text-white transition-[width] duration-200 relative",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-5 border-b border-white/10",
          collapsed && "justify-center px-2"
        )}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-ts-saffron flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div>
            <p className="font-bold text-sm leading-none">TourSafe</p>
            <p className="text-white/50 text-xs mt-0.5">Authority Portal</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                "sidebar-nav-item",
                isActive
                  ? "bg-white/20 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && (
                <span className="flex-1">{item.label}</span>
              )}
              {!collapsed && item.label === "Alerts" && unreadCount > 0 && (
                <span className="bg-ts-alert-red text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-ts-navy border border-white/20 rounded-full flex items-center justify-center text-white/70 hover:text-white z-10"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>

      {/* Bottom user area */}
      <div className={cn("border-t border-white/10 p-3", collapsed && "px-2")}>
        <div
          className={cn(
            "flex items-center gap-2",
            collapsed && "justify-center"
          )}
        >
          <div className="w-7 h-7 rounded-full bg-ts-teal flex items-center justify-center text-xs font-bold flex-shrink-0">
            A
          </div>
          {!collapsed && (
            <div className="truncate">
              <p className="text-xs font-medium truncate">Authority</p>
              <p className="text-white/50 text-xs">admin@toursafe.in</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
