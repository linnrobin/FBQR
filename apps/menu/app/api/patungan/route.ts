/**
 * POST /api/patungan — Create a PatunganSession for split payment.
 *
 * PAY_FIRST-only. Called from checkout screen after Order is created (PENDING).
 *
 * Request body:
 *   orderId       string
 *   splitMode     "EQUAL" | "MANUAL"
 *   totalParts    number (2–10)
 *   amountPerPart number? (required for MANUAL mode, ignored for EQUAL)
 *   restaurantId  string
 *
 * Response:
 *   { patunganId, shareCode, expiresAt, amountsPerPart: number[] }
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@repo/database";
import { randomBytes } from "crypto";

// ─── Generate a 6-char alphanumeric share code (cryptographically secure) ────

function generateShareCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 for readability
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[(bytes[i] as number) % chars.length];
  }
  return code;
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookieVal = cookieStore.get("fbqr_session_id")?.value;
    if (!sessionCookieVal) {
      return NextResponse.json({ error: "Session required" }, { status: 401 });
    }

    const session = await prisma.customerSession.findFirst({
      where: { sessionCookie: sessionCookieVal, status: "ACTIVE" },
      select: { id: true, expiresAt: true },
    });
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, splitMode, totalParts, amountPerPart, restaurantId } = body as {
      orderId: string;
      splitMode: "EQUAL" | "MANUAL";
      totalParts: number;
      amountPerPart?: number;
      restaurantId: string;
    };

    if (!orderId || !splitMode || !totalParts || totalParts < 2 || totalParts > 10) {
      return NextResponse.json(
        { error: "orderId, splitMode, and totalParts (2–10) are required" },
        { status: 400 }
      );
    }

    // Load order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        grandTotal: true,
        customerSessionId: true,
        patunganSession: { select: { id: true } },
        items: { select: { needsWeighing: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.status !== "PENDING") {
      return NextResponse.json(
        { error: "Patungan can only be created for PENDING orders" },
        { status: 409 }
      );
    }
    if (order.patunganSession) {
      return NextResponse.json(
        { error: "Patungan session already exists for this order" },
        { status: 409 }
      );
    }
    if (order.items.some((i) => i.needsWeighing)) {
      return NextResponse.json(
        {
          error:
            "Tidak dapat membagi tagihan untuk pesanan timbang",
        },
        { status: 400 }
      );
    }
    if (order.customerSessionId !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check paymentMode = PAY_FIRST
    const settings = await prisma.merchantSettings.findUnique({
      where: { restaurantId },
      select: { paymentMode: true, paymentTimeoutMinutes: true },
    });
    if (settings?.paymentMode !== "PAY_FIRST") {
      return NextResponse.json(
        { error: "Patungan is only available in PAY_FIRST mode" },
        { status: 400 }
      );
    }

    // Compute per-part amounts
    let amountsPerPart: number[];
    if (splitMode === "EQUAL") {
      const share = Math.floor(order.grandTotal / totalParts);
      const remainder = order.grandTotal - share * totalParts;
      amountsPerPart = Array.from({ length: totalParts }, (_, i) =>
        i === totalParts - 1 ? share + remainder : share
      );
    } else {
      if (!amountPerPart || amountPerPart <= 0) {
        return NextResponse.json(
          { error: "amountPerPart required for MANUAL mode" },
          { status: 400 }
        );
      }
      amountsPerPart = Array.from({ length: totalParts }, () => amountPerPart);
    }

    // Generate unique share code (retry on collision)
    let shareCode = generateShareCode();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await prisma.patunganSession.findUnique({
        where: { shareCode },
        select: { id: true },
      });
      if (!existing) break;
      shareCode = generateShareCode();
      attempts++;
    }

    // Expiry = same as Order's expiry (paymentTimeoutMinutes from now)
    const expiresAt = new Date(
      Date.now() + (settings?.paymentTimeoutMinutes ?? 15) * 60 * 1000
    );

    const patungan = await prisma.patunganSession.create({
      data: {
        orderId,
        shareCode,
        splitMode,
        totalParts,
        paidParts: 0,
        amountPerPart: splitMode === "EQUAL" ? Math.floor(order.grandTotal / totalParts) : (amountPerPart ?? null),
        status: "PENDING",
        expiresAt,
        createdBySessionId: session.id,
      },
      select: { id: true, shareCode: true, expiresAt: true },
    });

    return NextResponse.json({
      patunganId: patungan.id,
      shareCode: patungan.shareCode,
      expiresAt: patungan.expiresAt,
      amountsPerPart,
      totalParts,
      grandTotal: order.grandTotal,
    });
  } catch (err) {
    console.error("[POST /api/patungan]", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
