/**
 * Prisma Client Singleton
 *
 * WHY SINGLETON: Next.js hot-reloads modules in development, which would
 * create a new PrismaClient on every reload → connection pool exhaustion.
 * We store one instance on `globalThis` so it survives module reloads.
 * In production, module cache persists for the process lifetime anyway.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
