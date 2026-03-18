/**
 * GitHub Integration Status — GET /api/integrations/github
 * GitHub Data Sync — POST /api/integrations/github/sync
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchOrgRepos, fetchRepoPRStats } from "@/lib/github";
import { withCache, invalidatePrefix } from "@/lib/cache";
import { enqueueJob } from "@/lib/queue";
import { canManageIntegrations } from "@/lib/rbac";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const demoModeEnabled = process.env.DEMO_MODE !== "false";
  if (demoModeEnabled) {
    return NextResponse.json({
      connected: true,
      repos: [
        {
          name: "analytics-web",
          stars: 214,
          forks: 39,
          openIssues: 7,
          language: "TypeScript",
          updatedAt: new Date().toISOString(),
        },
        {
          name: "billing-service",
          stars: 141,
          forks: 26,
          openIssues: 4,
          language: "Node.js",
          updatedAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          name: "mobile-sdk",
          stars: 92,
          forks: 18,
          openIssues: 5,
          language: "Kotlin",
          updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
      ],
      prStats: [
        { repo: "analytics-web", open: 6, closed: 15, merged: 12 },
        { repo: "billing-service", open: 3, closed: 8, merged: 6 },
        { repo: "mobile-sdk", open: 4, closed: 9, merged: 7 },
      ],
    });
  }

  const session = await auth();
  if (!session?.user?.activeOrgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { activeOrgId: orgId, activeOrgSlug: orgSlug } = session.user;

  const cacheKey = `github:repos:${orgId}`;
  const data = await withCache(cacheKey, async () => {
    const integration = await prisma.integration.findFirst({
      where: { orgId, provider: "GITHUB" },
    });

    if (!integration || integration.status !== "ACTIVE") {
      return { connected: false, repos: [], prStats: null };
    }

    const githubOrg = (integration.metadata as Record<string, string>)?.org ?? orgSlug ?? "";
    const repos = await fetchOrgRepos(githubOrg);

    // Fetch PR stats for top 3 repos
    const prStatsPromises = repos.slice(0, 3).map((r) =>
      fetchRepoPRStats(githubOrg, r.name).then((s) => ({ repo: r.name, ...s }))
    );
    const prStats = await Promise.allSettled(prStatsPromises).then((results) =>
      results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []))
    );

    return { connected: true, repos, prStats };
  }, 3600); // Cache GitHub data for 1 hour

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const demoModeEnabled = process.env.DEMO_MODE !== "false";
  if (demoModeEnabled) {
    return NextResponse.json({ queued: true, jobId: "demo-github-sync" }, { status: 202 });
  }

  const session = await auth();
  if (!session?.user?.activeOrgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageIntegrations(session.user.role)) {
    return NextResponse.json({ error: "Forbidden: requires ORG_ADMIN" }, { status: 403 });
  }

  const orgId = session.user.activeOrgId;
  const job = await enqueueJob("GITHUB_SYNC", orgId);
  invalidatePrefix(`github:${orgId}`);
  log.info("GitHub sync enqueued", { orgId, jobId: job.id });

  return NextResponse.json({ queued: true, jobId: job.id }, { status: 202 });
}
