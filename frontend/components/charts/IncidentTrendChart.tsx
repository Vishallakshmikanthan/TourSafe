"use client";

import { useEffect, useState } from "react";
import { analyticsApi } from "@/lib/api";
import type { IncidentTrendPoint } from "@/types";
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
import { Activity } from "lucide-react";
import { format, parseISO } from "date-fns";

export function IncidentTrendChart() {
  const [data, setData] = useState<IncidentTrendPoint[]>([]);

  useEffect(() => {
    analyticsApi
      .getIncidentTrends(30)
      .then((r) => setData(r.data ?? []))
      .catch(() => setData([]));
  }, []);

  return (
    <div className="bg-white rounded-xl border border-ts-mid shadow-sm p-5">
      <div className="flex items-center gap-2 mb-5">
        <Activity className="w-4 h-4 text-ts-saffron" />
        <h3 className="font-semibold text-ts-navy text-sm">Incident Trends</h3>
        <span className="ml-auto text-xs text-ts-slate/50">Last 30 days</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => { try { return format(parseISO(String(v)), "dd/MM"); } catch { return String(v); } }}
            tick={{ fontSize: 11, fill: "#4A5568" }}
          />
          <YAxis tick={{ fontSize: 11, fill: "#4A5568" }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="sos" name="SOS" fill="#C53030" radius={[2, 2, 0, 0]} />
          <Bar dataKey="inactivity" name="Inactivity" fill="#FF6B00" radius={[2, 2, 0, 0]} />
          <Bar dataKey="zone_exit" name="Zone Exit" fill="#D97706" radius={[2, 2, 0, 0]} />
          <Bar dataKey="other" name="Other" fill="#0D7680" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
