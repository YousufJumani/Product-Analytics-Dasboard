/**
 * Job Queue API — GET /api/jobs (list or cron worker) | POST /api/jobs (enqueue or manual worker)
 *
 * GET  /api/jobs → list recent jobs for the org (all roles)
 * GET  /api/jobs → process next pending job when called by Vercel Cron
 * POST /api/jobs → enqueue from the UI or process next pending job manually
 *
 * CONCEPT — The Cron Worker Pattern:
 *  In serverless environments, long-running background processes don't exist.
 *  Instead, we use a cron-triggered HTTP endpoint as our "worker":
 *
 *  1. Vercel Cron calls GET /api/jobs every N minutes
 *  2. The handler picks one PENDING job, marks it RUNNING
 *  3. Executes the job handler function
 *  4. Marks it COMPLETED or FAILED (with retry logic)
 *
 *  This is a well-known pattern called "Transactional Outbox" / "Job Table".
 *  It's used by Rails (Solid Queue), Laravel (Horizon), and Django (Celery
 *  with DB broker).
 *
 * VERCEL CRON: Configured in vercel.json. When CRON_SECRET is configured,
 * Vercel sends Authorization: Bearer <secret> and the handler verifies it.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getJobStats, getNextPendingJob, markJobCompleted, markJobFailed, markJobRunning } from "@/lib/queue";
import { invalidatePrefix } from "@/lib/cache";
import { log } from "@/lib/logger";
import { calculateCurrentMrr } from "@/lib/stripe";

export const dynamic = "force-dynamic";

function getDemoJobStats() {
  const now = Date.now();
  return {
    counts: [
      { status: "COMPLETED", _count: { status: 18 } },
      { status: "RUNNING", _count: { status: 1 } },
      { status: "PENDING", _count: { status: 4 } },
      { status: "FAILED", _count: { status: 2 } },
      { status: "CANCELLED", _count: { status: 1 } },
    ],
    recent: [
      {
        id: "demo-job-1",
        type: "STRIPE_SYNC",
        status: "COMPLETED",
        attempts: 1,
        scheduledAt: new Date(now - 15 * 60000).toISOString(),
        startedAt: new Date(now - 14 * 60000).toISOString(),
        completedAt: new Date(now - 13 * 60000).toISOString(),
        errorMsg: null,
        result: { mrr: 22400 },
      },
      {
        id: "demo-job-2",
        type: "GITHUB_SYNC",
        status: "RUNNING",
        attempts: 2,
        scheduledAt: new Date(now - 6 * 60000).toISOString(),
        startedAt: new Date(now - 5 * 60000).toISOString(),
        completedAt: null,
        errorMsg: null,
        result: null,
      },
    ],
  };
}

function isAuthorizedCronRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

async function processNextPendingJob() {
  const job = await getNextPendingJob();
  if (!job) {
    return NextResponse.json({ processed: false, message: "No pending jobs" });
  }

  await markJobRunning(job.id);
  log.info("Processing job", { jobId: job.id, type: job.type, orgId: job.orgId });

  try {
    let result: Record<string, unknown> = {};

    switch (job.type) {
      case "STRIPE_SYNC": {
        if (process.env.STRIPE_SECRET_KEY?.startsWith("sk_")) {
          const mrrData = await calculateCurrentMrr();
          if (job.orgId) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            await prisma.metricSnapshot.upsert({
              where: { orgId_date: { orgId: job.orgId, date: today } },
              update: { mrr: mrrData.mrr, arr: mrrData.mrr * 12 },
              create: {
                orgId: job.orgId,
                date: today,
                mrr: mrrData.mrr,
                arr: mrrData.mrr * 12,
                activeUsers: mrrData.activeSubscriptions,
                trialUsers: mrrData.trialSubscriptions,
              },
            });
            invalidatePrefix(`metrics:${job.orgId}`);
          }
          result = { mrr: mrrData.mrr, subscriptions: mrrData.activeSubscriptions };
        } else {
          result = { skipped: "No Stripe key configured - using seeded data" };
        }
        break;
      }

      case "GITHUB_SYNC": {
        if (job.orgId) invalidatePrefix(`github:${job.orgId}`);
        result = { reposCacheBusted: true };
        break;
      }

      case "METRICS_ROLLUP": {
        if (job.orgId) invalidatePrefix(`metrics:${job.orgId}`);
        result = { rolledUp: true };
        break;
      }

      default:
        result = { skipped: "Unknown job type" };
    }

    await markJobCompleted(job.id, result);
    log.info("Job completed", { jobId: job.id, type: job.type, result });
    return NextResponse.json({ processed: true, jobId: job.id, result });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await markJobFailed(job.id, errorMsg);
    log.error("Job failed", { jobId: job.id, error: errorMsg });
    return NextResponse.json({ processed: false, error: errorMsg }, { status: 500 });
  }
}

// ── GET: List recent jobs for the org ───────────────────────
export async function GET(req: NextRequest) {
  const demoModeEnabled = process.env.DEMO_MODE !== "false";
  if (demoModeEnabled) {
    if (isAuthorizedCronRequest(req)) {
      return NextResponse.json({ processed: true, jobId: "demo-cron-run", result: { demo: true } });
    }
    return NextResponse.json(getDemoJobStats());
  }

  if (isAuthorizedCronRequest(req)) {
    return processNextPendingJob();
  }

  const session = await auth();
  if (!session?.user?.activeOrgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = await getJobStats(session.user.activeOrgId);
  return NextResponse.json(stats);
}

// ── POST: Enqueue a manual sync or process next job manually ─────────────
export async function POST(req: NextRequest) {
  const demoModeEnabled = process.env.DEMO_MODE !== "false";
  if (demoModeEnabled) {
    const body = await req.json().catch(() => null);
    if (body?.type) {
      return NextResponse.json({ queued: true, jobId: `demo-${body.type.toLowerCase()}` }, { status: 202 });
    }
    return NextResponse.json({ processed: true, jobId: "demo-manual-run", result: { demo: true } });
  }

  const session = await auth();

  if (!session?.user?.activeOrgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  // Manual enqueue path from the UI
  if (session?.user?.activeOrgId && body?.type) {
    const job = await prisma.job.create({
      data: {
        type: body.type,
        orgId: session.user.activeOrgId,
        payload: body.payload ?? {},
      },
    });

    return NextResponse.json({ queued: true, jobId: job.id }, { status: 202 });
  }

  return processNextPendingJob();
}
