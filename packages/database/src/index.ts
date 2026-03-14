import { PrismaClient } from "@prisma/client";

// Singleton pattern: prevents multiple PrismaClient instances in development
// (Next.js hot-reload creates new module instances; without this, each reload
// opens a new connection pool and exhausts the Supabase connection limit).
// See docs/architecture.md ADR-023 for connection pooling rationale.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { PrismaClient } from "@prisma/client";
export type { Prisma } from "@prisma/client";
