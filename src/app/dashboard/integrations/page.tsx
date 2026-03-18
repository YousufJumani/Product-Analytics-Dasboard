"use client";

import { useEffect, useState } from "react";

interface GitHubData {
  connected: boolean;
  repos: { name: string; stars: number; forks: number; openIssues: number; language: string | null; updatedAt: string }[];
  prStats: { repo: string; open: number; closed: number; merged: number }[] | null;
}

export default function IntegrationsPage() {
  const [githubData, setGithubData] = useState<GitHubData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/integrations/github")
      .then((r) => r.json())
      .then((d) => { setGithubData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function triggerSync(provider: "github" | "stripe") {
    setSyncing(true);
    try {
      const res = await fetch(
        provider === "github" ? "/api/integrations/github" : "/api/jobs",
        { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: provider === "stripe" ? "STRIPE_SYNC" : undefined }) }
      );
      if (res.ok) alert(`${provider} sync queued! Check the Job Queue dashboard.`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Integrations</h1>
        <p className="text-secondary-color text-sm mt-1">Connected data sources for your analytics</p>
      </div>

      {/* Integration cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Stripe */}
        <div className="glass-card p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(99,91,255,0.2)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#6772e5">
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/>
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">Stripe</p>
                <p className="text-xs text-muted">Revenue & subscription data</p>
              </div>
            </div>
            <span className="badge badge-success">ACTIVE</span>
          </div>
          <p className="text-xs text-secondary-color mb-4">
            Syncs subscription events, calculates MRR/ARR, and ingests new/churned subscriber data via webhooks.
          </p>
          <div className="divider mb-4" />
          <div className="flex items-center justify-between text-xs text-muted mb-4">
            <span>Webhook endpoint</span>
            <code className="text-brand px-2 py-0.5 rounded bg-[rgba(99,102,241,0.1)] text-xs">
              /api/integrations/stripe/webhook
            </code>
          </div>
          <button onClick={() => triggerSync("stripe")} disabled={syncing}
            className="btn-ghost w-full justify-center text-xs">
            {syncing ? "Queuing..." : "⟳ Trigger Manual Sync"}
          </button>
        </div>

        {/* GitHub */}
        <div className="glass-card p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">GitHub</p>
                <p className="text-xs text-muted">Repo activity & PR stats</p>
              </div>
            </div>
            <span className={`badge ${githubData?.connected ? "badge-success" : "badge-warning"}`}>
              {loading ? "LOADING" : githubData?.connected ? "ACTIVE" : "DEMO"}
            </span>
          </div>
          <p className="text-xs text-secondary-color mb-4">
            Pulls commit frequency, PR open/merge rates, and repo health. Correlate dev velocity with growth.
          </p>
          <div className="divider mb-4" />
          <button onClick={() => triggerSync("github")} disabled={syncing}
            className="btn-ghost w-full justify-center text-xs">
            {syncing ? "Queuing..." : "⟳ Trigger Repo Sync"}
          </button>
        </div>
      </div>

      {/* GitHub Repos */}
      {!loading && githubData?.repos && githubData.repos.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-base font-semibold text-white mb-4">Repository Overview</h2>
          <div className="space-y-3">
            {githubData.repos.map((repo) => (
              <div key={repo.name} className="flex items-center justify-between py-3 px-4 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="flex items-center gap-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
                  </svg>
                  <span className="text-sm font-medium text-white">{repo.name}</span>
                  {repo.language && (
                    <span className="badge badge-info text-[10px]">{repo.language}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span>⭐ {repo.stars}</span>
                  <span>🔀 {repo.forks}</span>
                  <span>🐛 {repo.openIssues}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PR Stats */}
      {githubData?.prStats && githubData.prStats.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-base font-semibold text-white mb-4">Pull Request Health</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {githubData.prStats.map((s) => (
              <div key={s.repo} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                <p className="text-xs text-muted mb-3 font-medium">{s.repo}</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-secondary-color">Open</span>
                    <span className="text-warning font-semibold">{s.open}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-secondary-color">Merged (30d)</span>
                    <span className="text-success font-semibold">{s.merged}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-secondary-color">Closed</span>
                    <span className="text-muted">{s.closed}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Webhook setup instructions */}
      <div className="glass-card p-6" style={{ border: "1px solid rgba(99,102,241,0.2)" }}>
        <h2 className="text-base font-semibold text-white mb-2">⚙️ Setup Instructions</h2>
        <p className="text-xs text-secondary-color mb-4">
          To connect real APIs, configure the following environment variables in <code className="text-brand">.env.local</code>:
        </p>
        <div className="space-y-2 text-xs font-mono">
          {[
            "STRIPE_SECRET_KEY=sk_test_...",
            "STRIPE_WEBHOOK_SECRET=whsec_...",
            "GITHUB_TOKEN=ghp_...",
            "OPENAI_API_KEY=sk-...",
          ].map((line) => (
            <div key={line} className="px-3 py-2 rounded-lg" style={{ background: "rgba(0,0,0,0.3)" }}>
              <code className="text-brand">{line}</code>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-3">
          Without real keys, the app runs on 90-day seeded demo data — all UI features fully functional.
        </p>
      </div>
    </div>
  );
}
