/**
 * Prisma Seed — creates a demo organization with seeded metrics.
 * Run: npm run db:seed
 *
 * CONCEPT: Seeding lets recruiters, interviewers, and demo users see the
 * dashboard fully populated without connecting real APIs. It's essential
 * for a portfolio project — never make reviewers hunt for data.
 */

import { PrismaClient, OrgRole, JobType, JobStatus, ChatRole } from "@prisma/client";
import { hash } from "bcryptjs";
import { subDays, startOfDay } from "date-fns";

const prisma = new PrismaClient();

// ─── Deterministic demo data helpers ────────────────────────

function gaussianRandom(mean: number, std: number) {
  // Box-Muller transform for realistic-looking variance
  const u = 1 - Math.random();
  const v = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

async function main() {
  console.log("🌱 Seeding database...");

  // ── Demo admin user ──────────────────────────────────────
  const adminPassword = await hash("demo1234", 12);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      email: "admin@demo.com",
      name: "Alex Rivera",
      password: adminPassword,
      emailVerified: new Date(),
      image: "https://avatars.githubusercontent.com/u/1?v=4",
    },
  });

  const analystUser = await prisma.user.upsert({
    where: { email: "analyst@demo.com" },
    update: {},
    create: {
      email: "analyst@demo.com",
      name: "Sam Chen",
      password: await hash("demo1234", 12),
      emailVerified: new Date(),
    },
  });

  const viewerUser = await prisma.user.upsert({
    where: { email: "viewer@demo.com" },
    update: {},
    create: {
      email: "viewer@demo.com",
      name: "Jordan Lee",
      password: await hash("demo1234", 12),
      emailVerified: new Date(),
    },
  });

  // ── Demo Organization ────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: "acme-saas" },
    update: {},
    create: {
      name: "Acme SaaS",
      slug: "acme-saas",
      plan: "PRO",
    },
  });

  // ── Memberships (RBAC) ───────────────────────────────────
  await prisma.orgMember.upsert({
    where: { userId_orgId: { userId: adminUser.id, orgId: org.id } },
    update: {},
    create: { userId: adminUser.id, orgId: org.id, role: OrgRole.ORG_ADMIN },
  });

  await prisma.orgMember.upsert({
    where: { userId_orgId: { userId: analystUser.id, orgId: org.id } },
    update: {},
    create: { userId: analystUser.id, orgId: org.id, role: OrgRole.ANALYST },
  });

  await prisma.orgMember.upsert({
    where: { userId_orgId: { userId: viewerUser.id, orgId: org.id } },
    update: {},
    create: { userId: viewerUser.id, orgId: org.id, role: OrgRole.VIEWER },
  });

  // ── Integrations ─────────────────────────────────────────
  await prisma.integration.upsert({
    where: { orgId_provider: { orgId: org.id, provider: "STRIPE" } },
    update: {},
    create: {
      orgId: org.id,
      provider: "STRIPE",
      status: "ACTIVE",
      externalId: "acct_demo_stripe",
      lastSyncAt: new Date(),
      metadata: { currency: "usd", country: "US" },
    },
  });

  await prisma.integration.upsert({
    where: { orgId_provider: { orgId: org.id, provider: "GITHUB" } },
    update: {},
    create: {
      orgId: org.id,
      provider: "GITHUB",
      status: "ACTIVE",
      externalId: "acme-saas",
      lastSyncAt: new Date(),
      metadata: { org: "acme-saas", repos: ["backend", "frontend", "infra"] },
    },
  });

  // ── 90 days of metric snapshots ──────────────────────────
  console.log("  📊 Inserting 90-day metric history...");

  let baseMrr = 18000;
  let baseUsers = 420;

  for (let i = 89; i >= 0; i--) {
    const date = startOfDay(subDays(new Date(), i));

    // Simulate realistic SaaS growth with weekly cycles
    const dayOfWeek = date.getDay();
    const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.6 : 1;

    const newMrr = Math.max(0, gaussianRandom(320, 80) * weekendFactor);
    const churnedMrr = Math.max(0, gaussianRandom(110, 40) * weekendFactor);
    const expansionMrr = Math.max(0, gaussianRandom(90, 30) * weekendFactor);

    baseMrr = baseMrr + newMrr - churnedMrr + expansionMrr;
    const arr = baseMrr * 12;

    const newUsers = Math.max(0, Math.round(gaussianRandom(14, 4) * weekendFactor));
    const churnedUsers = Math.max(0, Math.round(gaussianRandom(4, 2) * weekendFactor));
    const trialUsers = Math.max(0, Math.round(gaussianRandom(22, 6) * weekendFactor));
    baseUsers = baseUsers + newUsers - churnedUsers;

    const commits = Math.max(0, Math.round(gaussianRandom(18, 8) * weekendFactor));
    const closedPRs = Math.max(0, Math.round(gaussianRandom(4, 2) * weekendFactor));
    const openPRs = Math.max(0, Math.round(gaussianRandom(6, 3)));

    await prisma.metricSnapshot.upsert({
      where: { orgId_date: { orgId: org.id, date } },
      update: {},
      create: {
        orgId: org.id,
        date,
        mrr: Math.round(baseMrr * 100) / 100,
        arr: Math.round(arr * 100) / 100,
        newMrr: Math.round(newMrr * 100) / 100,
        churnedMrr: Math.round(churnedMrr * 100) / 100,
        expansionMrr: Math.round(expansionMrr * 100) / 100,
        activeUsers: baseUsers,
        newUsers,
        churnedUsers,
        trialUsers,
        commits,
        openPRs,
        closedPRs,
      },
    });
  }

  // ── Background Job history ───────────────────────────────
  await prisma.job.createMany({
    data: [
      {
        type: JobType.STRIPE_SYNC,
        status: JobStatus.COMPLETED,
        orgId: org.id,
        completedAt: new Date(Date.now() - 1000 * 60 * 5),
        result: { synced: 142, newEvents: 3 },
      },
      {
        type: JobType.GITHUB_SYNC,
        status: JobStatus.COMPLETED,
        orgId: org.id,
        completedAt: new Date(Date.now() - 1000 * 60 * 8),
        result: { repos: 3, commits: 12 },
      },
      {
        type: JobType.METRICS_ROLLUP,
        status: JobStatus.COMPLETED,
        orgId: org.id,
        completedAt: new Date(Date.now() - 1000 * 60 * 2),
        result: { rows: 90 },
      },
    ],
    skipDuplicates: true,
  });

  // ── Starter chat messages ────────────────────────────────
  await prisma.chatMessage.createMany({
    data: [
      {
        orgId: org.id,
        userId: adminUser.id,
        role: ChatRole.USER,
        content: "Why did our churn spike last week?",
      },
      {
        orgId: org.id,
        role: ChatRole.ASSISTANT,
        content:
          "Based on your metrics, churn increased ~18% last week. The pattern aligns with the end of your free trial period (day 14). Your trial-to-paid conversion also dipped to 22%, down from 31% the prior week. Consider a targeted win-back email to trial users who didn't convert.",
      },
    ],
    skipDuplicates: true,
  });

  console.log("\n✅ Seed complete!");
  console.log("─────────────────────────────────────");
  console.log("  Demo login credentials:");
  console.log("  Admin:    admin@demo.com / demo1234");
  console.log("  Analyst:  analyst@demo.com / demo1234");
  console.log("  Viewer:   viewer@demo.com / demo1234");
  console.log("─────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
