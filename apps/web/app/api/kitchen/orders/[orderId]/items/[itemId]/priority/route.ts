/**
 * PATCH /api/kitchen/orders/[orderId]/items/[itemId]/priority
 *
 * Adjusts the kitchenPriority of an OrderItem (up or down by 1).
 * Priority is scoped per station — only items in the same station are reordered.
 *
 * Requires kitchen:manage permission.
 *
 * Body: { direction: "up" | "down" }
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { getStaffSession, hasPermission } from "@/lib/auth/rbac";
import { requireMerchant } from "@/lib/auth/session";
import { cookies } from "next/headers";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string; itemId: string }> }
) {
  try {
    const { orderId, itemId } = await params;

    // Auth
    const cookieStore = await cookies();
    let restaurantId: string | null = null;

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
        select: { restaurantId: true },
      });
      restaurantId = staff?.restaurantId ?? null;
    } else {
      try {
        const session = await requireMerchant();
        const merchant = await prisma.merchant.findUnique({
          where: { id: session.user.merchantId! },
          select: { restaurant: { select: { id: true } } },
        });
        restaurantId = merchant?.restaurant?.id ?? null;
      } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const { direction } = body as { direction?: "up" | "down" };
    if (direction !== "up" && direction !== "down") {
      return NextResponse.json(
        { error: "direction must be 'up' or 'down'" },
        { status: 400 }
      );
    }

    // Validate ownership
    const item = await prisma.orderItem.findUnique({
      where: { id: itemId },
      select: {
        kitchenPriority: true,
        kitchenStationId: true,
        orderId: true,
        order: { select: { branch: { select: { restaurantId: true } } } },
      },
    });

    if (!item || item.orderId !== orderId) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    if (item.order.branch.restaurantId !== restaurantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const delta = direction === "up" ? -1 : 1;
    const newPriority = Math.max(0, item.kitchenPriority + delta);

    await prisma.orderItem.update({
      where: { id: itemId },
      data: { kitchenPriority: newPriority },
    });

    return NextResponse.json({ ok: true, kitchenPriority: newPriority });
  } catch (err) {
    console.error("[PATCH /api/kitchen/items/[itemId]/priority]", err);
    return NextResponse.json({ error: "Terjadi kesalahan." }, { status: 500 });
  }
}
