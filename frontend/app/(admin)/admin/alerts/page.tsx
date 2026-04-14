"use client";

import { useEffect, useState, useCallback } from "react";
import { alertApi } from "@/lib/api";
import type { Alert, AlertSeverity, AlertStatus } from "@/types";
import { cn, severityBadgeColor, formatDateTime } from "@/lib/utils";
import {
  Bell,
  Filter,
  CheckCircle,
  ChevronUp,
  ArrowUpDown,
  Siren,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useAlertStore } from "@/store/alertStore";

const severities: AlertSeverity[] = ["critical", "high", "medium", "low"];
const statuses: AlertStatus[] = ["active", "acknowledged", "resolved", "escalated"];

export default function AdminAlertsPage() {
  const { alerts, setAlerts, filter, setFilter, markRead } = useAlertStore();
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<"created_at" | "severity">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await alertApi.getAll({
        severity: filter.severity,
        type: filter.type,
        status: filter.status,
        zone_id: filter.zone_id,
        sort: sortKey,
        dir: sortDir,
        limit: 100,
      });
      setAlerts(res.data?.items ?? []);
    } catch {
      toast.error("Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, [filter, sortKey, sortDir, setAlerts]);

  useEffect(() => { load(); }, [load]);

  async function acknowledge(id: string) {
    try {
      await alertApi.acknowledge(id);
      markRead(id);
      toast.success("Alert acknowledged");
    } catch {
      toast.error("Failed to acknowledge");
    }
  }

  async function resolve(id: string) {
    try {
      await alertApi.resolve(id);
      setAlerts(alerts.map((a) => a.id === id ? { ...a, status: "resolved" } : a));
      toast.success("Alert resolved");
    } catch {
      toast.error("Failed to resolve");
    }
  }

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  return (
    <div className="p-6 space-y-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ts-navy">Alert Triage Queue</h1>
          <p className="text-sm text-ts-slate/60 mt-0.5">
            {alerts.filter((a) => a.status === "active").length} active alerts requiring attention
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-ts-navy text-white text-sm font-semibold rounded-lg hover:bg-ts-navy/90 transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-ts-slate/40" />
          <span className="text-xs text-ts-slate/60 font-medium">Filters:</span>
        </div>

        {/* Severity filter */}
        <div className="flex gap-1">
          <button
            onClick={() => setFilter({ severity: null })}
            className={cn(
              "px-2.5 py-1 text-xs rounded-full font-semibold transition-colors",
              !filter.severity
                ? "bg-ts-navy text-white"
                : "bg-ts-mid text-ts-slate hover:bg-ts-navy/10"
            )}
          >
            All
          </button>
          {severities.map((s) => (
            <button
              key={s}
              onClick={() => setFilter({ severity: filter.severity === s ? null : s })}
              className={cn(
                "px-2.5 py-1 text-xs rounded-full font-semibold transition-colors capitalize",
                filter.severity === s
                  ? severityBadgeColor(s)
                  : "bg-ts-mid text-ts-slate hover:bg-ts-navy/10"
              )}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-ts-mid" />

        {/* Status filter */}
        <div className="flex gap-1">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilter({ status: filter.status === s ? null : s })}
              className={cn(
                "px-2.5 py-1 text-xs rounded-full font-semibold transition-colors capitalize",
                filter.status === s
                  ? "bg-ts-teal text-white"
                  : "bg-ts-mid text-ts-slate hover:bg-ts-teal/10"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 bg-white rounded-xl border border-ts-mid shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1 scrollbar-thin">
          <table className="data-table">
            <thead className="sticky top-0 z-10">
              <tr>
                <th>Severity</th>
                <th>Type</th>
                <th>
                  <button
                    className="flex items-center gap-1 hover:text-ts-navy"
                    onClick={() => toggleSort("created_at")}
                  >
                    Title
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th>Tourist</th>
                <th>Zone</th>
                <th>Status</th>
                <th>Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-ts-slate/40">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading...
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-ts-slate/40">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No alerts match current filters
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className={cn(
                      "transition-colors",
                      alert.severity === "critical" && "alert-row-critical",
                      alert.severity === "high" && "alert-row-high",
                      alert.severity === "medium" && "alert-row-medium",
                      alert.severity === "low" && "alert-row-low"
                    )}
                  >
                    <td>
                      <span
                        className={cn("status-pill", severityBadgeColor(alert.severity))}
                      >
                        {alert.severity === "critical" && <Siren className="w-2.5 h-2.5" />}
                        {alert.severity}
                      </span>
                    </td>
                    <td className="text-xs capitalize font-medium">
                      {alert.type.replace("_", " ")}
                    </td>
                    <td className="max-w-xs">
                      <p className="text-xs font-semibold text-ts-navy truncate">
                        {alert.title}
                      </p>
                      <p className="text-xs text-ts-slate/60 truncate">{alert.description}</p>
                    </td>
                    <td className="text-xs">{alert.tourist?.full_name ?? "—"}</td>
                    <td className="text-xs text-ts-slate/70">{alert.zone?.name ?? "—"}</td>
                    <td>
                      <span
                        className={cn(
                          "status-pill",
                          alert.status === "active"
                            ? "bg-ts-saffron/10 text-ts-saffron"
                            : alert.status === "acknowledged"
                            ? "bg-blue-50 text-blue-700"
                            : alert.status === "resolved"
                            ? "bg-green-50 text-ts-green"
                            : "bg-purple-50 text-purple-700"
                        )}
                      >
                        {alert.status}
                      </span>
                    </td>
                    <td className="text-xs text-ts-slate/60 whitespace-nowrap">
                      {formatDateTime(alert.created_at)}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {alert.status === "active" && (
                          <button
                            onClick={() => acknowledge(alert.id)}
                            className="p-1 rounded hover:bg-ts-light text-ts-teal"
                            title="Acknowledge"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {(alert.status === "active" || alert.status === "acknowledged") && (
                          <button
                            onClick={() => resolve(alert.id)}
                            className="p-1 rounded hover:bg-ts-light text-ts-green"
                            title="Resolve"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
