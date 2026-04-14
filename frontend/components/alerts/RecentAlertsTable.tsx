"use client";

import { useEffect } from "react";
import { alertApi } from "@/lib/api";
import { useAlertStore } from "@/store/alertStore";
import { cn, severityBadgeColor, formatRelativeTime } from "@/lib/utils";
import { Bell, ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export function RecentAlertsTable() {
  const { alerts, setAlerts, markRead } = useAlertStore();

  useEffect(() => {
    alertApi
      .getAll({ limit: 20, status: "active" })
      .then((r) => setAlerts(r.data?.items ?? []))
      .catch(() => setAlerts([]));
  }, [setAlerts]);

  async function handleAcknowledge(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await alertApi.acknowledge(id);
      markRead(id);
      toast.success("Alert acknowledged");
    } catch {
      toast.error("Failed to acknowledge");
    }
  }

  return (
    <div className="bg-white rounded-xl border border-ts-mid shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-ts-mid">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-ts-navy" />
          <h3 className="font-semibold text-ts-navy text-sm">Recent Alerts</h3>
          {alerts.filter((a) => a.status === "active").length > 0 && (
            <span className="bg-ts-saffron text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {alerts.filter((a) => a.status === "active").length} active
            </span>
          )}
        </div>
        <Link
          href="/admin/alerts"
          className="text-xs text-ts-teal hover:underline flex items-center gap-1"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Type</th>
              <th>Description</th>
              <th>Zone</th>
              <th>Time</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {alerts.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-ts-slate/40 text-sm">
                  No active alerts
                </td>
              </tr>
            ) : (
              alerts.slice(0, 10).map((alert) => (
                <tr
                  key={alert.id}
                  className={cn(
                    "cursor-pointer",
                    alert.severity === "critical" && "alert-row-critical",
                    alert.severity === "high" && "alert-row-high",
                    alert.severity === "medium" && "alert-row-medium",
                    alert.severity === "low" && "alert-row-low"
                  )}
                >
                  <td>
                    <span
                      className={cn(
                        "status-pill",
                        severityBadgeColor(alert.severity)
                      )}
                    >
                      {alert.severity}
                    </span>
                  </td>
                  <td className="capitalize text-xs font-medium">
                    {alert.type.replace("_", " ")}
                  </td>
                  <td className="max-w-xs truncate text-xs">{alert.description}</td>
                  <td className="text-xs text-ts-slate/70">
                    {alert.zone?.name ?? "—"}
                  </td>
                  <td className="text-xs text-ts-slate/60 whitespace-nowrap">
                    {formatRelativeTime(alert.created_at)}
                  </td>
                  <td>
                    {alert.status === "active" && (
                      <button
                        onClick={(e) => handleAcknowledge(alert.id, e)}
                        className="flex items-center gap-1 text-xs text-ts-teal hover:text-ts-navy font-medium"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Ack
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
