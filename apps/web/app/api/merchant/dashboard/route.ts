/**
 * Merchant dashboard API — GET.
 * Route: GET /api/merchant/dashboard
 *
 * Returns live dashboard data for the merchant's restaurant:
 *   - Stat cards: activeOrders, occupiedTables, totalTables,
 *                 openWaiterRequests, todayRevenue
 *   - Revenue chart: last 7 days (WIB) summed grandTotal per day
 *   - Recent orders: last 10 CONFIRMED+ orders
 *   - Open waiter requests: unresolved WaiterRequest rows
 *   - orderingPaused, orderingPausedMessage from MerchantSettings
 *   - primaryBranchId: first branch for Realtime channel subscription
 *
 * Auth: merchant owner session or staff session with orders:view.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";
import { getStaffSession, hasPermission, forbiddenResponse } from "@/lib/auth/rbac";
import { startOfDay, subDays, format } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const WIB = "Asia/Jakarta";

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies();
  const staffSession = await getStaffSession(cookieStore);

  let restaurantId: string | null = null;

  if (staffSession) {
    if (!hasPermission(staffSession.permissions, "orders:view")) {
      return NextResponse.json(forbiddenResponse("orders:view"), { status: 403 });
    }
    restaurantId = staffSession.restaurantId;
  } else {
    const session = await requireMerchant();
    restaurantId = session.user.restaurantId;
  }

  if (!restaurantId) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  // ── Primary branch (for Realtime channel subscription) ───────────────────
  const primaryBranch = await prisma.branch.findFirst({
    where: { restaurantId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const branchIds = await prisma.branch.findMany({
    where: { restaurantId, deletedAt: null },
    select: { id: true },
  });
  const bIds = branchIds.map((b) => b.id);

  // ── Today boundaries (WIB) ───────────────────────────────────────────────
  const nowWib = toZonedTime(new Date(), WIB);
  const todayStartWib = startOfDay(nowWib);
  const todayStartUtc = fromZonedTime(todayStartWib, WIB);

  // ── Parallel queries ─────────────────────────────────────────────────────
  const [
    activeOrdersCount,
    tableStats,
    openWaiterRequests,
    todayRevenue,
    revenueByDay,
    recentOrders,
    settings,
  ] = await Promise.all([
    // Active orders: PENDING + CONFIRMED + PREPARING + READY
    prisma.order.count({
      where: {
        branchId: { in: bIds },
        status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY"] },
      },
    }),

    // Tables: occupied / total
    prisma.table.groupBy({
      by: ["status"],
      where: { branch: { restaurantId }, deletedAt: null },
      _count: { id: true },
    }),

    // Open waiter requests (not resolved)
    prisma.waiterRequest.findMany({
      where: {
        branchId: { in: bIds },
        resolvedAt: null,
      },
      include: {
        table: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),

    // Today's revenue (sum of CONFIRMED+ grandTotal)
    prisma.order.aggregate({
      where: {
        branchId: { in: bIds },
        status: { in: ["CONFIRMED", "PREPARING", "READY", "COMPLETED"] },
        confirmedAt: { gte: todayStartUtc },
      },
      _sum: { grandTotal: true },
    }),

    // Last 7 days revenue per day (WIB date)
    prisma.order.findMany({
      where: {
        branchId: { in: bIds },
        status: { in: ["CONFIRMED", "PREPARING", "READY", "COMPLETED"] },
        confirmedAt: {
          gte: fromZonedTime(startOfDay(subDays(nowWib, 6)), WIB),
        },
      },
      select: {
        confirmedAt: true,
        grandTotal: true,
      },
    }),

    // Recent 10 orders
    prisma.order.findMany({
      where: {
        branchId: { in: bIds },
        status: { notIn: ["PENDING"] },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        customerSession: {
          select: {
            table: { select: { name: true } },
          },
        },
        items: {
          select: { itemName: true, quantity: true },
          take: 3,
        },
      },
    }),

    // Settings (orderingPaused, orderingPausedMessage)
    prisma.merchantSettings.findFirst({
      where: { restaurantId },
      select: { orderingPaused: true, orderingPausedMessage: true },
    }),
  ]);

  // ── Process table stats ──────────────────────────────────────────────────
  let occupiedTables = 0;
  let totalTables = 0;
  for (const row of tableStats) {
    totalTables += row._count.id;
    if (row.status === "OCCUPIED") occupiedTables += row._count.id;
  }

  // ── Build 7-day revenue chart ────────────────────────────────────────────
  const revenueMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const dayWib = subDays(nowWib, i);
    const key = format(dayWib, "yyyy-MM-dd");
    revenueMap[key] = 0;
  }
  for (const order of revenueByDay) {
    if (!order.confirmedAt) continue;
    const dayWib = toZonedTime(order.confirmedAt, WIB);
    const key = format(dayWib, "yyyy-MM-dd");
    if (key in revenueMap) {
      revenueMap[key] += order.grandTotal;
    }
  }
  const chartData = Object.entries(revenueMap).map(([date, revenue]) => ({
    date,
    label: format(new Date(date + "T00:00:00"), "d/M"),
    revenue,
  }));

  // ── Format recent orders ─────────────────────────────────────────────────
  const formattedOrders = recentOrders.map((o) => ({
    id: o.id,
    queueNumber: o.queueNumber,
    tableName: o.customerSession?.table?.name ?? "—",
    itemSummary:
      o.items
        .slice(0, 2)
        .map((i) => `${i.quantity}× ${i.itemName}`)
        .join(", ") + (o.items.length > 2 ? ` +${o.items.length - 2} lagi` : ""),
    itemCount: o.items.length,
    grandTotal: o.grandTotal,
    status: o.status,
    orderType: o.orderType,
    createdAt: o.createdAt.toISOString(),
  }));

  // ── Format waiter requests ───────────────────────────────────────────────
  const formattedWaiterRequests = openWaiterRequests.map((wr) => ({
    id: wr.id,
    type: wr.type,
    tableName: wr.table.name,
    createdAt: wr.createdAt.toISOString(),
  }));

  return NextResponse.json({
    primaryBranchId: primaryBranch?.id ?? null,
    activeOrders: activeOrdersCount,
    occupiedTables,
    totalTables,
    openWaiterRequests: formattedWaiterRequests.length,
    todayRevenue: todayRevenue._sum.grandTotal ?? 0,
    chartData,
    recentOrders: formattedOrders,
    waiterRequests: formattedWaiterRequests,
    orderingPaused: settings?.orderingPaused ?? false,
    orderingPausedMessage: settings?.orderingPausedMessage ?? null,
  });
}
