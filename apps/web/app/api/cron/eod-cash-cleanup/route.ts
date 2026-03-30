/**
 * GET /api/cron/eod-cash-cleanup
 * EOD PENDING_CASH cleanup cron — runs nightly at 03:00 WIB (20:00 UTC).
 * Schedule: vercel.json { "path": "/api/cron/eod-cash-cleanup", "schedule": "0 20 * * *" }
 *
 * Safety-net fallback: batch-cancels PENDING_CASH orders not manually closed
 * by cashier via Close Register. Only cancels orders older than 12 hours
 * (never same-day orders).
 *
 * STEP 1 — Batch-cancel stale PENDING_CASH orders
 * STEP 2 — Log run to CronRunLog
 *
 * Spec: docs/platform-owner.md § EOD PENDING_CASH Cleanup Cron Specification
 */
import { validateCronSecret, unauthorizedCronResponse } from "@/lib/cron";
import { prisma } from "@repo/database";

export async function GET(req: Request) {
  if (!validateCronSecret(req)) return unauthorizedCronResponse();

  const startedAt = new Date();
  let affectedRows = 0;

  try {
    const now = new Date();
    // Safety: never cancel orders less than 12 hours old (same-day protection)
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

    // ── STEP 1: Find stale PENDING_CASH orders ────────────────────────────────
    const staleCashOrders = await prisma.order.findMany({
      where: {
        status: "PENDING",
        createdAt: { lt: twelveHoursAgo },
        payments: {
          some: {
            method: "CASH",
            status: "PENDING_CASH",
          },
        },
      },
      select: {
        id: true,
        status: true,
        items: {
          select: {
            menuItemId: true,
            quantity: true,
          },
        },
      },
    });

    for (const order of staleCashOrders) {
      // Atomic guard: WHERE status = 'PENDING' prevents double-cancellation
      const cancelResult = await prisma.order.updateMany({
        where: { id: order.id, status: "PENDING" },
        data: { status: "CANCELLED", cancelledAt: now },
      });

      if (cancelResult.count === 0) continue; // Already cancelled

      await prisma.$transaction([
        prisma.payment.updateMany({
          where: { orderId: order.id, status: "PENDING_CASH" },
          data: { status: "FAILED" },
        }),
        prisma.orderEvent.create({
          data: {
            orderId: order.id,
            fromStatus: "PENDING",
            toStatus: "CANCELLED",
            actorType: "SYSTEM",
            actorName: "System",
            cancellationReason: "SYSTEM_EXPIRED",
            note: "EOD cash cleanup — not confirmed before close of business",
          },
        }),
        prisma.auditLog.create({
          data: {
            action: "CANCEL",
            entity: "Order",
            entityId: order.id,
            actorType: "SYSTEM",
            actorName: "System",
            newValue: { reason: "EOD_CASH_CLEANUP" },
          },
        }),
      ]);

      // Restore stockCount for items with stock tracking
      for (const item of order.items) {
        await prisma.menuItem.updateMany({
          where: {
            id: item.menuItemId,
            stockCount: { not: null },
          },
          data: { stockCount: { increment: item.quantity } },
        });
      }

      affectedRows++;
    }

    // ── STEP 2: Log run ───────────────────────────────────────────────────────
    await prisma.cronRunLog.create({
      data: {
        jobName: "eod-cash-cleanup",
        startedAt,
        completedAt: new Date(),
        status: "SUCCESS",
        affectedRows,
      },
    });

    return Response.json({ ok: true, affectedRows });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[eod-cash-cleanup-cron] error:", errorMessage);

    await prisma.cronRunLog
      .create({
        data: {
          jobName: "eod-cash-cleanup",
          startedAt,
          completedAt: new Date(),
          status: "FAILED",
          affectedRows,
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
