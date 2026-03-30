/**
 * GET  /api/patungan/[patunganId] — Get PatunganSession status (shareable, no auth).
 * DELETE /api/patungan/[patunganId] — Cancel (host-only); refunds SUCCESS payments.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@repo/database";
import { midtransRefund } from "@/app/api/webhook/midtrans/route";

// ─── GET — public status endpoint ────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ patunganId: string }> }
) {
  const { patunganId } = await params;

  const patungan = await prisma.patunganSession.findUnique({
    where: { id: patunganId },
    select: {
      id: true,
      shareCode: true,
      splitMode: true,
      totalParts: true,
      paidParts: true,
      amountPerPart: true,
      status: true,
      expiresAt: true,
      order: {
        select: {
          id: true,
          grandTotal: true,
          status: true,
          branch: {
            select: {
              restaurant: { select: { name: true } },
            },
          },
        },
      },
      payments: {
        // Intentionally omit `amount` — this is a public endpoint; per-payment
        // amounts must not be exposed to unauthenticated observers.
        select: { id: true, status: true, createdAt: true },
      },
    },
  });

  if (!patungan) {
    return NextResponse.json({ error: "Patungan session not found" }, { status: 404 });
  }

  return NextResponse.json({
    patunganId: patungan.id,
    shareCode: patungan.shareCode,
    splitMode: patungan.splitMode,
    totalParts: patungan.totalParts,
    paidParts: patungan.paidParts,
    amountPerPart: patungan.amountPerPart,
    status: patungan.status,
    expiresAt: patungan.expiresAt,
    grandTotal: patungan.order.grandTotal,
    orderId: patungan.order.id,
    orderStatus: patungan.order.status,
    restaurantName: patungan.order.branch.restaurant.name,
    payments: patungan.payments,
  });
}

// ─── DELETE — host-only cancel + refund ──────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ patunganId: string }> }
) {
  try {
    const { patunganId } = await params;
    const cookieStore = await cookies();
    const sessionCookieVal = cookieStore.get("fbqr_session_id")?.value;

    if (!sessionCookieVal) {
      return NextResponse.json({ error: "Session required" }, { status: 401 });
    }

    const patungan = await prisma.patunganSession.findUnique({
      where: { id: patunganId },
      select: {
        id: true,
        status: true,
        createdBySessionId: true,
        createdBySession: { select: { sessionCookie: true } },
        order: { select: { id: true, status: true } },
        payments: {
          where: { status: "SUCCESS" },
          select: { id: true, amount: true, midtransTransactionId: true },
        },
      },
    });

    if (!patungan) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Only the host (creator session) can cancel
    if (patungan.createdBySession.sessionCookie !== sessionCookieVal) {
      return NextResponse.json({ error: "Only the host can cancel Patungan" }, { status: 403 });
    }

    if (patungan.status !== "PENDING") {
      return NextResponse.json(
        { error: "Cannot cancel a completed or already cancelled Patungan" },
        { status: 409 }
      );
    }

    // Cancel PatunganSession + Order
    await prisma.$transaction([
      prisma.patunganSession.update({
        where: { id: patunganId },
        data: { status: "CANCELLED" },
      }),
      prisma.order.update({
        where: { id: patungan.order.id, status: "PENDING" },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      }),
      prisma.orderEvent.create({
        data: {
          orderId: patungan.order.id,
          fromStatus: "PENDING",
          toStatus: "CANCELLED",
          actorType: "CUSTOMER",
          actorName: "Patungan Host",
          cancellationReason: "CUSTOMER_REQUEST",
        },
      }),
      prisma.auditLog.create({
        data: {
          action: "CANCEL",
          entity: "PatunganSession",
          entityId: patunganId,
          actorType: "CUSTOMER",
          actorName: "Patungan Host",
          newValue: { reason: "HOST_CANCELLED", successPaymentsToRefund: patungan.payments.length },
        },
      }),
    ]);

    // Refund all SUCCESS payments asynchronously (best-effort)
    for (const pmt of patungan.payments) {
      if (pmt.midtransTransactionId) {
        midtransRefund(
          pmt.midtransTransactionId,
          pmt.amount,
          "Patungan cancelled by host"
        ).catch((e) =>
          console.error("[patungan cancel refund]", e)
        );
        await prisma.payment.update({
          where: { id: pmt.id },
          data: { status: "REFUNDED" },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/patungan/[patunganId]]", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan." },
      { status: 500 }
    );
  }
}
