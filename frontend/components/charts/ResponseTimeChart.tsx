"use client";

import { useEffect, useState } from "react";
import { analyticsApi } from "@/lib/api";
import type { ResponseTimeDataPoint } from "@/types";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Clock } from "lucide-react";
import { format, parseISO } from "date-fns";

export function ResponseTimeChart() {
  const [data, setData] = useState<ResponseTimeDataPoint[]>([]);

  useEffect(() => {
    analyticsApi
      .getResponseTimes(30)
      .then((r) => setData(r.data ?? []))
      .catch(() => setData([]));
  }, []);

  return (
    <div className="bg-white rounded-xl border border-ts-mid shadow-sm p-5">
      <div className="flex items-center gap-2 mb-5">
        <Clock className="w-4 h-4 text-ts-teal" />
        <h3 className="font-semibold text-ts-navy text-sm">Response Time Trend</h3>
        <span className="ml-auto text-xs text-ts-slate/50">Last 30 days</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="avgGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0D7680" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#0D7680" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="p95Grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#FF6B00" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => format(parseISO(v), "dd/MM")}
            tick={{ fontSize: 11, fill: "#4A5568" }}
          />
          <YAxis
            tickFormatter={(v) => `${v}m`}
            tick={{ fontSize: 11, fill: "#4A5568" }}
          />
          <Tooltip
            formatter={(value: number, name: string) => [`${value.toFixed(1)}m`, name]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area
            type="monotone"
            dataKey="avg_minutes"
            name="Avg Response"
            stroke="#0D7680"
            fill="url(#avgGrad)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="p95_minutes"
            name="P95 Response"
            stroke="#FF6B00"
            fill="url(#p95Grad)"
            strokeWidth={2}
            strokeDasharray="4 2"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
