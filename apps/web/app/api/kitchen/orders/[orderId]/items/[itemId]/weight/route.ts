/**
 * PATCH /api/kitchen/orders/[orderId]/items/[itemId]/weight
 *
 * Enters the actual weight for a BY_WEIGHT OrderItem from the KDS numpad modal.
 *
 * Requires kitchen:manage permission.
 *
 * Body: { weightValue: number (grams) }
 *
 * Side effects:
 *   - Sets OrderItem.weightValue, weightUnit, finalLineTotal, needsWeighing=false
 *   - Sets OrderItem.weightEnteredByStaffId (from session)
 *   - Returns { delta: number } where delta = finalLineTotal - depositAmount
 *     (positive = charge more; negative = refund; zero = exact)
 *   - The caller (kitchen display) broadcasts a Realtime event for the cashier
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
    let staffId: string | null = null;

    const staffCookie = cookieStore.get("fbqr_staff_session");
    if (staffCookie) {
      const staffSession = await getStaffSession(cookieStore);
      if (!staffSession) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (!hasPermission(staffSession.permissions, "kitchen:manage")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      staffId = staffSession.staffId;
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
    const weightGrams = body?.weightValue;
    if (typeof weightGrams !== "number" || weightGrams <= 0) {
      return NextResponse.json(
        { error: "weightValue must be a positive number (grams)" },
        { status: 400 }
      );
    }

    // Fetch item + order.depositAmount for pricePerUnit
    const item = await prisma.orderItem.findUnique({
      where: { id: itemId },
      select: {
        orderId: true,
        needsWeighing: true,
        menuItemId: true,
        order: {
          select: {
            depositAmount: true,
            branch: { select: { restaurantId: true } },
          },
        },
      },
    });

    if (!item || item.orderId !== orderId) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    if (item.order.branch.restaurantId !== restaurantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!item.needsWeighing) {
      return NextResponse.json(
        { error: "Item does not require weighing" },
        { status: 422 }
      );
    }

    // Get pricePerUnit from MenuItem
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: item.menuItemId! },
      select: { pricePerUnit: true, unitLabel: true },
    });

    if (!menuItem?.pricePerUnit) {
      return NextResponse.json(
        { error: "MenuItem has no pricePerUnit" },
        { status: 422 }
      );
    }

    // Compute finalLineTotal (weightGrams converted to kg if unitLabel = "kg")
    const pricePerUnit = Number(menuItem.pricePerUnit);
    const unitLabel = menuItem.unitLabel ?? "g";
    const weightInUnit = unitLabel === "kg" ? weightGrams / 1000 : weightGrams;
    const finalLineTotal = Math.round(weightInUnit * pricePerUnit);
    const depositAmount = item.order.depositAmount ?? 0;
    const delta = finalLineTotal - depositAmount;

    await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        weightValue: weightGrams,
        weightUnit: unitLabel,
        finalLineTotal,
        needsWeighing: false,
        weightEnteredByStaffId: staffId,
      },
    });

    return NextResponse.json({ ok: true, finalLineTotal, delta });
  } catch (err) {
    console.error("[PATCH /api/kitchen/items/[itemId]/weight]", err);
    return NextResponse.json({ error: "Terjadi kesalahan." }, { status: 500 });
  }
}
