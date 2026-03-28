/**
 * GrabFood webhook handler.
 * Route: POST /api/webhook/grabfood
 *
 * Authentication: HMAC-SHA256 signature verification.
 *   Header: X-GrabFood-HMAC-SHA256: <base64(HMAC-SHA256(rawBody, secret))>
 *   Secret: per-restaurant, stored in env GRABFOOD_WEBHOOK_SECRET_{restaurantId}
 *   Fallback: GRABFOOD_WEBHOOK_SECRET (global secret for single-tenant setups)
 *
 * Webhook events handled:
 *   order.created   — new order from customer
 *   order.cancelled — order cancelled by platform / customer
 *
 * Payload structure based on GrabFood Merchant API spec.
 * See docs/merchant.md § Delivery Platform Integration
 *     docs/architecture.md § ADR-012
 */
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@repo/database";
import { createDeliveryOrder } from "@/lib/delivery/create-delivery-order";
import { z } from "zod";

// ── Payload Schema ────────────────────────────────────────────────────────────

const GrabFoodItemSchema = z.object({
  name: z.string(),
  quantity: z.number().int().min(1),
  price: z.number().int().min(0), // IDR, per unit
  specialInstruction: z.string().optional(),
});

const GrabFoodOrderSchema = z.object({
  eventType: z.enum(["order.created", "order.cancelled", "order.updated"]),
  storeId: z.string(),
  /** GrabFood's unique order identifier */
  grabOrderId: z.string(),
  /** Merchant's restaurant identifier (maps to Restaurant.id in multi-tenant) */
  merchantId: z.string().optional(),
  items: z.array(GrabFoodItemSchema),
  pricing: z.object({
    subtotal: z.number().int(),
    tax: z.number().int().default(0),
    serviceCharge: z.number().int().default(0),
    total: z.number().int(),
  }),
  estimatedPickupTime: z.string().optional(), // ISO string
  customerNote: z.string().optional(),
});

type GrabFoodOrder = z.infer<typeof GrabFoodOrderSchema>;

// ── Signature Verification ────────────────────────────────────────────────────

/**
 * Verifies the HMAC-SHA256 signature from GrabFood.
 * GrabFood sends: base64(HMAC-SHA256(rawBody, sharedSecret))
 */
function verifyGrabFoodSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expected = createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("base64");
    const sigBuf = Buffer.from(signature, "base64");
    const expBuf = Buffer.from(expected, "base64");
    if (sigBuf.length !== expBuf.length) return false;
    return timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-grabfood-hmac-sha256") ?? "";

  if (!signature) {
    return NextResponse.json(
      { error: "Missing X-GrabFood-HMAC-SHA256 header" },
      { status: 401 }
    );
  }

  // Parse payload early to get storeId / merchantId for secret lookup
  let payload: GrabFoodOrder;
  try {
    payload = GrabFoodOrderSchema.parse(JSON.parse(rawBody));
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Resolve webhook secret: per-restaurant key > global key
  const secret =
    (payload.merchantId
      ? process.env[`GRABFOOD_WEBHOOK_SECRET_${payload.merchantId}`]
      : undefined) ?? process.env.GRABFOOD_WEBHOOK_SECRET;

  if (!secret) {
    console.error("[grabfood-webhook] GRABFOOD_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  if (!verifyGrabFoodSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // ── Route by event type ─────────────────────────────────────────────────────
  if (payload.eventType === "order.created") {
    // Resolve restaurantId: from merchantId field or from storeId lookup
    let restaurantId: string | null = payload.merchantId ?? null;
    if (!restaurantId) {
      const branch = await prisma.branch.findFirst({
        where: { platformStoreId: payload.storeId },
        select: { restaurantId: true },
      });
      restaurantId = branch?.restaurantId ?? null;
    }

    if (!restaurantId) {
      return NextResponse.json(
        { error: `No branch found for storeId=${payload.storeId}` },
        { status: 422 }
      );
    }

    try {
      const result = await createDeliveryOrder({
        platform: "GRABFOOD",
        platformOrderId: payload.grabOrderId,
        storeId: payload.storeId,
        restaurantId,
        items: payload.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.price,
          specialRequest: i.specialInstruction,
        })),
        subtotal: payload.pricing.subtotal,
        taxAmount: payload.pricing.tax,
        serviceChargeAmount: payload.pricing.serviceCharge,
        grandTotal: payload.pricing.total,
        estimatedPickupTime: payload.estimatedPickupTime
          ? new Date(payload.estimatedPickupTime)
          : undefined,
        customerNote: payload.customerNote,
      });

      return NextResponse.json({
        success: true,
        orderId: result.orderId,
        created: result.created,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[grabfood-webhook] createDeliveryOrder failed:", msg);
      return NextResponse.json({ error: msg }, { status: 422 });
    }
  }

  if (payload.eventType === "order.cancelled") {
    // Mark existing FBQR order as CANCELLED
    const order = await prisma.order.findFirst({
      where: { platformName: "GRABFOOD", platformOrderId: payload.grabOrderId },
      select: { id: true, status: true },
    });

    if (order && order.status !== "COMPLETED" && order.status !== "CANCELLED") {
      await prisma.$transaction([
        prisma.order.update({
          where: { id: order.id },
          data: { status: "CANCELLED", cancelledAt: new Date() },
        }),
        prisma.orderEvent.create({
          data: {
            orderId: order.id,
            fromStatus: order.status as "CONFIRMED" | "PREPARING" | "READY",
            toStatus: "CANCELLED",
            actorType: "SYSTEM",
            actorName: "GRABFOOD",
            note: "Order cancelled by GrabFood platform",
          },
        }),
      ]);
    }

    return NextResponse.json({ success: true });
  }

  // Other event types — acknowledge and ignore
  return NextResponse.json({ success: true, ignored: true });
}
