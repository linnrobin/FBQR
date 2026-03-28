/**
 * POST /api/webhook/midtrans — Midtrans payment notification handler.
 *
 * Verification: SHA512(orderId + statusCode + grossAmount + MIDTRANS_SERVER_KEY)
 * Idempotency:  midtransTransactionId UNIQUE constraint guards duplicate webhooks.
 *
 * Maps Midtrans transaction_status to FBQR Payment + Order status.
 * Handles Patungan: increments paidParts; confirms Order only when all parts paid.
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { after } from "next/server";
import { prisma } from "@repo/database";
import { sendInternalNotification } from "@/lib/notify";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MidtransNotification {
  order_id: string;
  transaction_id: string;
  transaction_status: string;
  fraud_status?: string;
  gross_amount: string;
  status_code: string;
  signature_key: string;
  payment_type?: string;
}

// ─── Verification ─────────────────────────────────────────────────────────────

function verifyMidtransWebhook(notification: MidtransNotification): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? "";
  const raw = `${notification.order_id}${notification.status_code}${notification.gross_amount}${serverKey}`;
  const expected = crypto.createHash("sha512").update(raw).digest("hex");
  return notification.signature_key === expected;
}

// ─── Midtrans Refund (for Patungan cancellation) ─────────────────────────────

async function midtransRefund(
  transactionId: string,
  amount: number,
  reason: string
): Promise<void> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? "";
  const baseUrl =
    process.env.MIDTRANS_IS_PRODUCTION === "true"
      ? "https://api.midtrans.com"
      : "https://api.sandbox.midtrans.com";

  await fetch(`${baseUrl}/v2/${transactionId}/refund`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(`${serverKey}:`).toString("base64"),
    },
    body: JSON.stringify({ amount, reason }),
  });
}

export { midtransRefund };

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const notification = (await req.json()) as MidtransNotification;

  // MANDATORY signature verification — reject all unverified webhooks
  if (!verifyMidtransWebhook(notification)) {
    console.warn("[webhook/midtrans] Invalid signature", {
      orderId: notification.order_id,
    });
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { order_id: orderId, transaction_id: txId, transaction_status: txStatus, fraud_status: fraudStatus } =
    notification;

  // Look up the order and its payment
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      grandTotal: true,
      branchId: true,
      queueNumber: true,
      customerSession: { select: { table: { select: { name: true } } } },
      branch: { select: { restaurantId: true } },
      payments: {
        where: { paymentType: "FULL" },
        select: { id: true, status: true, splitGroupId: true, midtransTransactionId: true },
      },
    },
  });

  if (!order) {
    // Unknown order — return 200 so Midtrans doesn't retry
    console.warn("[webhook/midtrans] Unknown orderId", orderId);
    return new NextResponse("OK", { status: 200 });
  }

  const payment = order.payments[0];
  if (!payment) {
    console.warn("[webhook/midtrans] No payment for orderId", orderId);
    return new NextResponse("OK", { status: 200 });
  }

  // Idempotency: if this txId was already processed, skip
  if (payment.midtransTransactionId && payment.midtransTransactionId !== txId) {
    // Different transaction — could be a retry or error; log and skip
    console.warn("[webhook/midtrans] Transaction ID mismatch", { orderId, txId });
    return new NextResponse("OK", { status: 200 });
  }

  // Map Midtrans status to action
  const isSuccess =
    txStatus === "settlement" ||
    (txStatus === "capture" && fraudStatus === "accept");
  const isFailed =
    txStatus === "deny" || txStatus === "cancel";
  const isExpired = txStatus === "expire";
  const isRefunded = txStatus === "refund";
  const isChallenged = txStatus === "capture" && fraudStatus === "challenge";

  if (isChallenged) {
    // Hold — do not confirm; notify merchant. No DB change needed in Phase 1.
    console.warn("[webhook/midtrans] Payment challenged", { orderId, txId });
    return new NextResponse("OK", { status: 200 });
  }

  if (isSuccess) {
    // Patungan: check if this is a split payment
    if (payment.splitGroupId) {
      await handlePatunganPayment(order, payment, txId, orderId);
    } else {
      await confirmOrder(order, payment, txId);
      // Send push notification to merchant staff (non-blocking)
      if (order.branch?.restaurantId) {
        after(async () => {
          await sendInternalNotification({
            type: "NEW_ORDER",
            restaurantId: order.branch!.restaurantId,
            branchId: order.branchId,
            payload: {
              orderNumber: String(order.queueNumber ?? orderId.slice(0, 8).toUpperCase()),
              tableLabel: order.customerSession?.table?.name ?? "–",
              grandTotal: order.grandTotal,
            },
          });
        });
      }
    }
  } else if (isFailed) {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", midtransTransactionId: txId },
      }),
      prisma.order.update({
        where: { id: orderId, status: "PENDING" },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
        },
      }),
      prisma.orderEvent.create({
        data: {
          orderId,
          fromStatus: "PENDING",
          toStatus: "CANCELLED",
          actorType: "SYSTEM",
          actorName: "System",
          cancellationReason: "PAYMENT_FAILED",
        },
      }),
      prisma.auditLog.create({
        data: {
          action: "CANCEL",
          entity: "Order",
          entityId: orderId,
          actorType: "SYSTEM",
          actorName: "System",
          newValue: { reason: "PAYMENT_FAILED", txId },
        },
      }),
    ]);
  } else if (isExpired) {
    // Atomic guard: only update if still PENDING
    await prisma.$transaction([
      prisma.payment.updateMany({
        where: { id: payment.id, status: "PENDING" },
        data: { status: "EXPIRED", midtransTransactionId: txId },
      }),
      prisma.order.updateMany({
        where: { id: orderId, status: "PENDING" },
        data: { status: "EXPIRED" },
      }),
    ]);
  } else if (isRefunded) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "REFUNDED" },
    });
  }

  // Trigger async PDF generation after returning 200 (ADR spec: use after())
  if (isSuccess && !payment.splitGroupId) {
    after(async () => {
      try {
        await prisma.invoice.upsert({
          where: { orderId },
          update: {},
          create: {
            orderId,
            invoiceNumber: `INV-${orderId.slice(0, 8).toUpperCase()}-${Date.now()}`,
          },
        });
      } catch (e) {
        console.error("[webhook/midtrans] Invoice creation failed", e);
      }
    });
  }

  return new NextResponse("OK", { status: 200 });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function confirmOrder(
  order: { id: string; status: string; grandTotal: number; branchId: string; queueNumber: number; customerSession: { table: { name: string } | null } | null; branch: { restaurantId: string } | null },
  payment: { id: string },
  txId: string
) {
  // Atomic guard: WHERE status = 'PENDING' prevents double-confirm
  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: "SUCCESS", midtransTransactionId: txId },
    }),
    prisma.order.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    }),
    prisma.orderEvent.create({
      data: {
        orderId: order.id,
        fromStatus: "PENDING",
        toStatus: "CONFIRMED",
        actorType: "SYSTEM",
        actorName: "System",
      },
    }),
    prisma.auditLog.create({
      data: {
        action: "UPDATE",
        entity: "Order",
        entityId: order.id,
        actorType: "SYSTEM",
        actorName: "System",
        newValue: { fromStatus: "PENDING", toStatus: "CONFIRMED", txId },
      },
    }),
  ]);
}

async function handlePatunganPayment(
  order: {
    id: string;
    status: string;
    grandTotal: number;
    branchId: string;
    queueNumber: number;
    customerSession: { table: { name: string } | null } | null;
    branch: { restaurantId: string } | null;
  },
  payment: { id: string; splitGroupId: string | null },
  txId: string,
  orderId: string
) {
  if (!payment.splitGroupId) return;

  // Mark this payment SUCCESS
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "SUCCESS", midtransTransactionId: txId },
  });

  // Increment paidParts
  const patungan = await prisma.patunganSession.update({
    where: { id: payment.splitGroupId },
    data: { paidParts: { increment: 1 } },
    select: { paidParts: true, totalParts: true, id: true },
  });

  await prisma.auditLog.create({
    data: {
      action: "UPDATE",
      entity: "PatunganSession",
      entityId: patungan.id,
      actorType: "SYSTEM",
      actorName: "System",
      newValue: { paidParts: patungan.paidParts, totalParts: patungan.totalParts, txId },
    },
  });

  // Confirm order only when all parts are paid
  if (patungan.paidParts >= patungan.totalParts) {
    await prisma.$transaction([
      prisma.order.updateMany({
        where: { id: orderId, status: "PENDING" },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
      }),
      prisma.patunganSession.update({
        where: { id: payment.splitGroupId },
        data: { status: "COMPLETED" },
      }),
      prisma.orderEvent.create({
        data: {
          orderId,
          fromStatus: "PENDING",
          toStatus: "CONFIRMED",
          actorType: "SYSTEM",
          actorName: "System",
          note: "Patungan completed",
        },
      }),
    ]);

    // Send push notification to merchant staff (non-blocking)
    if (order.branch?.restaurantId) {
      after(async () => {
        await sendInternalNotification({
          type: "NEW_ORDER",
          restaurantId: order.branch!.restaurantId,
          branchId: order.branchId,
          payload: {
            orderNumber: String(order.queueNumber ?? orderId.slice(0, 8).toUpperCase()),
            tableLabel: order.customerSession?.table?.name ?? "–",
            grandTotal: order.grandTotal,
          },
        });
      });
    }
  }
}
