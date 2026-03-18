"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const isDemoCredential =
      ["admin@demo.com", "analyst@demo.com", "viewer@demo.com"].includes(email) &&
      password === "demo1234";

    // Deterministic local bypass for portfolio demo and e2e runs.
    if (process.env.DEMO_MODE !== "false" && isDemoCredential) {
      document.cookie = "demo_bypass=1; path=/";
      setLoading(false);
      router.push("/dashboard");
      router.refresh();
      return;
    }

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  function fillDemo(role: "admin" | "analyst" | "viewer") {
    const emails = { admin: "admin@demo.com", analyst: "analyst@demo.com", viewer: "viewer@demo.com" };
    setEmail(emails[role]);
    setPassword("demo1234");
    setError("");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Animated orb background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
          style={{
            background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
            top: "-200px",
            left: "-200px",
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-15 blur-3xl"
          style={{
            background: "radial-gradient(circle, #a78bfa 0%, transparent 70%)",
            bottom: "-100px",
            right: "-100px",
          }}
        />
      </div>

      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4 animate-pulse-glow"
            style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" fill="white" opacity="0.9" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold gradient-text">Analytics Copilot</h1>
          <p className="text-secondary-color mt-2 text-sm">AI-powered SaaS metrics for founders</p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-secondary-color">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-glass"
                placeholder="you@company.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-secondary-color">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-glass"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl text-sm text-danger"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* GitHub OAuth */}
          <div className="relative my-6">
            <div className="divider" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-3 text-xs text-muted"
              style={{ background: "var(--bg-base)" }}>
              or
            </span>
          </div>

          <button
            onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
            className="btn-ghost w-full justify-center py-3"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
            Continue with GitHub
          </button>

          {/* Demo credentials */}
          <div className="mt-6 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-xs text-muted mb-3 font-medium uppercase tracking-wide">Demo Accounts</p>
            <div className="space-y-2">
              {(["admin", "analyst", "viewer"] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => fillDemo(role)}
                  className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                >
                  <span className="text-secondary-color capitalize">{role}@demo.com</span>
                  <span className={`badge ${role === "admin" ? "badge-info" : role === "analyst" ? "badge-success" : "badge-warning"}`}>
                    {role === "admin" ? "ORG_ADMIN" : role === "analyst" ? "ANALYST" : "VIEWER"}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted mt-2">Password: demo1234 — click row to fill</p>
          </div>
        </div>
      </div>
    </div>
  );
}
