// GET /api/cron/order-expiry
// Order expiry cron — runs every 5 minutes (Vercel Pro required for sub-hourly).
// vercel.json schedule: "*/5 * * * *"  (use "0 * * * *" on Hobby tier)
//
// STEP 1a — Expire timed-out PENDING orders (PAY_FIRST only; never expire cash orders)
// STEP 1b — Auto-complete READY orders past autoCompleteReadyMinutes hold period
// STEP 2  — Log run to CronRunLog
//
// Spec: docs/platform-owner.md § Order Expiry Cron Specification
import { validateCronSecret, unauthorizedCronResponse } from "@/lib/cron";
import { prisma } from "@repo/database";

export async function GET(req: Request) {
  if (!validateCronSecret(req)) return unauthorizedCronResponse();

  const startedAt = new Date();
  let affectedRows = 0;

  try {
    const now = new Date();

    // ── Load all merchant settings (paymentTimeoutMinutes, autoCompleteReadyMinutes) ──
    const allSettings = await prisma.merchantSettings.findMany({
      select: {
        restaurantId: true,
        paymentTimeoutMinutes: true,
        autoCompleteReadyMinutes: true,
      },
    });
    const settingsMap = new Map(
      allSettings.map((s) => [
        s.restaurantId,
        {
          paymentTimeoutMinutes: s.paymentTimeoutMinutes,
          autoCompleteReadyMinutes: s.autoCompleteReadyMinutes,
        },
      ])
    );

    // ── STEP 1a: Expire timed-out PENDING orders ──────────────────────────────
    const pendingOrders = await prisma.order.findMany({
      where: { status: "PENDING" },
      select: {
        id: true,
        createdAt: true,
        branch: { select: { restaurantId: true } },
        payments: {
          select: { id: true, method: true, status: true },
          take: 1,
        },
      },
    });

    for (const order of pendingOrders) {
      const payment = order.payments[0];
      // Skip cash orders — cashier must manually close them (EOD cron handles these)
      if (!payment || payment.method === "CASH") continue;

      const settings = settingsMap.get(order.branch.restaurantId);
      const timeoutMinutes = settings?.paymentTimeoutMinutes ?? 15;
      const expiryTime = new Date(
        order.createdAt.getTime() + timeoutMinutes * 60 * 1000
      );

      if (now < expiryTime) continue;

      // Atomic guard: WHERE status = 'PENDING' prevents double-expiry
      const result = await prisma.$transaction([
        prisma.order.updateMany({
          where: { id: order.id, status: "PENDING" },
          data: { status: "EXPIRED" },
        }),
        prisma.payment.updateMany({
          where: { orderId: order.id, status: "PENDING" },
          data: { status: "EXPIRED" },
        }),
      ]);

      // If first update affected 0 rows, the order was already processed (race guard)
      if (result[0].count === 0) continue;

      await prisma.$transaction([
        prisma.orderEvent.create({
          data: {
            orderId: order.id,
            fromStatus: "PENDING",
            toStatus: "EXPIRED",
            actorType: "SYSTEM",
            actorName: "System",
            note: `Payment timeout after ${timeoutMinutes} minutes`,
          },
        }),
        prisma.auditLog.create({
          data: {
            action: "UPDATE",
            entity: "Order",
            entityId: order.id,
            actorType: "SYSTEM",
            actorName: "System",
            newValue: {
              fromStatus: "PENDING",
              toStatus: "EXPIRED",
              reason: "PAYMENT_TIMEOUT",
              timeoutMinutes,
            },
          },
        }),
      ]);

      affectedRows++;
    }

    // ── STEP 1b: Auto-complete READY orders past hold period ──────────────────
    const readyOrders = await prisma.order.findMany({
      where: { status: "READY" },
      select: {
        id: true,
        readyAt: true,
        updatedAt: true,
        branch: { select: { restaurantId: true } },
      },
    });

    for (const order of readyOrders) {
      const settings = settingsMap.get(order.branch.restaurantId);
      if (!settings?.autoCompleteReadyMinutes) continue;

      // Use readyAt as the hold-period start; fall back to updatedAt for legacy rows
      const holdStart = order.readyAt ?? order.updatedAt;
      const completeTime = new Date(
        holdStart.getTime() + settings.autoCompleteReadyMinutes * 60 * 1000
      );

      if (now < completeTime) continue;

      const result = await prisma.order.updateMany({
        where: { id: order.id, status: "READY" },
        data: { status: "COMPLETED" },
      });

      if (result.count === 0) continue; // Already processed

      await prisma.$transaction([
        prisma.orderEvent.create({
          data: {
            orderId: order.id,
            fromStatus: "READY",
            toStatus: "COMPLETED",
            actorType: "SYSTEM",
            actorName: "System",
            note: `Auto-completed after ${settings.autoCompleteReadyMinutes} minute hold period`,
          },
        }),
        prisma.auditLog.create({
          data: {
            action: "UPDATE",
            entity: "Order",
            entityId: order.id,
            actorType: "SYSTEM",
            actorName: "System",
            newValue: {
              fromStatus: "READY",
              toStatus: "COMPLETED",
              reason: "AUTO_COMPLETE",
              autoCompleteReadyMinutes: settings.autoCompleteReadyMinutes,
            },
          },
        }),
      ]);

      affectedRows++;
    }

    // ── STEP 2: Log run ───────────────────────────────────────────────────────
    await prisma.cronRunLog.create({
      data: {
        jobName: "order-expiry",
        startedAt,
        completedAt: new Date(),
        status: "SUCCESS",
        affectedRows,
      },
    });

    return Response.json({ ok: true, affectedRows });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[order-expiry-cron] error:", errorMessage);

    await prisma.cronRunLog
      .create({
        data: {
          jobName: "order-expiry",
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
