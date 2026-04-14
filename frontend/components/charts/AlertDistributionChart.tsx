"use client";

import { useEffect, useState } from "react";
import { analyticsApi } from "@/lib/api";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { PieChart as PieIcon } from "lucide-react";

const COLORS = ["#C53030", "#FF6B00", "#D97706", "#046A38", "#0D7680", "#1A3C6E"];

export function AlertDistributionChart() {
  const [data, setData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    analyticsApi
      .getAlertDistribution()
      .then((r) => setData(r.data ?? []))
      .catch(() => setData([]));
  }, []);

  return (
    <div className="bg-white rounded-xl border border-ts-mid shadow-sm p-5">
      <div className="flex items-center gap-2 mb-5">
        <PieIcon className="w-4 h-4 text-ts-saffron" />
        <h3 className="font-semibold text-ts-navy text-sm">Alert Distribution</h3>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
