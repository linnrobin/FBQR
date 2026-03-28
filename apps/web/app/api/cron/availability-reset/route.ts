/**
 * GET /api/cron/availability-reset
 * Availability reset cron — runs daily at 00:05 WIB (17:05 UTC).
 * Schedule: vercel.json { "path": "/api/cron/availability-reset", "schedule": "5 17 * * *" }
 *
 * Resets menu items that were manually marked unavailable (e.g. "sold out today")
 * back to available at the start of each new day.
 *
 * Only affects items where:
 *   - autoResetAvailability = true (merchant opted in)
 *   - isAvailable = false (currently unavailable)
 *   - stockCount IS NULL (stockCount-based items are excluded — stock is ground truth)
 *
 * STEP 1 — Reset available items
 * STEP 2 — Log run to CronRunLog
 *
 * Spec: docs/platform-owner.md § autoResetAvailability Cron Specification
 */
import { validateCronSecret, unauthorizedCronResponse } from "@/lib/cron";
import { prisma } from "@repo/database";

export async function GET(req: Request) {
  if (!validateCronSecret(req)) return unauthorizedCronResponse();

  const startedAt = new Date();

  try {
    // ── STEP 1: Reset unavailable items with autoResetAvailability ────────────
    // Constraint: stockCount IS NULL — autoResetAvailability is mutually exclusive
    // with stockCount (stock-managed items use stockCount as ground truth, not this flag)
    const result = await prisma.menuItem.updateMany({
      where: {
        autoResetAvailability: true,
        isAvailable: false,
        stockCount: null,
      },
      data: { isAvailable: true },
    });

    const affectedRows = result.count;

    // ── STEP 2: Log run ───────────────────────────────────────────────────────
    await prisma.cronRunLog.create({
      data: {
        jobName: "availability-reset",
        startedAt,
        completedAt: new Date(),
        status: "SUCCESS",
        affectedRows,
      },
    });

    return Response.json({ ok: true, affectedRows });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[availability-reset-cron] error:", errorMessage);

    await prisma.cronRunLog
      .create({
        data: {
          jobName: "availability-reset",
          startedAt,
          completedAt: new Date(),
          status: "FAILED",
          affectedRows: 0,
          errorMessage,
        },
      })
      .catch(() => {});

    return Response.json(
      { error: "CRON_FAILED", message: errorMessage },
      { status: 500 }
    );
  }
}
