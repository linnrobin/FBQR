/**
 * PATCH /api/kitchen/orders/[orderId]/status
 *
 * Transitions an order's status from the kitchen display.
 * Requires staff PIN session with kitchen:manage permission (or merchant owner).
 *
 * Valid transitions:
 *   CONFIRMED  → PREPARING
 *   PREPARING  → READY
 *   READY      → COMPLETED
 *
 * Body: { status: "PREPARING" | "READY" | "COMPLETED" }
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { getStaffSession, hasPermission } from "@/lib/auth/rbac";
import { requireMerchant } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { auditLog, getRequestMeta } from "@/lib/audit";

const VALID_TRANSITIONS: Record<string, string> = {
  CONFIRMED: "PREPARING",
  PREPARING: "READY",
  READY: "COMPLETED",
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    // Auth
    const cookieStore = await cookies();
    let restaurantId: string | null = null;
    let actorId: string | null = null;
    let actorName: string | null = null;
    let actorType: "STAFF" | "MERCHANT" = "STAFF";

    const staffCookie = cookieStore.get("fbqr_staff_session");
    if (staffCookie) {
      const staffSession = await getStaffSession(cookieStore);
      if (!staffSession) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (!hasPermission(staffSession.permissions, "kitchen:manage")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const staff = await prisma.staff.findUnique({
        where: { id: staffSession.staffId },
        select: { restaurantId: true, name: true },
      });
      restaurantId = staff?.restaurantId ?? null;
      actorId = staffSession.staffId;
      actorName = staff?.name ?? null;
      actorType = "STAFF";
    } else {
      try {
        const session = await requireMerchant();
        const merchant = await prisma.merchant.findUnique({
          where: { id: session.user.merchantId! },
          select: { restaurant: { select: { id: true } }, email: true },
        });
        restaurantId = merchant?.restaurant?.id ?? null;
        actorId = session.user.merchantId ?? null;
        actorName = merchant?.email ?? null;
        actorType = "MERCHANT";
      } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const { status: newStatus } = body as { status?: string };

    if (!newStatus) {
      return NextResponse.json({ error: "status required" }, { status: 400 });
    }

    // Fetch order to validate transition + restaurant ownership
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        status: true,
        branch: { select: { restaurantId: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.branch.restaurantId !== restaurantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const expectedNext = VALID_TRANSITIONS[order.status];
    if (expectedNext !== newStatus) {
      return NextResponse.json(
        { error: `Invalid transition: ${order.status} → ${newStatus}` },
        { status: 422 }
      );
    }

    const now = new Date();
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: newStatus as "PREPARING" | "READY" | "COMPLETED",
        // readyAt is tracked in schema; confirmedAt set elsewhere
        ...(newStatus === "READY" ? { readyAt: now } : {}),
      },
      select: { id: true, status: true },
    });

    const { ipAddress, userAgent } = getRequestMeta(req);
    await auditLog({
      actorId,
      actorType,
      actorName,
      action: "UPDATE",
      entity: "Order",
      entityId: orderId,
      oldValue: { status: order.status },
      newValue: { status: newStatus },
      restaurantId,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ order: updated });
  } catch (err) {
    console.error("[PATCH /api/kitchen/orders/[orderId]/status]", err);
    return NextResponse.json({ error: "Terjadi kesalahan." }, { status: 500 });
  }
}
