/**
 * NextAuth v5 Configuration
 *
 * CONCEPT — Multi-tenant Auth:
 *  - A single user can belong to multiple organizations with different roles.
 *  - We store the "active org" and role in the JWT session token.
 *  - RBAC is enforced at two levels:
 *    1. Middleware (src/middleware.ts) — blocks entire routes before rendering
 *    2. API routes — re-check role from session on every request
 *
 * WHY JWT SESSIONS over database sessions:
 *  - No DB lookup on every request — the role/orgId lives in the signed token.
 *  - Vercel edge middleware can read JWTs without a DB connection.
 *  - Tradeoff: role changes don't take effect until the user re-logs-in
 *    (token refresh). For a SaaS dashboard this is acceptable.
 *
 * PROVIDERS:
 *  - Credentials: email + bcrypt password (for demo accounts)
 *  - GitHub OAuth: real-world provider, shows OAuth implementation
 */
import NextAuth, { type DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { compareSync } from "bcryptjs";
import type { OrgRole } from "@prisma/client";
import { z } from "zod";

// Extend NextAuth types to include our custom fields
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      activeOrgId: string | null;
      activeOrgSlug: string | null;
      role: OrgRole | null;
    } & DefaultSession["user"];
  }
  interface User {
    id: string;
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type AppJWT = JWT & {
  userId?: string;
  activeOrgId?: string | null;
  activeOrgSlug?: string | null;
  role?: OrgRole | null;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [
          GitHub({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          }),
        ]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        orgSlug: { label: "Org Slug", type: "text" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user?.password) return null;
        const valid = compareSync(parsed.data.password, user.password);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ] as Provider[],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      const appToken = token as AppJWT;

      // On initial sign-in, fetch the user's first org membership
      if (user) {
        appToken.userId = user.id;
        const membership = await prisma.orgMember.findFirst({
          where: { userId: user.id },
          include: { org: true },
          orderBy: { joinedAt: "asc" },
        });
        appToken.activeOrgId = membership?.orgId ?? null;
        appToken.activeOrgSlug = membership?.org.slug ?? null;
        appToken.role = membership?.role ?? null;
      }

      // Allow client to switch active org via update() trigger
      if (trigger === "update" && session?.activeOrgSlug) {
        const membership = await prisma.orgMember.findFirst({
          where: {
            userId: appToken.userId as string,
            org: { slug: session.activeOrgSlug },
          },
          include: { org: true },
        });
        if (membership) {
          appToken.activeOrgId = membership.orgId;
          appToken.activeOrgSlug = membership.org.slug;
          appToken.role = membership.role;
        }
      }

      return appToken;
    },
    async session({ session, token }) {
      const appToken = token as AppJWT;
      session.user.id = appToken.userId as string;
      session.user.activeOrgId = appToken.activeOrgId ?? null;
      session.user.activeOrgSlug = appToken.activeOrgSlug ?? null;
      session.user.role = appToken.role ?? null;
      return session;
    },
  },
});
