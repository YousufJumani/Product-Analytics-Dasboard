"use client";

import { useEffect, useState } from "react";
import KpiCard from "@/components/ui/KpiCard";
import MetricChart from "@/components/ui/MetricChart";

interface MetricsData {
  snapshots: {
    date: string;
    activeUsers: number;
    newUsers: number;
    churnedUsers: number;
    trialUsers: number;
  }[];
  summary: {
    activeUsers: number;
    trialUsers: number;
    mrrGrowthPct: number;
  } | null;
}

export default function UsersPage() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [range, setRange] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/metrics?range=${range}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [range]);

  const { summary, snapshots = [] } = data ?? {};

  const totalNew = snapshots.reduce((s, r) => s + r.newUsers, 0);
  const totalChurned = snapshots.reduce((s, r) => s + r.churnedUsers, 0);
  const netGrowth = totalNew - totalChurned;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Analytics</h1>
          <p className="text-secondary-color text-sm mt-1">Growth, retention, and trial conversion</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 60, 90].map((r) => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                range === r ? "btn-primary !py-1.5" : "btn-ghost !py-1.5"
              }`}>
              {r}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active Users" value={loading ? "—" : (summary?.activeUsers ?? 0).toLocaleString()} loading={loading} accent="brand" />
        <KpiCard label="Trial Users" value={loading ? "—" : (summary?.trialUsers ?? 0).toLocaleString()} loading={loading} accent="warning" />
        <KpiCard label={`New Users (${range}d)`} value={loading ? "—" : totalNew.toLocaleString()} loading={loading} accent="success" />
        <KpiCard label="Net User Growth" value={loading ? "—" : (netGrowth >= 0 ? "+" : "") + netGrowth}
          loading={loading} accent={netGrowth >= 0 ? "success" : "danger"} />
      </div>

      {/* Active users trend */}
      <div className="glass-card p-6">
        <h2 className="text-base font-semibold text-white mb-1">Active Users Trend</h2>
        <p className="text-xs text-muted mb-5">Daily active user count</p>
        <MetricChart data={snapshots} type="area" height={280}
          series={[
            { key: "activeUsers", label: "Active", color: "#6366f1" },
            { key: "trialUsers", label: "Trial", color: "#f59e0b" },
          ]} formatValue={(v) => v.toLocaleString()} />
      </div>

      {/* New vs Churned */}
      <div className="glass-card p-6">
        <h2 className="text-base font-semibold text-white mb-1">User Flow</h2>
        <p className="text-xs text-muted mb-5">Daily new signups vs churned users</p>
        <MetricChart data={snapshots} type="bar" height={260}
          series={[
            { key: "newUsers", label: "New Signups", color: "#10b981" },
            { key: "churnedUsers", label: "Churned", color: "#ef4444" },
          ]} formatValue={(v) => String(v)} />
      </div>

      {/* Trial conversion insight */}
      <div className="glass-card p-6">
        <h2 className="text-base font-semibold text-white mb-4">Trial-to-Paid Insight</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
            <p className="text-xs text-muted mb-1">Trial Users</p>
            <p className="text-2xl font-bold text-warning">{summary?.trialUsers ?? 0}</p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
            <p className="text-xs text-muted mb-1">Active Paid</p>
            <p className="text-2xl font-bold text-success">
              {summary ? Math.max(0, (summary.activeUsers ?? 0) - (summary.trialUsers ?? 0)) : 0}
            </p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
            <p className="text-xs text-muted mb-1">Trial Rate</p>
            <p className="text-2xl font-bold text-brand">
              {summary && summary.activeUsers > 0
                ? ((summary.trialUsers / summary.activeUsers) * 100).toFixed(0) + "%"
                : "—"}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted mt-4">
          💡 Tip: Trial rates above 25% are healthy for product-led growth. Use the AI Copilot to diagnose conversion blockers.
        </p>
      </div>
    </div>
  );
}
