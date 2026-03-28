/**
 * GET /api/cron/session-cleanup
 * Session cleanup cron — runs daily at 01:00 WIB (18:00 UTC).
 * Schedule: vercel.json { "path": "/api/cron/session-cleanup", "schedule": "0 18 * * *" }
 *
 * Leak-recovery fallback only — not the primary session close mechanism.
 *
 * STEP 1  — Expire stale ACTIVE CustomerSessions past their TTL
 * STEP 1b — Update Table.status for newly expired sessions
 *            (OCCUPIED → DIRTY if enableDirtyState, else → AVAILABLE)
 * STEP 1c — Cancel abandoned BY_WEIGHT orders and initiate deposit refunds
 * STEP 2  — Resolve leaked open WaiterRequests from completed/expired sessions
 * STEP 3  — Log run to CronRunLog
 *
 * Spec: docs/platform-owner.md § Session Cleanup Cron Specification
 */
import { validateCronSecret, unauthorizedCronResponse } from "@/lib/cron";
import { prisma } from "@repo/database";

/** Call Midtrans refund API for non-CASH deposits */
async function callMidtransRefund(
  transactionId: string,
  amount: number,
  reason: string
): Promise<string | null> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return null;
  const baseUrl =
    process.env.MIDTRANS_IS_PRODUCTION === "true"
      ? "https://api.midtrans.com"
      : "https://api.sandbox.midtrans.com";
  try {
    const res = await fetch(`${baseUrl}/v2/${transactionId}/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic " + Buffer.from(`${serverKey}:`).toString("base64"),
      },
      body: JSON.stringify({ amount, reason }),
    });
    const data = (await res.json()) as { transaction_id?: string };
    return data.transaction_id ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  if (!validateCronSecret(req)) return unauthorizedCronResponse();

  const startedAt = new Date();
  let affectedRows = 0;

  try {
    const now = new Date();
    // "Just expired" window for STEP 1b/1c — only process sessions expired in last 10 minutes
    const recentWindow = new Date(now.getTime() - 10 * 60 * 1000);

    // ── STEP 1: Find and expire stale ACTIVE sessions ─────────────────────────
    const staleSessions = await prisma.customerSession.findMany({
      where: {
        status: "ACTIVE",
        expiresAt: { lt: now },
      },
      select: {
        id: true,
        tableId: true,
        branchId: true,
        restaurantId: true,
      },
    });

    if (staleSessions.length > 0) {
      await prisma.customerSession.updateMany({
        where: {
          id: { in: staleSessions.map((s) => s.id) },
          status: "ACTIVE", // extra guard
        },
        data: { status: "EXPIRED" },
      });
      affectedRows += staleSessions.length;
    }

    // ── STEP 1b: Update table statuses for newly expired sessions ─────────────
    // Load enableDirtyState per restaurant
    const allSettings = await prisma.merchantSettings.findMany({
      select: { restaurantId: true, enableDirtyState: true },
    });
    const dirtyStateMap = new Map(
      allSettings.map((s) => [s.restaurantId, s.enableDirtyState])
    );

    for (const session of staleSessions) {
      const enableDirtyState = dirtyStateMap.get(session.restaurantId) ?? false;
      const newTableStatus = enableDirtyState ? "DIRTY" : "AVAILABLE";

      // Only update OCCUPIED tables — AVAILABLE/RESERVED/CLOSED are already correct
      await prisma.table.updateMany({
        where: {
          id: session.tableId,
          status: "OCCUPIED",
        },
        data: { status: newTableStatus },
      });
    }

    // ── STEP 1c: Cancel abandoned BY_WEIGHT orders (ADR-026) ──────────────────
    // Find orders in active states linked to recently expired sessions
    const recentlyExpiredSessionIds = staleSessions
      .map((s) => s.id)
      .filter((id) => {
        // We just expired all of them; all qualify for 1c
        return true;
      });

    if (recentlyExpiredSessionIds.length > 0) {
      const abandonedOrders = await prisma.order.findMany({
        where: {
          status: { in: ["CONFIRMED", "PREPARING", "READY"] },
          customerSessionId: { in: recentlyExpiredSessionIds },
        },
        select: {
          id: true,
          status: true,
          payments: {
            where: { paymentType: "DEPOSIT", status: "SUCCESS" },
            select: {
              id: true,
              amount: true,
              method: true,
              midtransTransactionId: true,
            },
          },
        },
      });

      for (const order of abandonedOrders) {
        const depositPayment = order.payments[0];
        if (!depositPayment) continue; // No deposit — not a BY_WEIGHT order

        // Cancel the order
        const cancelResult = await prisma.order.updateMany({
          where: {
            id: order.id,
            status: { in: ["CONFIRMED", "PREPARING", "READY"] },
          },
          data: { status: "CANCELLED", cancelledAt: now },
        });

        if (cancelResult.count === 0) continue; // Already cancelled

        // Initiate refund
        let refundTxId: string | null = null;
        if (
          depositPayment.method !== "CASH" &&
          depositPayment.midtransTransactionId
        ) {
          refundTxId = await callMidtransRefund(
            depositPayment.midtransTransactionId,
            depositPayment.amount,
            "Session expired with un-weighed BY_WEIGHT order"
          );
        }

        await prisma.$transaction([
          prisma.payment.create({
            data: {
              orderId: order.id,
              paymentType: "BALANCE_REFUND",
              amount: depositPayment.amount,
              currency: "IDR",
              method: depositPayment.method,
              status: "SUCCESS",
              midtransTransactionId: refundTxId ?? null,
            },
          }),
          prisma.orderEvent.create({
            data: {
              orderId: order.id,
              fromStatus: order.status as "CONFIRMED" | "PREPARING" | "READY",
              toStatus: "CANCELLED",
              actorType: "SYSTEM",
              actorName: "System",
              cancellationReason: "SYSTEM_EXPIRED",
              note: "Session expired with un-weighed item",
            },
          }),
          prisma.auditLog.create({
            data: {
              action: "CANCEL",
              entity: "Order",
              entityId: order.id,
              actorType: "SYSTEM",
              actorName: "System",
              newValue: {
                reason: "SESSION_EXPIRED_BYWEIGHT",
                depositAmount: depositPayment.amount,
                refundTxId,
              },
            },
          }),
        ]);

        affectedRows++;
      }
    }

    // ── STEP 2: Resolve leaked open WaiterRequests ────────────────────────────
    // Requests from sessions that have been closed/expired for > 1 hour
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const leakedRequests = await prisma.waiterRequest.findMany({
      where: {
        resolvedAt: null,
        table: {
          sessions: {
            some: {
              status: { in: ["EXPIRED", "COMPLETED"] },
              updatedAt: { lt: oneHourAgo },
            },
          },
        },
      },
      select: { id: true },
    });

    if (leakedRequests.length > 0) {
      await prisma.waiterRequest.updateMany({
        where: {
          id: { in: leakedRequests.map((r) => r.id) },
          resolvedAt: null,
        },
        data: { resolvedAt: now },
      });
      affectedRows += leakedRequests.length;
    }

    // ── STEP 3: Log run ───────────────────────────────────────────────────────
    await prisma.cronRunLog.create({
      data: {
        jobName: "session-cleanup",
        startedAt,
        completedAt: new Date(),
        status: "SUCCESS",
        affectedRows,
      },
    });

    return Response.json({ ok: true, affectedRows });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[session-cleanup-cron] error:", errorMessage);

    await prisma.cronRunLog
      .create({
        data: {
          jobName: "session-cleanup",
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
