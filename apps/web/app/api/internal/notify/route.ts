/**
 * POST /api/internal/notify — Internal cross-app push notification trigger.
 *
 * Called by apps/menu to send push notifications without importing web-push.
 * Protected by INTERNAL_API_SECRET (Authorization: Bearer <secret>).
 *
 * Body:
 *   type        "NEW_ORDER" | "WAITER_CALL"
 *   restaurantId string
 *   branchId     string
 *   payload      object (type-specific data)
 *
 * For NEW_ORDER:  { orderNumber, tableLabel, grandTotal }
 * For WAITER_CALL: { tableLabel, requestType }
 */
import { NextRequest, NextResponse } from "next/server";
import { sendNewOrderNotification, sendWaiterCallNotification } from "@/lib/push";

function isAuthorised(req: NextRequest): boolean {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorised(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await req.json() as {
    type: "NEW_ORDER" | "WAITER_CALL";
    restaurantId: string;
    branchId: string;
    payload: Record<string, unknown>;
  };

  const { type, restaurantId, branchId, payload } = body;

  if (!type || !restaurantId || !branchId) {
    return NextResponse.json({ error: "type, restaurantId, and branchId are required" }, { status: 400 });
  }

  if (type === "NEW_ORDER") {
    await sendNewOrderNotification({
      restaurantId,
      branchId,
      orderNumber: String(payload.orderNumber ?? ""),
      tableLabel: String(payload.tableLabel ?? ""),
      grandTotal: Number(payload.grandTotal ?? 0),
    });
  } else if (type === "WAITER_CALL") {
    await sendWaiterCallNotification({
      restaurantId,
      branchId,
      tableLabel: String(payload.tableLabel ?? ""),
      requestType: String(payload.requestType ?? "CALL"),
    });
  } else {
    return NextResponse.json({ error: "Unknown notification type" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
