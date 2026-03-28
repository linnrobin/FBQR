/**
 * GET /api/cron/balance-charge-alert
 * BY_WEIGHT balance charge alert cron — runs daily at 06:00 WIB (23:00 UTC).
 * Schedule: vercel.json { "path": "/api/cron/balance-charge-alert", "schedule": "0 23 * * *" }
 *
 * Detects BY_WEIGHT orders where kitchen entered a weight but cashier never
 * collected the balance charge — silent revenue loss scenario.
 *
 * This cron ONLY ALERTS — it never auto-resolves the discrepancy.
 * The merchant decides whether to pursue the customer or write it off.
 *
 * STEP 1 — Find orders with entered weight but no BALANCE_CHARGE/BALANCE_REFUND payment
 * STEP 2 — Create audit log alerts
 * STEP 3 — Log run to CronRunLog
 *
 * Spec: docs/platform-owner.md § BY_WEIGHT Uncollected Balance Charge Alert Cron
 */
import { validateCronSecret, unauthorizedCronResponse } from "@/lib/cron";
import { prisma } from "@repo/database";

export async function GET(req: Request) {
  if (!validateCronSecret(req)) return unauthorizedCronResponse();

  const startedAt = new Date();
  let affectedRows = 0;

  try {
    const now = new Date();
    // Only surface edge cases from the last 7 days — avoid resurfacing very old ones
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // ── STEP 1: Find BY_WEIGHT items with weight entered but no balance payment ─
    const uncollectedItems = await prisma.orderItem.findMany({
      where: {
        weightValue: { not: null },      // weight was entered
        needsWeighing: false,            // kitchen marked as complete
        finalLineTotal: { not: null },   // final price known
        order: {
          status: { in: ["READY", "COMPLETED"] },
          createdAt: { gte: sevenDaysAgo },
          // No BALANCE_CHARGE or BALANCE_REFUND payment in SUCCESS state
          payments: {
            none: {
              paymentType: { in: ["BALANCE_CHARGE", "BALANCE_REFUND"] },
              status: "SUCCESS",
            },
          },
        },
      },
      select: {
        id: true,
        orderId: true,
        weightValue: true,
        finalLineTotal: true,
        order: {
          select: {
            queueNumber: true,
            branchId: true,
            branch: { select: { restaurantId: true } },
            depositAmount: true,
          },
        },
      },
    });

    // ── STEP 2: Create audit log alerts ───────────────────────────────────────
    for (const item of uncollectedItems) {
      const uncollectedAmount =
        (item.finalLineTotal ?? 0) - (item.order.depositAmount ?? 0);

      // Avoid creating duplicate alerts for the same item in the same cron run
      // (In Phase 1: check if we already alerted today via AuditLog)
      const existingAlert = await prisma.auditLog.findFirst({
        where: {
          action: "ALERT",
          entity: "OrderItem",
          entityId: item.id,
          createdAt: { gte: sevenDaysAgo },
        },
        select: { id: true },
      });

      if (existingAlert) continue; // Already alerted this week

      await prisma.auditLog.create({
        data: {
          action: "ALERT",
          entity: "OrderItem",
          entityId: item.id,
          actorType: "SYSTEM",
          actorName: "System",
          newValue: {
            type: "UNCOLLECTED_BALANCE_CHARGE",
            orderItemId: item.id,
            orderId: item.orderId,
            queueNumber: item.order.queueNumber,
            branchId: item.order.branchId,
            restaurantId: item.order.branch.restaurantId,
            weightValue: item.weightValue?.toString(),
            finalLineTotal: item.finalLineTotal,
            depositAmount: item.order.depositAmount,
            uncollectedAmount,
            message: `Tagihan sisa belum dikumpulkan: Order #${item.order.queueNumber}, Rp ${uncollectedAmount.toLocaleString("id-ID")}. Hubungi pelanggan jika diperlukan.`,
          },
        },
      });

      affectedRows++;
    }

    // ── STEP 3: Log run ───────────────────────────────────────────────────────
    await prisma.cronRunLog.create({
      data: {
        jobName: "balance-charge-alert",
        startedAt,
        completedAt: new Date(),
        status: "SUCCESS",
        affectedRows,
      },
    });

    return Response.json({ ok: true, affectedRows });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[balance-charge-alert-cron] error:", errorMessage);

    await prisma.cronRunLog
      .create({
        data: {
          jobName: "balance-charge-alert",
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
