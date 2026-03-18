/**
 * Health + Observability Endpoint
 * GET /api/health
 *
 * CONCEPT — Observability:
 *  A health endpoint is the most basic observability primitive. It lets:
 *  - Vercel/K8s readiness probes know the app is alive
 *  - Uptime monitors (BetterUptime, Checkly) alert on outages
 *  - Developers quickly see if the DB or cache is degraded
 *
 * We also expose cache stats so you can see hit rates in production.
 * This is "white-box monitoring" — internal metrics surfaced intentionally.
 *
 * DO NOT expose sensitive data here. This endpoint is intentionally public
 * so monitoring tools don't need auth, but it only reveals degraded/ok status.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCacheStats } from "@/lib/cache";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic"; // Never cache health checks

export async function GET() {
  const start = Date.now();
  const checks: Record<string, { status: "ok" | "degraded"; latencyMs?: number; detail?: string }> = {};

  // ── Database check ──────────────────────────────────────
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "ok", latencyMs: Date.now() - dbStart };
  } catch (e) {
    checks.database = { status: "degraded", detail: "Cannot reach database" };
    log.error("Health check: DB failed", { error: String(e) });
  }

  // ── Cache check ──────────────────────────────────────────
  try {
    const cacheStats = getCacheStats();
    checks.cache = {
      status: "ok",
      detail: `${cacheStats.keys} keys, hits: ${cacheStats.stats.hits}, misses: ${cacheStats.stats.misses}`,
    };
  } catch {
    checks.cache = { status: "degraded" };
  }

  const allOk = Object.values(checks).every((c) => c.status === "ok");
  const totalLatency = Date.now() - start;

  const body = {
    status: allOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "unknown",
    uptime: process.uptime(),
    latencyMs: totalLatency,
    checks,
  };

  return NextResponse.json(body, {
    status: allOk ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
      "X-Response-Time": `${totalLatency}ms`,
    },
  });
}
