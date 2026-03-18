/**
 * Postgres-backed Job Queue
 *
 * CONCEPT: A job queue decouples slow I/O work (API syncs, heavy aggregations)
 * from the request-response cycle. Instead of making a user wait 5 seconds for
 * a Stripe sync, we:
 *   1. INSERT a job record (fast, ~5ms)
 *   2. Return 202 Accepted immediately
 *   3. A background worker picks up the job and processes it asynchronously
 *
 * WHY POSTGRES INSTEAD OF REDIS/BULLMQ:
 *   - Zero extra infrastructure. Works on free Neon/Supabase tier.
 *   - Jobs survive process restarts (persistent by default).
 *   - RBAC and audit queries are trivial — jobs live in the same DB.
 *   - Tradeoff: polling latency (~5s) vs Redis sub-millisecond pub/sub.
 *     For dashboard syncs that run hourly, this is perfectly fine.
 *
 * WORKER MODEL: The /api/jobs route is called by a Vercel Cron
 * (configured in vercel.json). It selects PENDING jobs and runs them.
 * Max one concurrent worker per job type to avoid race conditions —
 * enforced by the RUNNING status check.
 */
import { prisma } from "@/lib/prisma";
import { JobType, JobStatus } from "@prisma/client";
import { log } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

export async function enqueueJob(
  type: JobType,
  orgId: string,
  payload?: Record<string, unknown>
) {
  const job = await prisma.job.create({
    data: {
      type,
      status: JobStatus.PENDING,
      orgId,
      payload: (payload ?? {}) as Prisma.InputJsonValue,
    },
  });
  log.info("Job enqueued", { jobId: job.id, type, orgId });
  return job;
}

export async function getNextPendingJob(type?: JobType) {
  return prisma.job.findFirst({
    where: {
      status: JobStatus.PENDING,
      ...(type ? { type } : {}),
      scheduledAt: { lte: new Date() },
    },
    orderBy: { scheduledAt: "asc" },
  });
}

export async function markJobRunning(jobId: string) {
  return prisma.job.update({
    where: { id: jobId },
    data: { status: JobStatus.RUNNING, startedAt: new Date(), attempts: { increment: 1 } },
  });
}

export async function markJobCompleted(jobId: string, result?: Record<string, unknown>) {
  return prisma.job.update({
    where: { id: jobId },
    data: {
      status: JobStatus.COMPLETED,
      completedAt: new Date(),
      result: (result ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export async function markJobFailed(jobId: string, error: string, retry = true) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return;

  const shouldRetry = retry && job.attempts < job.maxAttempts;
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: shouldRetry ? JobStatus.PENDING : JobStatus.FAILED,
      errorMsg: error,
      // Exponential back-off: next attempt at 2^attempts minutes
      scheduledAt: shouldRetry
        ? new Date(Date.now() + Math.pow(2, job.attempts) * 60_000)
        : undefined,
    },
  });

  log.warn("Job failed", { jobId, error, willRetry: shouldRetry });
}

export async function getJobStats(orgId: string) {
  const counts = await prisma.job.groupBy({
    by: ["status"],
    where: { orgId },
    _count: { status: true },
  });

  const recent = await prisma.job.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return { counts, recent };
}
