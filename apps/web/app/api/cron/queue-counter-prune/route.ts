/**
 * GET /api/cron/queue-counter-prune
 * Queue counter prune cron — runs daily at 00:02 WIB (17:02 UTC).
 * Schedule: vercel.json { "path": "/api/cron/queue-counter-prune", "schedule": "2 17 * * *" }
 *
 * Prunes QueueCounter rows older than 30 days to prevent unbounded table growth.
 * At ~365 rows/branch/year, without pruning this grows indefinitely.
 * The 30-day retention window retains enough history for monthly reporting queries.
 *
 * STEP 1 — Prune QueueCounter rows older than 30 days
 * STEP 2 — Log run to CronRunLog
 *
 * Spec: docs/platform-owner.md § QueueCounter Daily Reset & Pruning Cron Specification
 */
import { validateCronSecret, unauthorizedCronResponse } from "@/lib/cron";
import { prisma } from "@repo/database";
import { subDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const WIB = "Asia/Jakarta";

export async function GET(req: Request) {
  if (!validateCronSecret(req)) return unauthorizedCronResponse();

  const startedAt = new Date();

  try {
    // Compute cutoff date in WIB — prune rows older than 30 WIB days
    const nowWib = toZonedTime(new Date(), WIB);
    const cutoffWib = subDays(nowWib, 30);
    const cutoffDate = format(cutoffWib, "yyyy-MM-dd");

    // ── STEP 1: Prune old QueueCounter rows ───────────────────────────────────
    const result = await prisma.queueCounter.deleteMany({
      where: {
        date: { lt: cutoffDate },
      },
    });

    const affectedRows = result.count;

    // ── STEP 2: Log run ───────────────────────────────────────────────────────
    await prisma.cronRunLog.create({
      data: {
        jobName: "queue-counter-prune",
        startedAt,
        completedAt: new Date(),
        status: "SUCCESS",
        affectedRows,
      },
    });

    return Response.json({ ok: true, affectedRows });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[queue-counter-prune-cron] error:", errorMessage);

    await prisma.cronRunLog
      .create({
        data: {
          jobName: "queue-counter-prune",
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
