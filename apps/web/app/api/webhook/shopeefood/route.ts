/**
 * ShopeeFood webhook handler.
 * Route: POST /api/webhook/shopeefood
 *
 * Authentication: HMAC-SHA256 signature verification (similar to GrabFood).
 *   Header: X-ShopeeFood-Signature: <hex(HMAC-SHA256(rawBody, secret))>
 *   Secret: SHOPEEFOOD_WEBHOOK_SECRET env var.
 *
 * Webhook events handled:
 *   order.new       — new order from customer
 *   order.cancel    — order cancelled by platform / customer
 *
 * Payload structure based on ShopeeFood Merchant API spec.
 * See docs/merchant.md § Delivery Platform Integration
 *     docs/architecture.md § ADR-012
 */
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@repo/database";
import { createDeliveryOrder } from "@/lib/delivery/create-delivery-order";
import { z } from "zod";

// ── Payload Schema ────────────────────────────────────────────────────────────

const ShopeeFoodItemSchema = z.object({
  itemName: z.string(),
  quantity: z.number().int().min(1),
  price: z.number().int().min(0), // IDR, per unit
  remark: z.string().optional(),
});

const ShopeeFoodOrderSchema = z.object({
  eventType: z.enum(["order.new", "order.cancel", "order.update"]),
  shopId: z.string(), // Maps to Branch.platformStoreId
  orderId: z.string(),
  items: z.array(ShopeeFoodItemSchema),
  pricing: z.object({
    subtotal: z.number().int(),
    tax: z.number().int().default(0),
    total: z.number().int(),
  }),
  delivery: z
    .object({
      driverEta: z.string().optional(), // ISO timestamp
    })
    .optional(),
  buyerNote: z.string().optional(),
});

type ShopeeFoodOrder = z.infer<typeof ShopeeFoodOrderSchema>;

// ── Signature Verification ────────────────────────────────────────────────────

/**
 * ShopeeFood sends hex-encoded HMAC-SHA256.
 */
function verifyShopeeFoodSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expected = createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("hex");
    const sigBuf = Buffer.from(signature.toLowerCase(), "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length) return false;
    return timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-shopeefood-signature") ?? "";

  if (!signature) {
    return NextResponse.json(
      { error: "Missing X-ShopeeFood-Signature header" },
      { status: 401 }
    );
  }

  const secret = process.env.SHOPEEFOOD_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      "[shopeefood-webhook] SHOPEEFOOD_WEBHOOK_SECRET not configured"
    );
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  if (!verifyShopeeFoodSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: ShopeeFoodOrder;
  try {
    payload = ShopeeFoodOrderSchema.parse(JSON.parse(rawBody));
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (payload.eventType === "order.new") {
    const branch = await prisma.branch.findFirst({
      where: { platformStoreId: payload.shopId },
      select: { restaurantId: true },
    });

    if (!branch) {
      return NextResponse.json(
        { error: `No branch found for shopId=${payload.shopId}` },
        { status: 422 }
      );
    }

    try {
      const result = await createDeliveryOrder({
        platform: "SHOPEEFOOD",
        platformOrderId: payload.orderId,
        storeId: payload.shopId,
        restaurantId: branch.restaurantId,
        items: payload.items.map((i) => ({
          name: i.itemName,
          quantity: i.quantity,
          unitPrice: i.price,
          specialRequest: i.remark,
        })),
        subtotal: payload.pricing.subtotal,
        taxAmount: payload.pricing.tax,
        serviceChargeAmount: 0,
        grandTotal: payload.pricing.total,
        estimatedPickupTime: payload.delivery?.driverEta
          ? new Date(payload.delivery.driverEta)
          : undefined,
        customerNote: payload.buyerNote,
      });

      return NextResponse.json({
        success: true,
        orderId: result.orderId,
        created: result.created,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[shopeefood-webhook] createDeliveryOrder failed:", msg);
      return NextResponse.json({ error: msg }, { status: 422 });
    }
  }

  if (payload.eventType === "order.cancel") {
    const order = await prisma.order.findFirst({
      where: {
        platformName: "SHOPEEFOOD",
        platformOrderId: payload.orderId,
      },
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
            actorName: "SHOPEEFOOD",
            note: "Order cancelled by ShopeeFood platform",
          },
        }),
      ]);
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: true, ignored: true });
}
