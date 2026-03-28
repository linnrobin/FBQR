/**
 * POST /api/waiter — Create a WaiterRequest from the customer tracking screen.
 *
 * Request body:
 *   tableId   string
 *   orderId   string?   (optional — links request to the active order)
 *   type      "CALL" | "ASSISTANCE" | "BILL"
 *   message   string?   (only for ASSISTANCE type)
 *
 * Response:
 *   { id, type, createdAt }
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@repo/database";
import { sendInternalNotification } from "@/lib/notify";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookieVal = cookieStore.get("fbqr_session_id")?.value;
    if (!sessionCookieVal) {
      return NextResponse.json({ error: "Session required" }, { status: 401 });
    }

    const body = await req.json();
    const { tableId, orderId, type, message } = body as {
      tableId: string;
      orderId?: string;
      type: string;
      message?: string;
    };

    if (!tableId || !type) {
      return NextResponse.json(
        { error: "tableId and type are required" },
        { status: 400 }
      );
    }

    const validTypes = ["CALL", "ASSISTANCE", "BILL"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // Validate session
    const session = await prisma.customerSession.findFirst({
      where: {
        sessionCookie: sessionCookieVal,
        tableId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        expiresAt: true,
        branchId: true,
        branch: { select: { restaurantId: true } },
        table: { select: { name: true } },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    // Build optional note field (for ASSISTANCE type, message can be stored
    // as a noteMessage — we use a separate field approach via JSON-free approach:
    // WaiterRequest doesn't have a message field in the schema, so we'll
    // include it as part of the orderId link and the type communicates intent)
    const waiterRequest = await prisma.waiterRequest.create({
      data: {
        branchId: session.branchId,
        tableId,
        type: type as "CALL" | "ASSISTANCE" | "BILL",
        ...(orderId ? { orderId } : {}),
      },
      select: { id: true, type: true, createdAt: true },
    });

    // Log to audit
    await prisma.auditLog.create({
      data: {
        action: "CREATE",
        entity: "WaiterRequest",
        entityId: waiterRequest.id,
        actorType: "CUSTOMER",
        actorName: "Customer",
        newValue: {
          type,
          tableId,
          ...(orderId ? { orderId } : {}),
          ...(message ? { message } : {}),
        },
      },
    });

    // Send push notification to merchant staff (non-blocking — fire and forget)
    if (session.branch?.restaurantId) {
      sendInternalNotification({
        type: "WAITER_CALL",
        restaurantId: session.branch.restaurantId,
        branchId: session.branchId,
        payload: {
          tableLabel: session.table?.name ?? tableId,
          requestType: type,
        },
      }).catch(() => {
        // Non-fatal — notification failure never affects the waiter request response
      });
    }

    return NextResponse.json({
      id: waiterRequest.id,
      type: waiterRequest.type,
      createdAt: waiterRequest.createdAt,
    });
  } catch (err) {
    console.error("[POST /api/waiter]", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
