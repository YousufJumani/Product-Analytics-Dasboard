"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import type { JobType, JobStatus } from "@prisma/client";

interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  attempts: number;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMsg: string | null;
  result: Record<string, unknown> | null;
}

interface JobStats {
  counts: { status: JobStatus; _count: { status: number } }[];
  recent: Job[];
}

const statusColors: Record<JobStatus, string> = {
  COMPLETED: "badge-success",
  RUNNING: "badge-info",
  PENDING: "badge-warning",
  FAILED: "badge-danger",
  CANCELLED: "badge-warning",
};

const jobTypeLabels: Record<JobType, string> = {
  STRIPE_SYNC: "Stripe Sync",
  GITHUB_SYNC: "GitHub Sync",
  METRICS_ROLLUP: "Metrics Rollup",
  EXPORT_CSV: "CSV Export",
};

export default function JobsPage() {
  const [stats, setStats] = useState<JobStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const fetchStats = useCallback(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((d) => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10_000); // Poll every 10s
    return () => clearInterval(interval);
  }, [fetchStats]);

  async function processNextJob() {
    setProcessing(true);
    try {
      const res = await fetch("/api/jobs", { method: "POST" });
      const data = await res.json();
      if (data.processed) {
        alert(`✅ Job ${data.jobId} processed successfully.`);
        fetchStats();
      } else {
        alert(data.message ?? "No pending jobs.");
      }
    } finally {
      setProcessing(false);
    }
  }

  const countByStatus = (status: JobStatus) =>
    stats?.counts.find((c) => c.status === status)?._count?.status ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Job Queue Monitor</h1>
          <p className="text-secondary-color text-sm mt-1">
            Background ETL and sync jobs — auto-refreshes every 10s
          </p>
        </div>
        <button onClick={processNextJob} disabled={processing} className="btn-primary">
          {processing ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Processing...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Process Next Job
            </>
          )}
        </button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {(["COMPLETED", "RUNNING", "PENDING", "FAILED", "CANCELLED"] as JobStatus[]).map((s) => (
          <div key={s} className="glass-card p-4">
            <p className="text-xs text-muted mb-1">{s}</p>
            <p className="text-2xl font-bold text-white">{loading ? "—" : countByStatus(s)}</p>
          </div>
        ))}
      </div>

      {/* How it works callout */}
      <div className="glass-card p-5" style={{ border: "1px solid rgba(99,102,241,0.2)" }}>
        <h3 className="text-sm font-semibold text-white mb-2">🏗️ How the Job Queue Works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-secondary-color">
          <div>
            <p className="text-brand font-medium mb-1">1. Enqueue</p>
            <p>An API call or Stripe webhook triggers enqueueJob() which INSERTs a PENDING record into the jobs table.</p>
          </div>
          <div>
            <p className="text-brand font-medium mb-1">2. Process</p>
            <p>Vercel Cron calls GET /api/jobs every 5 minutes. The worker picks the oldest PENDING job, marks it RUNNING and executes it.</p>
          </div>
          <div>
            <p className="text-brand font-medium mb-1">3. Retry</p>
            <p>On failure, exponential back-off reschedules the job (2^n minutes). After maxAttempts, it becomes FAILED and alerts.</p>
          </div>
        </div>
      </div>

      {/* Recent Jobs Table */}
      <div className="glass-card p-6">
        <h2 className="text-base font-semibold text-white mb-4">Recent Jobs</h2>
        {loading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
          </div>
        )}
        {!loading && (stats?.recent ?? []).length === 0 && (
          <p className="text-muted text-sm py-8 text-center">No jobs yet. Trigger a sync from the Integrations page.</p>
        )}
        {!loading && (stats?.recent ?? []).length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.06)]">
                  {["Type", "Status", "Attempts", "Started", "Completed", "Result"].map((h) => (
                    <th key={h} className="text-left py-3 px-3 text-xs text-muted font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats!.recent.map((job) => (
                  <tr key={job.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]">
                    <td className="py-3 px-3 font-medium text-white">
                      {jobTypeLabels[job.type]}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`badge ${statusColors[job.status]}`}>{job.status}</span>
                    </td>
                    <td className="py-3 px-3 text-muted">{job.attempts}</td>
                    <td className="py-3 px-3 text-muted text-xs">
                      {job.startedAt ? format(new Date(job.startedAt), "HH:mm:ss") : "—"}
                    </td>
                    <td className="py-3 px-3 text-muted text-xs">
                      {job.completedAt ? format(new Date(job.completedAt), "HH:mm:ss") : "—"}
                    </td>
                    <td className="py-3 px-3 text-xs max-w-xs">
                      {job.errorMsg ? (
                        <span className="text-danger truncate block">{job.errorMsg}</span>
                      ) : job.result ? (
                        <span className="text-success font-mono">{JSON.stringify(job.result)}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
