/**
 * GET /api/orders/[orderId] — Fetch order details for the tracking screen.
 *
 * Auth: session cookie required. Only the session that created the order
 * (or a staff session from the same branch) can read it.
 *
 * Response:
 *   {
 *     id, status, queueNumber, orderType,
 *     confirmedAt, readyAt, cancelledAt, createdAt,
 *     subtotal, taxAmount, serviceChargeAmount, grandTotal,
 *     customerNote,
 *     branchId,
 *     items: OrderItemSummary[],
 *     payments: PaymentSummary[],
 *     invoice: { id, pdfUrl } | null,
 *     rating: { rating, comment } | null,
 *     session: { status, expiresAt },
 *     restaurant: { name, logoUrl },
 *   }
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@repo/database";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const cookieStore = await cookies();
    const sessionCookieVal = cookieStore.get("fbqr_session_id")?.value;

    if (!sessionCookieVal) {
      return NextResponse.json({ error: "Session required" }, { status: 401 });
    }

    // Fetch order + related data
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        queueNumber: true,
        orderType: true,
        confirmedAt: true,
        readyAt: true,
        cancelledAt: true,
        createdAt: true,
        subtotal: true,
        taxAmount: true,
        serviceChargeAmount: true,
        grandTotal: true,
        customerNote: true,
        branchId: true,
        customerSessionId: true,
        items: {
          select: {
            id: true,
            name: true,
            quantity: true,
            unitPrice: true,
            variantPriceDelta: true,
            addonPriceTotal: true,
            lineTotal: true,
            variantSnapshot: true,
            addonSnapshot: true,
            specialRequest: true,
            needsWeighing: true,
            weightValue: true,
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            paymentType: true,
            status: true,
            provider: true,
            midtransTransactionId: true,
          },
        },
        invoice: {
          select: { id: true, pdfUrl: true },
        },
        rating: {
          select: { rating: true, comment: true },
        },
        customerSession: {
          select: {
            id: true,
            sessionCookie: true,
            status: true,
            expiresAt: true,
          },
        },
        branch: {
          select: {
            id: true,
            restaurant: {
              select: {
                id: true,
                name: true,
                branding: { select: { logoUrl: true } },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Validate: the session cookie must match the session that created this order
    if (
      !order.customerSession ||
      order.customerSession.sessionCookie !== sessionCookieVal
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      id: order.id,
      status: order.status,
      queueNumber: order.queueNumber,
      orderType: order.orderType,
      confirmedAt: order.confirmedAt,
      readyAt: order.readyAt,
      cancelledAt: order.cancelledAt,
      createdAt: order.createdAt,
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      serviceChargeAmount: order.serviceChargeAmount,
      grandTotal: order.grandTotal,
      customerNote: order.customerNote,
      branchId: order.branchId,
      items: order.items,
      payments: order.payments,
      invoice: order.invoice ?? null,
      rating: order.rating ?? null,
      session: {
        status: order.customerSession.status,
        expiresAt: order.customerSession.expiresAt,
      },
      restaurant: {
        name: order.branch.restaurant.name,
        logoUrl: order.branch.restaurant.branding?.logoUrl ?? null,
      },
    });
  } catch (err) {
    console.error("[GET /api/orders/[orderId]]", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
