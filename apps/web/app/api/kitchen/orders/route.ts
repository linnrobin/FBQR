/**
 * GET /api/kitchen/orders
 *
 * Returns CONFIRMED + PREPARING + READY orders for a branch, for the kitchen display.
 * Requires staff PIN session with kitchen:view permission (or merchant owner session).
 *
 * Query params:
 *   branchId  string (required)
 *
 * Response: { orders: KitchenOrder[], stations: KitchenStation[] }
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { getStaffSession, hasPermission } from "@/lib/auth/rbac";
import { requireMerchant } from "@/lib/auth/session";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    // Auth: staff session or merchant owner
    const cookieStore = await cookies();
    const staffCookie = cookieStore.get("fbqr_staff_session");

    let restaurantId: string | null = null;

    if (staffCookie) {
      const staffSession = await getStaffSession(cookieStore);
      if (!staffSession) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (!hasPermission(staffSession.permissions, "kitchen:view")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // Look up staff's restaurant
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

    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    if (!branchId) {
      return NextResponse.json({ error: "branchId required" }, { status: 400 });
    }

    // Validate branch belongs to restaurant
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, restaurantId },
      select: { id: true },
    });
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    const [orders, stations] = await Promise.all([
      prisma.order.findMany({
        where: {
          branchId,
          status: { in: ["CONFIRMED", "PREPARING", "READY"] },
        },
        select: {
          id: true,
          queueNumber: true,
          orderType: true,
          status: true,
          confirmedAt: true,
          createdAt: true,
          customerNote: true,
          placedByStaffId: true,
          table: { select: { name: true } },
          items: {
            select: {
              id: true,
              name: true,
              quantity: true,
              kitchenStationId: true,
              kitchenPriority: true,
              needsWeighing: true,
              weightValue: true,
              specialRequest: true,
              variantSnapshot: true,
              addonSnapshot: true,
            },
            orderBy: { kitchenPriority: "asc" },
          },
        },
        orderBy: { confirmedAt: "asc" },
      }),
      prisma.kitchenStation.findMany({
        where: { restaurantId, isActive: true },
        select: { id: true, name: true, displayColor: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({ orders, stations });
  } catch (err) {
    console.error("[GET /api/kitchen/orders]", err);
    return NextResponse.json({ error: "Terjadi kesalahan." }, { status: 500 });
  }
}
