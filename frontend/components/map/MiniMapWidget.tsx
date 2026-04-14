"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin } from "lucide-react";

const MiniMapInner = dynamic(
  () => import("@/components/map/MiniMapClient"),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 bg-[#1a293d] rounded-xl flex items-center justify-center">
        <Skeleton className="w-8 h-8 rounded-full bg-white/10" />
      </div>
    ),
  }
);

export function MiniMapWidget() {
  return (
    <div className="bg-white rounded-xl border border-ts-mid shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-ts-mid">
        <MapPin className="w-4 h-4 text-ts-navy" />
        <h3 className="font-semibold text-ts-navy text-sm">Live Map Preview</h3>
      </div>
      <div className="h-48 map-panel rounded-none border-0">
        <MiniMapInner />
      </div>
    </div>
  );
}
