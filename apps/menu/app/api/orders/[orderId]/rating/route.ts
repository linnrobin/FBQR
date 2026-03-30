/**
 * POST /api/orders/[orderId]/rating — Submit a rating for a completed order.
 *
 * Request body:
 *   rating   number   (1–5)
 *   comment  string?  (optional, max 500 chars)
 *
 * Response:
 *   { id, rating, comment, createdAt }
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@repo/database";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const cookieStore = await cookies();
    const sessionCookieVal = cookieStore.get("fbqr_session_id")?.value;
    if (!sessionCookieVal) {
      return NextResponse.json({ error: "Session required" }, { status: 401 });
    }

    const body = await req.json();
    const { rating, comment } = body as {
      rating: number;
      comment?: string;
    };

    if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json(
        { error: "rating must be an integer between 1 and 5" },
        { status: 400 }
      );
    }
    if (comment && comment.length > 500) {
      return NextResponse.json(
        { error: "comment must be 500 characters or fewer" },
        { status: 400 }
      );
    }

    // Validate order belongs to this session
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        customerSessionId: true,
        rating: { select: { id: true } },
        customerSession: { select: { sessionCookie: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (
      !order.customerSession ||
      order.customerSession.sessionCookie !== sessionCookieVal
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (order.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Can only rate completed orders" },
        { status: 409 }
      );
    }
    if (order.rating) {
      return NextResponse.json(
        { error: "Order already rated" },
        { status: 409 }
      );
    }

    const newRating = await prisma.orderRating.create({
      data: {
        orderId,
        ...(order.customerSessionId ? { customerSessionId: order.customerSessionId } : {}),
        rating,
        ...(comment ? { comment } : {}),
      },
      select: { id: true, rating: true, comment: true, createdAt: true },
    });

    return NextResponse.json(newRating);
  } catch (err) {
    console.error("[POST /api/orders/[orderId]/rating]", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
