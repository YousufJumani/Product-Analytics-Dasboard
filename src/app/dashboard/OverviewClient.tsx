"use client";

import KpiCard from "@/components/ui/KpiCard";
import MetricChart from "@/components/ui/MetricChart";
import type { OrgRole, JobType, JobStatus } from "@prisma/client";
import { format } from "date-fns";
import { clsx } from "clsx";

interface Props {
  summary: {
    mrr: number;
    arr: number;
    activeUsers: number;
    trialUsers: number;
    mrrDelta: number;
    userDelta: number;
    avgChurnRate: number;
    netNewMrr: number;
  } | null;
  snapshots: { date: string; mrr: number; newUsers: number; churnedUsers: number; commits: number }[];
  recentJobs: { id: string; type: JobType; status: JobStatus; completedAt: string | null; errorMsg: string | null }[];
  role: OrgRole | null;
}

const statusColors: Record<JobStatus, string> = {
  COMPLETED: "badge-success",
  RUNNING: "badge-info",
  PENDING: "badge-warning",
  FAILED: "badge-danger",
  CANCELLED: "badge-warning",
};

export default function OverviewClient({ summary, snapshots, recentJobs, role }: Props) {
  const fmt = (v: number) => `$${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0)}`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-secondary-color text-sm mt-1">Last 30 days — {format(new Date(), "MMMM d, yyyy")}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="MRR"
          value={summary ? fmt(summary.mrr) : "—"}
          delta={summary?.mrrDelta}
          deltaLabel="30d"
          accent="brand"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
            </svg>
          }
        />
        <KpiCard
          label="ARR"
          value={summary ? fmt(summary.arr) : "—"}
          accent="success"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
          }
        />
        <KpiCard
          label="Active Users"
          value={summary ? summary.activeUsers.toLocaleString() : "—"}
          delta={summary?.userDelta}
          deltaLabel="30d"
          accent="brand"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          }
        />
        <KpiCard
          label="Monthly Churn"
          value={summary ? `${summary.avgChurnRate.toFixed(1)}%` : "—"}
          accent={summary && summary.avgChurnRate > 5 ? "danger" : "success"}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={summary && summary.avgChurnRate > 5 ? "#ef4444" : "#10b981"} strokeWidth="2">
              <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
          }
        />
      </div>

      {/* MRR Chart */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-white">MRR Trend</h2>
            <p className="text-xs text-muted mt-0.5">Monthly Recurring Revenue over 30 days</p>
          </div>
          {summary && (
            <div className="text-right">
              <p className="text-xs text-muted">Net New MRR</p>
              <p className={clsx("text-sm font-semibold", summary.netNewMrr >= 0 ? "text-success" : "text-danger")}>
                {summary.netNewMrr >= 0 ? "+" : ""}{fmt(summary.netNewMrr)}
              </p>
            </div>
          )}
        </div>
        <MetricChart
          data={snapshots}
          series={[{ key: "mrr", label: "MRR", color: "#6366f1" }]}
          type="area"
          formatValue={fmt}
        />
      </div>

      {/* User Growth + Commit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-6">
          <h2 className="text-base font-semibold text-white mb-1">User Growth</h2>
          <p className="text-xs text-muted mb-5">New vs churned users daily</p>
          <MetricChart
            data={snapshots}
            series={[
              { key: "newUsers", label: "New", color: "#10b981" },
              { key: "churnedUsers", label: "Churned", color: "#ef4444" },
            ]}
            type="bar"
            height={220}
            formatValue={(v) => String(v)}
          />
        </div>

        <div className="glass-card p-6">
          <h2 className="text-base font-semibold text-white mb-1">Developer Activity</h2>
          <p className="text-xs text-muted mb-5">GitHub commits per day</p>
          <MetricChart
            data={snapshots}
            series={[{ key: "commits", label: "Commits", color: "#f59e0b" }]}
            type="bar"
            height={220}
            formatValue={(v) => String(v)}
          />
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Recent Background Jobs</h2>
          <a href="/dashboard/jobs" className="text-xs text-brand hover:underline">View all →</a>
        </div>
        <div className="space-y-2">
          {recentJobs.length === 0 && (
            <p className="text-sm text-muted py-4 text-center">No jobs yet</p>
          )}
          {recentJobs.map((job) => (
            <div key={job.id} className="flex items-center justify-between py-3 px-4 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-secondary-color">{job.type}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted">
                  {job.completedAt ? format(new Date(job.completedAt), "HH:mm") : "—"}
                </span>
                <span className={`badge ${statusColors[job.status]}`}>{job.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Viewer notice for Copilot */}
      {role === "VIEWER" && (
        <div className="glass-card p-5"
          style={{ border: "1px solid rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.06)" }}>
          <p className="text-warning text-sm font-medium">🔒 VIEWER role</p>
          <p className="text-sm text-muted mt-1">
            You can view all dashboards but cannot use the AI Copilot or trigger integrations.
            Ask an ORG_ADMIN to upgrade your role for full access.
          </p>
        </div>
      )}
    </div>
  );
}
