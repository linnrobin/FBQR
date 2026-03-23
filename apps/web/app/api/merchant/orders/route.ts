/**
 * Merchant orders API — POST.
 * Route: POST /api/merchant/orders
 *
 * Waiter-assisted order placement.
 * Requires staff PIN session with orders:manage permission.
 * Sets Order.placedByStaffId = staffSession.staffId.
 *
 * Merchant (owner) session also accepted.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";
import { getStaffSession, hasPermission, forbiddenResponse } from "@/lib/auth/rbac";
import { cookies } from "next/headers";
import { z } from "zod";
import { formatInTimeZone } from "date-fns-tz";

const OrderItemSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
  variantId: z.string().uuid().nullable().optional(),
  addonIds: z.array(z.string().uuid()).optional(),
  customerNote: z.string().max(200).optional(),
});

const CreateOrderSchema = z.object({
  tableId: z.string().uuid(),
  branchId: z.string().uuid(),
  items: z.array(OrderItemSchema).min(1),
  customerNote: z.string().max(200).nullable().optional(),
});

export async function POST(req: NextRequest) {
  // Accept either merchant owner session or staff PIN session
  const cookieStore = await cookies();
  const staffSession = await getStaffSession(cookieStore);

  let placedByStaffId: string | null = null;
  let restaurantId: string | null = null;

  if (staffSession) {
    if (!hasPermission(staffSession.permissions, "orders:manage")) {
      return NextResponse.json(forbiddenResponse("orders:manage"), { status: 403 });
    }
    placedByStaffId = staffSession.staffId;
    restaurantId = staffSession.restaurantId;
  } else {
    // Fall back to merchant owner session
    const session = await requireMerchant();
    restaurantId = session.user.restaurantId;
  }

  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = CreateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { tableId, branchId, items, customerNote } = parsed.data;

  // Verify table and branch belong to this restaurant
  const [table, branch] = await Promise.all([
    prisma.table.findFirst({
      where: { id: tableId, branch: { restaurantId } },
    }),
    prisma.branch.findFirst({
      where: { id: branchId, restaurantId },
    }),
  ]);

  if (!table) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }
  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }
  // Cross-check: table must belong to the specified branch
  if (table.branchId !== branchId) {
    return NextResponse.json(
      { error: "Table does not belong to the specified branch" },
      { status: 409 }
    );
  }

  // Fetch menu items with variants and addons for pricing/snapshotting
  const menuItemIds = items.map((i) => i.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds }, restaurantId, deletedAt: null },
    include: {
      variants: { where: { deletedAt: null } },
      addons: { where: { deletedAt: null } },
      category: { select: { kitchenStationId: true } },
    },
  });

  const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

  // Get restaurant default station for fallback routing
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { defaultStationId: true },
  });

  // Calculate totals and build order items
  const orderItemsData: Array<{
    menuItemId: string;
    name: string;
    unitPrice: number;
    variantPriceDelta: number;
    addonPriceTotal: number;
    lineTotal: number;
    quantity: number;
    variantSnapshot: Record<string, unknown> | null;
    addonSnapshot: Record<string, unknown>[] | null;
    kitchenStationId: string;
  }> = [];

  for (const item of items) {
    const menuItem = menuItemMap.get(item.menuItemId);
    if (!menuItem) {
      return NextResponse.json(
        { error: `Menu item not found: ${item.menuItemId}` },
        { status: 404 }
      );
    }
    if (!menuItem.isAvailable) {
      return NextResponse.json(
        { error: `Menu item not available: ${menuItem.name}` },
        { status: 409 }
      );
    }
    if (menuItem.priceType === "BY_WEIGHT") {
      return NextResponse.json(
        { error: `BY_WEIGHT items cannot be ordered via waiter-assisted mode: ${menuItem.name}` },
        { status: 422 }
      );
    }

    const unitPrice = menuItem.price;
    let variantPriceDelta = 0;
    let variantSnapshot: Record<string, unknown> | null = null;

    if (item.variantId) {
      const variant = menuItem.variants.find((v) => v.id === item.variantId);
      if (variant) {
        variantPriceDelta = variant.priceDelta ?? 0;
        variantSnapshot = { id: variant.id, name: variant.name, priceDelta: variant.priceDelta };
      }
    }

    let addonPriceTotal = 0;
    let addonSnapshot: Record<string, unknown>[] | null = null;

    if (item.addonIds && item.addonIds.length > 0) {
      const selectedAddons = menuItem.addons.filter((a) =>
        item.addonIds!.includes(a.id)
      );
      addonPriceTotal = selectedAddons.reduce(
        (sum, a) => sum + (a.priceDelta ?? 0),
        0
      );
      addonSnapshot = selectedAddons.map((a) => ({
        id: a.id,
        name: a.name,
        priceDelta: a.priceDelta,
      }));
    }

    const itemUnitTotal = unitPrice + variantPriceDelta + addonPriceTotal;
    const lineTotal = itemUnitTotal * item.quantity;

    // Kitchen station routing: item override → category → restaurant default → "unassigned"
    const stationId =
      menuItem.kitchenStationOverride ??
      menuItem.category?.kitchenStationId ??
      restaurant?.defaultStationId ??
      "unassigned";

    orderItemsData.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      unitPrice,
      variantPriceDelta,
      addonPriceTotal,
      lineTotal,
      quantity: item.quantity,
      variantSnapshot,
      addonSnapshot,
      kitchenStationId: stationId,
    });
  }

  const subtotal = orderItemsData.reduce((s, i) => s + i.lineTotal, 0);
  // Tax and service charge are applied at checkout; for waiter-placed orders, simplified to 0
  const grandTotal = subtotal;

  // Get or create today's queue counter for the branch
  const todayKey = formatInTimeZone(new Date(), "Asia/Jakarta", "yyyy-MM-dd");
  const counter = await prisma.queueCounter.upsert({
    where: { branchId_date: { branchId, date: todayKey } },
    update: { lastNumber: { increment: 1 } },
    create: { branchId, date: todayKey, lastNumber: 1 },
  });

  // Create order with items in a transaction
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        branchId,
        orderType: "DINE_IN",
        status: "PENDING",
        queueNumber: counter.lastNumber,
        subtotal,
        taxAmount: 0,
        serviceChargeAmount: 0,
        grandTotal,
        customerNote: customerNote ?? null,
        placedByStaffId,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: true,
        branch: { select: { id: true, name: true } },
      },
    });

    // Log the order creation event
    await tx.orderEvent.create({
      data: {
        orderId: newOrder.id,
        fromStatus: null,
        toStatus: "PENDING",
        actorType: placedByStaffId ? "STAFF" : "MERCHANT",
        actorId: placedByStaffId ?? null,
        actorName: placedByStaffId ? "Waiter" : "Merchant",
        note: "Waiter-assisted order placed",
      },
    });

    return newOrder;
  });

  return NextResponse.json({ order }, { status: 201 });
}
