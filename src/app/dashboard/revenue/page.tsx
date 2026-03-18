"use client";

import { useEffect, useState } from "react";
import KpiCard from "@/components/ui/KpiCard";
import MetricChart from "@/components/ui/MetricChart";

interface MetricsData {
  snapshots: {
    date: string;
    mrr: number;
    arr: number;
    newMrr: number;
    churnedMrr: number;
    expansionMrr: number;
  }[];
  summary: {
    currentMrr: number;
    currentArr: number;
    totalNewMrr: number;
    totalChurnedMrr: number;
    totalExpansionMrr: number;
    netNewMrr: number;
    mrrGrowthPct: number;
    avgMonthlyChurnRatePct: number;
  } | null;
}

const fmt = (v: number) => `$${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0)}`;

export default function RevenuePage() {
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Revenue Analytics</h1>
          <p className="text-secondary-color text-sm mt-1">MRR, ARR, churn, and expansion metrics</p>
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

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Current MRR" value={loading ? "—" : fmt(summary?.currentMrr ?? 0)}
          delta={loading ? undefined : summary?.mrrGrowthPct} deltaLabel={`${range}d growth`} accent="brand" loading={loading} />
        <KpiCard label="ARR Run Rate" value={loading ? "—" : fmt(summary?.currentArr ?? 0)} accent="success" loading={loading} />
        <KpiCard label="Net New MRR" value={loading ? "—" : fmt(summary?.netNewMrr ?? 0)}
          accent={summary && summary.netNewMrr >= 0 ? "success" : "danger"} loading={loading} />
        <KpiCard label="Churn Rate" value={loading ? "—" : `${(summary?.avgMonthlyChurnRatePct ?? 0).toFixed(1)}%`}
          accent={summary && summary.avgMonthlyChurnRatePct > 5 ? "danger" : "success"} loading={loading} />
      </div>

      {/* MRR Area Chart */}
      <div className="glass-card p-6">
        <h2 className="text-base font-semibold text-white mb-1">MRR Trend</h2>
        <p className="text-xs text-muted mb-5">Cumulative monthly recurring revenue</p>
        <MetricChart data={snapshots} type="area" height={300}
          series={[{ key: "mrr", label: "MRR", color: "#6366f1" }]} formatValue={fmt} />
      </div>

      {/* MRR Waterfall components */}
      <div className="glass-card p-6">
        <h2 className="text-base font-semibold text-white mb-1">MRR Movement</h2>
        <p className="text-xs text-muted mb-5">New, expansion, and churned MRR daily</p>
        <MetricChart data={snapshots} type="bar" height={260}
          series={[
            { key: "newMrr", label: "New MRR", color: "#10b981" },
            { key: "expansionMrr", label: "Expansion", color: "#6366f1" },
            { key: "churnedMrr", label: "Churned", color: "#ef4444" },
          ]} formatValue={fmt} />
      </div>

      {/* Summary table */}
      {summary && (
        <div className="glass-card p-6">
          <h2 className="text-base font-semibold text-white mb-4">Period Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: "Total New MRR", value: fmt(summary.totalNewMrr), color: "text-success" },
              { label: "Total Expansion MRR", value: fmt(summary.totalExpansionMrr), color: "text-brand" },
              { label: "Total Churned MRR", value: fmt(summary.totalChurnedMrr), color: "text-danger" },
              { label: "Net New MRR", value: fmt(summary.netNewMrr), color: summary.netNewMrr >= 0 ? "text-success" : "text-danger" },
              { label: "Current ARR", value: fmt(summary.currentArr), color: "text-white" },
              { label: "Monthly Churn Rate", value: `${summary.avgMonthlyChurnRatePct.toFixed(2)}%`, color: summary.avgMonthlyChurnRatePct > 5 ? "text-danger" : "text-success" },
            ].map(({ label, value, color }) => (
              <div key={label} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                <p className="text-xs text-muted mb-1">{label}</p>
                <p className={`text-lg font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
