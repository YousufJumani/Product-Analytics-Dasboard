/**
 * Dashboard Overview Page
 * Server Component — fetches data on the server, no loading spinners for KPIs
 */
import { withCache } from "@/lib/cache";
import { subDays, startOfDay } from "date-fns";
import OverviewClient from "./OverviewClient";
import { cookies } from "next/headers";

async function getOverviewData(orgId: string) {
  const { prisma } = await import("@/lib/prisma");

  return withCache(`overview:${orgId}`, async () => {
    const since = startOfDay(subDays(new Date(), 30));
    const snapshots = await prisma.metricSnapshot.findMany({
      where: { orgId, date: { gte: since } },
      orderBy: { date: "asc" },
    });

    const recentJobs = await prisma.job.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return { snapshots, recentJobs };
  }, 120);
}

export default async function OverviewPage() {
  const demoModeEnabled = process.env.DEMO_MODE !== "false";
  const isDemoBypass = demoModeEnabled || cookies().get("demo_bypass")?.value === "1";

  if (isDemoBypass) {
    const snapshots = Array.from({ length: 7 }).map((_, idx) => ({
      date: new Date(Date.now() - (6 - idx) * 24 * 60 * 60 * 1000).toISOString(),
      mrr: 18000 + idx * 260,
      newUsers: 10 + (idx % 3),
      churnedUsers: 2 + (idx % 2),
      commits: 12 + idx,
    }));

    return (
      <OverviewClient
        summary={{
          mrr: 19560,
          arr: 234720,
          activeUsers: 487,
          trialUsers: 54,
          mrrDelta: 8.7,
          userDelta: 5.2,
          avgChurnRate: 3.1,
          netNewMrr: 1630,
        }}
        snapshots={snapshots}
        recentJobs={[]}
        role="ORG_ADMIN"
      />
    );
  }

  const { auth } = await import("@/lib/auth");
  const session = await auth();
  const activeOrgId = session?.user?.activeOrgId;

  if (!activeOrgId) return null;

  const orgId = activeOrgId as string;
  const role = session?.user?.role ?? null;
  const { snapshots, recentJobs } = await getOverviewData(orgId);

  const latest = snapshots[snapshots.length - 1];
  const prior = snapshots[0];

  const summary = latest
    ? {
        mrr: latest.mrr,
        arr: latest.arr,
        activeUsers: latest.activeUsers,
        trialUsers: latest.trialUsers,
        mrrDelta: prior?.mrr ? ((latest.mrr - prior.mrr) / prior.mrr) * 100 : 0,
        userDelta: prior?.activeUsers ? ((latest.activeUsers - prior.activeUsers) / prior.activeUsers) * 100 : 0,
        avgChurnRate:
          prior?.mrr
            ? ((snapshots.reduce((s, r) => s + r.churnedMrr, 0) / 30 / prior.mrr) * 100 * 30)
            : 0,
        netNewMrr:
          snapshots.reduce((s, r) => s + r.newMrr + r.expansionMrr - r.churnedMrr, 0),
      }
    : null;

  return (
    <OverviewClient
      summary={summary}
      snapshots={snapshots.map((s) => ({
        date: s.date.toISOString(),
        mrr: s.mrr,
        newUsers: s.newUsers,
        churnedUsers: s.churnedUsers,
        commits: s.commits,
      }))}
      recentJobs={recentJobs.map((j) => ({
        id: j.id,
        type: j.type,
        status: j.status,
        completedAt: j.completedAt?.toISOString() ?? null,
        errorMsg: j.errorMsg ?? null,
      }))}
      role={role}
    />
  );
}
