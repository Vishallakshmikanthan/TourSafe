"use client";

import { useEffect, useState } from "react";
import { analyticsApi } from "@/lib/api";
import type { ZoneStats } from "@/types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Map } from "lucide-react";

export function ZoneStatsChart() {
  const [data, setData] = useState<ZoneStats[]>([]);

  useEffect(() => {
    analyticsApi
      .getZoneStats()
      .then((r) => setData(r.data ?? []))
      .catch(() => setData([]));
  }, []);

  return (
    <div className="bg-white rounded-xl border border-ts-mid shadow-sm p-5">
      <div className="flex items-center gap-2 mb-5">
        <Map className="w-4 h-4 text-ts-saffron" />
        <h3 className="font-semibold text-ts-navy text-sm">Zone Activity</h3>
        <span className="ml-auto text-xs text-ts-slate/50">all zones</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#4A5568" }} />
          <YAxis
            type="category"
            dataKey="zone_name"
            tick={{ fontSize: 11, fill: "#4A5568" }}
            width={75}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="tourist_count" name="Tourists" fill="#1A3C6E" radius={[0, 2, 2, 0]} />
          <Bar dataKey="alert_count" name="Alerts" fill="#C53030" radius={[0, 2, 2, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
