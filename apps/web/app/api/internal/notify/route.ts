/**
 * POST /api/internal/notify — Internal cross-app push notification trigger.
 *
 * Called by apps/menu to send push notifications without importing web-push.
 * Protected by INTERNAL_API_SECRET (Authorization: Bearer <secret>).
 *
 * Body:
 *   type        "NEW_ORDER" | "WAITER_CALL"
 *   restaurantId string (UUID)
 *   branchId     string (UUID)
 *   payload      object (type-specific data)
 *
 * For NEW_ORDER:  { orderNumber: string, tableLabel: string, grandTotal: number }
 * For WAITER_CALL: { tableLabel: string, requestType: string }
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { sendNewOrderNotification, sendWaiterCallNotification } from "@/lib/push";

function isAuthorised(req: NextRequest): boolean {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return false;
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  // Constant-time comparison to prevent timing attacks
  if (token.length !== secret.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(secret));
}

const NewOrderPayloadSchema = z.object({
  orderNumber: z.string().max(50),
  tableLabel: z.string().max(100),
  grandTotal: z.number().int().min(0).max(100_000_000),
});

const WaiterCallPayloadSchema = z.object({
  tableLabel: z.string().max(100),
  requestType: z.string().max(50),
});

const NotifyBodySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("NEW_ORDER"),
    restaurantId: z.string().uuid(),
    branchId: z.string().uuid(),
    payload: NewOrderPayloadSchema,
  }),
  z.object({
    type: z.literal("WAITER_CALL"),
    restaurantId: z.string().uuid(),
    branchId: z.string().uuid(),
    payload: WaiterCallPayloadSchema,
  }),
]);

export async function POST(req: NextRequest) {
  if (!isAuthorised(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = NotifyBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { type, restaurantId, branchId, payload } = parsed.data;

  if (type === "NEW_ORDER") {
    await sendNewOrderNotification({
      restaurantId,
      branchId,
      orderNumber: payload.orderNumber,
      tableLabel: payload.tableLabel,
      grandTotal: payload.grandTotal,
    });
  } else {
    await sendWaiterCallNotification({
      restaurantId,
      branchId,
      tableLabel: payload.tableLabel,
      requestType: payload.requestType,
    });
  }

  return NextResponse.json({ ok: true });
}
