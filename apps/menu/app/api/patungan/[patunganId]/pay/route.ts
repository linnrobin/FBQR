/**
 * POST /api/patungan/[patunganId]/pay — Create a Snap token for a Patungan participant.
 *
 * No session required — participants access via shareCode link.
 * Returns { snapToken, redirectUrl } so participant can complete payment via Midtrans.
 */
import { NextRequest, NextResponse } from "next/server";
import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "@repo/database";

async function createParticipantSnapToken(
  orderId: string,
  amount: number,
  patunganId: string,
  expiresAt: Date,
  restaurantId: string
): Promise<{ snapToken: string; redirectUrl: string }> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? "";
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
  const baseUrl = isProduction
    ? "https://app.midtrans.com"
    : "https://app.sandbox.midtrans.com";
  const menuUrl = process.env.NEXT_PUBLIC_MENU_APP_URL ?? "http://localhost:3001";

  // Use a unique sub-order ID for Midtrans (orderId + participant index)
  const participantId = `${orderId}-pat-${Date.now()}`;

  const body = {
    transaction_details: {
      order_id: participantId,
      gross_amount: amount,
    },
    custom_expiry: {
      order_time: formatInTimeZone(
        new Date(),
        "Asia/Jakarta",
        "yyyy-MM-dd HH:mm:ss xx"
      ),
      expiry_duration: Math.ceil(
        (expiresAt.getTime() - Date.now()) / (60 * 1000)
      ),
      unit: "minute",
    },
    callbacks: {
      finish: `${menuUrl}/patungan/${patunganId}?status=finish&participantId=${participantId}`,
      error: `${menuUrl}/patungan/${patunganId}?status=error`,
      pending: `${menuUrl}/patungan/${patunganId}?status=pending`,
    },
  };

  const response = await fetch(`${baseUrl}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(`${serverKey}:`).toString("base64"),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Midtrans error ${response.status}: ${err}`);
  }

  const data = (await response.json()) as { token: string; redirect_url: string };
  return { snapToken: data.token, redirectUrl: data.redirect_url };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ patunganId: string }> }
) {
  try {
    const { patunganId } = await params;

    const patungan = await prisma.patunganSession.findUnique({
      where: { id: patunganId },
      select: {
        id: true,
        status: true,
        paidParts: true,
        totalParts: true,
        amountPerPart: true,
        expiresAt: true,
        order: {
          select: {
            id: true,
            grandTotal: true,
            branchId: true,
            branch: { select: { restaurantId: true } },
          },
        },
        payments: {
          where: { status: { in: ["PENDING", "SUCCESS"] } },
          select: { id: true },
        },
      },
    });

    if (!patungan) {
      return NextResponse.json({ error: "Patungan not found" }, { status: 404 });
    }

    if (patungan.status !== "PENDING") {
      return NextResponse.json(
        { error: "Patungan is not accepting payments" },
        { status: 409 }
      );
    }

    if (patungan.paidParts >= patungan.totalParts) {
      return NextResponse.json(
        { error: "All parts already paid" },
        { status: 409 }
      );
    }

    if (patungan.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Patungan session has expired" },
        { status: 410 }
      );
    }

    // Guard against race condition: count existing PENDING+SUCCESS payments so
    // concurrent POST requests don't create more payment rows than remaining parts.
    const remainingParts = patungan.totalParts - patungan.paidParts;
    if (patungan.payments.length >= remainingParts) {
      return NextResponse.json(
        { error: "All parts already have pending or completed payments" },
        { status: 409 }
      );
    }

    // Calculate this participant's amount
    const paidParts = patungan.paidParts + patungan.payments.length;
    const isLastPart = paidParts === patungan.totalParts - 1;
    let participantAmount: number;

    if (patungan.amountPerPart) {
      // For EQUAL split: last part gets the remainder
      if (isLastPart) {
        const alreadyAllocated = (patungan.totalParts - 1) * Number(patungan.amountPerPart);
        participantAmount = patungan.order.grandTotal - alreadyAllocated;
      } else {
        participantAmount = Number(patungan.amountPerPart);
      }
    } else {
      participantAmount = Math.floor(patungan.order.grandTotal / patungan.totalParts);
    }

    // Create a Payment row for this participant
    const payment = await prisma.payment.create({
      data: {
        orderId: patungan.order.id,
        amount: participantAmount,
        method: "QRIS",
        paymentType: "FULL",
        status: "PENDING",
        splitGroupId: patunganId,
      },
      select: { id: true },
    });

    // Create Snap token
    const snap = await createParticipantSnapToken(
      `${patungan.order.id}-${payment.id}`,
      participantAmount,
      patunganId,
      patungan.expiresAt,
      patungan.order.branch.restaurantId
    );

    return NextResponse.json({
      paymentId: payment.id,
      amount: participantAmount,
      snapToken: snap.snapToken,
      redirectUrl: snap.redirectUrl,
    });
  } catch (err) {
    console.error("[POST /api/patungan/[patunganId]/pay]", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan." },
      { status: 500 }
    );
  }
}
