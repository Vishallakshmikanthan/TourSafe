"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const AdminMapClient = dynamic(
  () => import("@/components/map/AdminMapClient"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#1a293d] rounded-xl">
        <div className="text-center">
          <Skeleton className="w-16 h-16 rounded-full mx-auto mb-3 bg-white/10" />
          <p className="text-white/50 text-sm">Loading map...</p>
        </div>
      </div>
    ),
  }
);

export function AdminMap() {
  return <AdminMapClient />;
}
