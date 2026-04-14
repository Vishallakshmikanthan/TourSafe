"use client";

import { useEffect, useState } from "react";
import { analyticsApi } from "@/lib/api";
import type { DashboardKPIs } from "@/types";
import {
  Users,
  Bell,
  Siren,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function KPICards() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);

  useEffect(() => {
    analyticsApi
      .getKPIs()
      .then((r) => setKpis(r.data))
      .catch(() => {
        // Fallback placeholder data shape for UI layout
        setKpis({
          active_tourists: 0,
          active_tourists_delta: 0,
          active_alerts: 0,
          active_alerts_delta: 0,
          sos_today: 0,
          sos_today_delta: 0,
          avg_response_time_minutes: 0,
          avg_response_time_delta: 0,
          zones_at_risk: 0,
          resolved_today: 0,
        });
      });
  }, []);

  const cards = kpis
    ? [
        {
          label: "Active Tourists",
          value: kpis.active_tourists.toLocaleString(),
          delta: kpis.active_tourists_delta,
          icon: Users,
          color: "text-ts-teal",
          bg: "bg-ts-teal/10",
        },
        {
          label: "Active Alerts",
          value: kpis.active_alerts.toLocaleString(),
          delta: kpis.active_alerts_delta,
          icon: Bell,
          color: kpis.active_alerts > 0 ? "text-ts-saffron" : "text-ts-green",
          bg:
            kpis.active_alerts > 0 ? "bg-orange-50" : "bg-green-50",
        },
        {
          label: "SOS Today",
          value: kpis.sos_today.toLocaleString(),
          delta: kpis.sos_today_delta,
          icon: Siren,
          color: kpis.sos_today > 0 ? "text-ts-alert-red" : "text-ts-green",
          bg: kpis.sos_today > 0 ? "bg-red-50" : "bg-green-50",
        },
        {
          label: "Avg Response Time",
          value: `${kpis.avg_response_time_minutes.toFixed(1)}m`,
          delta: -kpis.avg_response_time_delta,
          icon: Clock,
          color: "text-ts-navy",
          bg: "bg-ts-navy/10",
        },
      ]
    : [];

  if (!kpis) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="kpi-card animate-pulse">
            <div className="h-4 bg-ts-mid rounded w-1/2" />
            <div className="h-8 bg-ts-mid rounded w-1/3 mt-2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="kpi-card">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-ts-slate/60 uppercase tracking-wider">
              {card.label}
            </p>
            <div className={cn("p-2 rounded-lg", card.bg)}>
              <card.icon className={cn("w-4 h-4", card.color)} />
            </div>
          </div>
          <p className={cn("text-3xl font-bold mt-2", card.color)}>
            {card.value}
          </p>
          <DeltaIndicator delta={card.delta} />
        </div>
      ))}
    </div>
  );
}

function DeltaIndicator({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <p className="flex items-center gap-1 text-xs text-ts-slate/50 mt-1">
        <Minus className="w-3 h-3" />
        No change vs yesterday
      </p>
    );
  }
  const positive = delta > 0;
  return (
    <p
      className={cn(
        "flex items-center gap-1 text-xs mt-1",
        positive ? "text-ts-alert-red" : "text-ts-green"
      )}
    >
      {positive ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      {Math.abs(delta)}% vs yesterday
    </p>
  );
}
