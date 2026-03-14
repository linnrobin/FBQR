/**
 * FBQR Database Seed Script
 * See docs/data-models.md § Seed Script Specification for the full spec.
 *
 * Creates (idempotently):
 * 1. First FBQRSYS SystemAdmin (from env vars)
 * 2. Demo merchant with restaurant, branch, sample menu, staff, pre-generated QR tokens (dev only)
 * 3. Default SubscriptionPlan rows (Starter, Pro, Enterprise)
 * 4. PlatformSettings singleton
 *
 * Run with: npm run db:seed (from packages/database or root)
 */

import { prisma } from "./index";

async function main() {
  console.log("🌱 Starting seed...");

  // Step 2 will implement the full seed once models exist.
  // This stub ensures the seed script compiles and can be run.
  console.log("⚠️  Seed models not yet defined — run after Step 2 (Prisma schema).");

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
