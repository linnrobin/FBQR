/**
 * GoFood (Gojek) webhook handler.
 * Route: POST /api/webhook/gofood
 *
 * Authentication: OAuth 2.0 bearer token validation.
 *   Header: Authorization: Bearer <token>
 *   Token is validated against GOFOOD_WEBHOOK_TOKEN env var (shared secret).
 *   In production, Gojek signs with a per-merchant token obtained via OAuth.
 *   For simplicity, we validate against a configured bearer token.
 *
 * Webhook events handled:
 *   ORDER_CREATED   — new order from customer
 *   ORDER_CANCELLED — order cancelled by platform / customer
 *
 * Payload structure based on Gojek Merchant API spec.
 * See docs/merchant.md § Delivery Platform Integration
 *     docs/architecture.md § ADR-012
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { createDeliveryOrder } from "@/lib/delivery/create-delivery-order";
import { z } from "zod";

// ── Payload Schema ────────────────────────────────────────────────────────────

const GoFoodItemSchema = z.object({
  name: z.string(),
  qty: z.number().int().min(1),
  price: z.number().int().min(0), // IDR, per unit
  notes: z.string().optional(),
});

const GoFoodOrderSchema = z.object({
  event: z.enum(["ORDER_CREATED", "ORDER_CANCELLED", "ORDER_UPDATED"]),
  restaurantId: z.string().optional(), // Gojek's internal merchant ID
  outletId: z.string(), // Maps to Branch.platformStoreId
  orderId: z.string(), // GoFood's unique order reference
  items: z.array(GoFoodItemSchema),
  payment: z.object({
    subtotal: z.number().int(),
    tax: z.number().int().default(0),
    total: z.number().int(),
  }),
  schedule: z
    .object({
      pickup: z
        .object({
          estimated: z.string().optional(), // ISO timestamp
        })
        .optional(),
    })
    .optional(),
  notes: z.string().optional(),
});

type GoFoodOrder = z.infer<typeof GoFoodOrderSchema>;

// ── Bearer Token Verification ─────────────────────────────────────────────────

import crypto from "crypto";

function verifyBearerToken(authHeader: string | null): boolean {
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  const expected = process.env.GOFOOD_WEBHOOK_TOKEN;
  if (!expected) return false;
  // Use crypto.timingSafeEqual to prevent timing attacks.
  // Both buffers are padded to the same length so that the comparison does not
  // leak token length information via early return.
  const aBuf = Buffer.from(token);
  const bBuf = Buffer.from(expected);
  const maxLen = Math.max(aBuf.length, bBuf.length);
  const a = Buffer.alloc(maxLen);
  const b = Buffer.alloc(maxLen);
  aBuf.copy(a);
  bBuf.copy(b);
  // timingSafeEqual returns false if lengths differ even with padding — we
  // also check lengths to return the correct boolean (same-length tokens that
  // match the padding pattern would pass otherwise).
  return (
    aBuf.length === bBuf.length &&
    crypto.timingSafeEqual(a, b)
  );
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!verifyBearerToken(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: GoFoodOrder;
  try {
    const body = await req.json();
    payload = GoFoodOrderSchema.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (payload.event === "ORDER_CREATED") {
    // Resolve restaurantId
    let restaurantId: string | null = null;
    const branch = await prisma.branch.findFirst({
      where: { platformStoreId: payload.outletId },
      select: { restaurantId: true },
    });
    restaurantId = branch?.restaurantId ?? null;

    if (!restaurantId) {
      return NextResponse.json(
        { error: `No branch found for outletId=${payload.outletId}` },
        { status: 422 }
      );
    }

    try {
      const result = await createDeliveryOrder({
        platform: "GOFOOD",
        platformOrderId: payload.orderId,
        storeId: payload.outletId,
        restaurantId,
        items: payload.items.map((i) => ({
          name: i.name,
          quantity: i.qty,
          unitPrice: i.price,
          specialRequest: i.notes,
        })),
        subtotal: payload.payment.subtotal,
        taxAmount: payload.payment.tax,
        serviceChargeAmount: 0,
        grandTotal: payload.payment.total,
        estimatedPickupTime: payload.schedule?.pickup?.estimated
          ? new Date(payload.schedule.pickup.estimated)
          : undefined,
        customerNote: payload.notes,
      });

      return NextResponse.json({
        success: true,
        orderId: result.orderId,
        created: result.created,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[gofood-webhook] createDeliveryOrder failed:", msg);
      return NextResponse.json({ error: msg }, { status: 422 });
    }
  }

  if (payload.event === "ORDER_CANCELLED") {
    const order = await prisma.order.findFirst({
      where: { platformName: "GOFOOD", platformOrderId: payload.orderId },
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
            actorName: "GOFOOD",
            note: "Order cancelled by GoFood platform",
          },
        }),
      ]);
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: true, ignored: true });
}
