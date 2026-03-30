/**
 * Merchant analytics API — GET.
 * Route: GET /api/merchant/analytics
 *
 * Returns aggregated analytics for the merchant's restaurant/branch for a given
 * date range. Requires merchant owner session or staff session with reports:read.
 *
 * Query params:
 *   from     — ISO date string (inclusive start)
 *   to       — ISO date string (inclusive end)
 *   branchId — optional branch UUID; omit for all branches (multi-branch aggregate)
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";
import { getStaffSession, hasPermission, forbiddenResponse } from "@/lib/auth/rbac";
import { startOfDay, endOfDay, eachDayOfInterval, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const WIB = "Asia/Jakarta";

/**
 * Parse a date string and return the start/end of that day in WIB,
 * converted to UTC for DB queries.
 */
function parseRange(fromStr: string, toStr: string): { from: Date; to: Date } {
  const fromWib = startOfDay(toZonedTime(new Date(fromStr), WIB));
  const toWib = endOfDay(toZonedTime(new Date(toStr), WIB));
  return { from: fromWib, to: toWib };
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const staffSession = await getStaffSession(cookieStore);

  let restaurantId: string | null = null;

  if (staffSession) {
    if (!hasPermission(staffSession.permissions, "reports:read")) {
      return NextResponse.json(forbiddenResponse("reports:read"), { status: 403 });
    }
    restaurantId = staffSession.restaurantId;
  } else {
    const session = await requireMerchant();
    restaurantId = session.user.restaurantId;
  }

  if (!restaurantId) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  const { searchParams } = req.nextUrl;
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const branchIdParam = searchParams.get("branchId");

  if (!fromStr || !toStr) {
    return NextResponse.json(
      { error: "from and to query params are required" },
      { status: 400 }
    );
  }

  let dateFrom: Date, dateTo: Date;
  try {
    const range = parseRange(fromStr, toStr);
    dateFrom = range.from;
    dateTo = range.to;
  } catch {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  // Resolve branch IDs for this query
  let branchIds: string[];
  if (branchIdParam) {
    // Verify branch belongs to restaurant
    const branch = await prisma.branch.findFirst({
      where: { id: branchIdParam, restaurantId },
      select: { id: true },
    });
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }
    branchIds = [branchIdParam];
  } else {
    const branches = await prisma.branch.findMany({
      where: { restaurantId },
      select: { id: true },
    });
    branchIds = branches.map((b) => b.id);
  }

  if (branchIds.length === 0) {
    return NextResponse.json({ error: "No branches found" }, { status: 404 });
  }

  // Confirmed order statuses for revenue calculation
  const confirmedStatuses = ["CONFIRMED", "PREPARING", "READY", "COMPLETED"] as const;

  // ── REVENUE STATS ──────────────────────────────────────────────────────────
  const revenueAgg = await prisma.order.aggregate({
    where: {
      branchId: { in: branchIds },
      status: { in: confirmedStatuses },
      confirmedAt: { gte: dateFrom, lte: dateTo },
    },
    _sum: {
      grandTotal: true,
      taxAmount: true,
      serviceChargeAmount: true,
    },
    _count: { id: true },
  });

  const grossRevenue = revenueAgg._sum.grandTotal ?? 0;
  const taxCollected = revenueAgg._sum.taxAmount ?? 0;
  const serviceChargeCollected = revenueAgg._sum.serviceChargeAmount ?? 0;
  const totalOrders = revenueAgg._count.id;

  // ── REVENUE TREND (daily) ──────────────────────────────────────────────────
  const ordersForTrend = await prisma.order.findMany({
    where: {
      branchId: { in: branchIds },
      status: { in: confirmedStatuses },
      confirmedAt: { gte: dateFrom, lte: dateTo },
    },
    select: { confirmedAt: true, grandTotal: true },
  });

  // Build daily map
  const days = eachDayOfInterval({ start: dateFrom, end: dateTo });
  const trendMap = new Map<string, number>();
  for (const d of days) {
    trendMap.set(format(d, "yyyy-MM-dd"), 0);
  }
  for (const o of ordersForTrend) {
    if (!o.confirmedAt) continue;
    const dayKey = format(toZonedTime(o.confirmedAt, WIB), "yyyy-MM-dd");
    trendMap.set(dayKey, (trendMap.get(dayKey) ?? 0) + o.grandTotal);
  }
  const revenueTrend = Array.from(trendMap.entries()).map(([date, total]) => ({
    date,
    total,
  }));

  // ── REVENUE BY ORDER TYPE ──────────────────────────────────────────────────
  const ordersByType = await prisma.order.groupBy({
    by: ["orderType"],
    where: {
      branchId: { in: branchIds },
      status: { in: confirmedStatuses },
      confirmedAt: { gte: dateFrom, lte: dateTo },
    },
    _sum: { grandTotal: true },
  });
  const revenueByOrderType = ordersByType.map((r) => ({
    type: r.orderType,
    total: r._sum.grandTotal ?? 0,
  }));

  // ── REVENUE BY PAYMENT METHOD ──────────────────────────────────────────────
  const paymentMethodRevenue = await prisma.payment.groupBy({
    by: ["method"],
    where: {
      status: "SUCCESS",
      paymentType: "FULL",
      order: {
        branchId: { in: branchIds },
        confirmedAt: { gte: dateFrom, lte: dateTo },
      },
    },
    _sum: { amount: true },
  });
  const revenueByPaymentMethod = paymentMethodRevenue.map((r) => ({
    method: r.method,
    total: r._sum.amount ?? 0,
  }));

  // ── ESTIMATED GATEWAY FEES ─────────────────────────────────────────────────
  // QRIS 0.7%, EWALLET 2%, VA Rp 4.000/txn, CARD 2.9%
  let estimatedGatewayFees = 0;
  for (const r of revenueByPaymentMethod) {
    switch (r.method) {
      case "QRIS":
        estimatedGatewayFees += Math.round(r.total * 0.007);
        break;
      case "EWALLET":
        estimatedGatewayFees += Math.round(r.total * 0.02);
        break;
      case "CARD":
        estimatedGatewayFees += Math.round(r.total * 0.029);
        break;
      case "VA": {
        // Count VA transactions
        const vaCount = await prisma.payment.count({
          where: {
            method: "VA",
            status: "SUCCESS",
            paymentType: "FULL",
            order: {
              branchId: { in: branchIds },
              confirmedAt: { gte: dateFrom, lte: dateTo },
            },
          },
        });
        estimatedGatewayFees += vaCount * 4000;
        break;
      }
    }
  }

  // ── ORDER ANALYTICS ────────────────────────────────────────────────────────
  const cancelledOrders = await prisma.order.count({
    where: {
      branchId: { in: branchIds },
      status: "CANCELLED",
      createdAt: { gte: dateFrom, lte: dateTo },
    },
  });
  const allOrdersInPeriod = await prisma.order.count({
    where: {
      branchId: { in: branchIds },
      createdAt: { gte: dateFrom, lte: dateTo },
    },
  });

  const aov = totalOrders > 0 ? Math.round(grossRevenue / totalOrders) : 0;
  const cancellationRate =
    allOrdersInPeriod > 0
      ? Math.round((cancelledOrders / allOrdersInPeriod) * 10000) / 100
      : 0;

  // Orders by hour of day (WIB)
  const ordersForHourBreakdown = await prisma.order.findMany({
    where: {
      branchId: { in: branchIds },
      status: { in: confirmedStatuses },
      confirmedAt: { gte: dateFrom, lte: dateTo },
    },
    select: { confirmedAt: true },
  });

  const hourMap = new Array(24).fill(0);
  for (const o of ordersForHourBreakdown) {
    if (!o.confirmedAt) continue;
    const h = toZonedTime(o.confirmedAt, WIB).getHours();
    hourMap[h]++;
  }
  const ordersByHour = hourMap.map((count, hour) => ({ hour, count }));

  // Orders by day of week (WIB) — 0=Sun…6=Sat
  const dowMap = new Array(7).fill(0);
  for (const o of ordersForHourBreakdown) {
    if (!o.confirmedAt) continue;
    const d = toZonedTime(o.confirmedAt, WIB).getDay();
    dowMap[d]++;
  }
  const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const ordersByDow = dowMap.map((count, i) => ({
    day: DAY_NAMES[i],
    count,
  }));

  // ── MENU PERFORMANCE ───────────────────────────────────────────────────────
  // Top 10 by revenue
  const topItemsByRevenue = await prisma.orderItem.groupBy({
    by: ["menuItemId", "name"],
    where: {
      order: {
        branchId: { in: branchIds },
        status: { in: confirmedStatuses },
        confirmedAt: { gte: dateFrom, lte: dateTo },
      },
    },
    _sum: { lineTotal: true },
    _count: { id: true },
    orderBy: { _sum: { lineTotal: "desc" } },
    take: 10,
  });

  // Top 10 by order count
  const topItemsByCount = await prisma.orderItem.groupBy({
    by: ["menuItemId", "name"],
    where: {
      order: {
        branchId: { in: branchIds },
        status: { in: confirmedStatuses },
        confirmedAt: { gte: dateFrom, lte: dateTo },
      },
    },
    _sum: { lineTotal: true },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });

  // Slowest moving items — items that had any orders but fewest in period
  const slowestItems = await prisma.orderItem.groupBy({
    by: ["menuItemId", "name"],
    where: {
      order: {
        branchId: { in: branchIds },
        status: { in: confirmedStatuses },
        confirmedAt: { gte: dateFrom, lte: dateTo },
      },
    },
    _count: { id: true },
    _max: { createdAt: true },
    orderBy: { _count: { id: "asc" } },
    take: 10,
  });

  // ── TABLE ANALYTICS ────────────────────────────────────────────────────────
  const sessionCount = await prisma.customerSession.count({
    where: {
      branchId: { in: branchIds },
      status: "COMPLETED",
      createdAt: { gte: dateFrom, lte: dateTo },
    },
  });
  const tableCount = await prisma.table.count({
    where: { branchId: { in: branchIds } },
  });

  // Avg spend per session
  const sessionSpend = await prisma.order.aggregate({
    where: {
      branchId: { in: branchIds },
      status: { in: confirmedStatuses },
      confirmedAt: { gte: dateFrom, lte: dateTo },
      customerSessionId: { not: null },
    },
    _avg: { grandTotal: true },
  });

  // Busiest table
  const tableSessions = await prisma.customerSession.groupBy({
    by: ["tableId"],
    where: {
      branchId: { in: branchIds },
      status: "COMPLETED",
      createdAt: { gte: dateFrom, lte: dateTo },
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 1,
  });

  let busiestTableName: string | null = null;
  let busiestTableCount = 0;
  if (tableSessions.length > 0) {
    const busiestTable = await prisma.table.findUnique({
      where: { id: tableSessions[0].tableId },
      select: { name: true },
    });
    busiestTableName = busiestTable?.name ?? null;
    busiestTableCount = tableSessions[0]._count.id;
  }

  const periodDays = Math.max(
    1,
    Math.round((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24))
  );
  const avgTurnoverRate =
    tableCount > 0
      ? Math.round((sessionCount / tableCount / periodDays) * 100) / 100
      : 0;

  // ── RATINGS ────────────────────────────────────────────────────────────────
  const ratingsAgg = await prisma.orderRating.aggregate({
    where: {
      order: {
        branchId: { in: branchIds },
        confirmedAt: { gte: dateFrom, lte: dateTo },
      },
    },
    _avg: { rating: true },
    _count: { id: true },
  });

  const ratingDistribution = await prisma.orderRating.groupBy({
    by: ["rating"],
    where: {
      order: {
        branchId: { in: branchIds },
        confirmedAt: { gte: dateFrom, lte: dateTo },
      },
    },
    _count: { id: true },
  });

  const recentComments = await prisma.orderRating.findMany({
    where: {
      comment: { not: null },
      order: {
        branchId: { in: branchIds },
        confirmedAt: { gte: dateFrom, lte: dateTo },
      },
    },
    select: {
      rating: true,
      comment: true,
      createdAt: true,
      order: { select: { confirmedAt: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    revenue: {
      grossRevenue,
      taxCollected,
      serviceChargeCollected,
      estimatedGatewayFees,
      netRevenue: Math.max(0, grossRevenue - estimatedGatewayFees - taxCollected),
      trend: revenueTrend,
      byOrderType: revenueByOrderType,
      byPaymentMethod: revenueByPaymentMethod,
    },
    orders: {
      total: totalOrders,
      aov,
      cancellationRate,
      byHour: ordersByHour,
      byDow: ordersByDow,
    },
    menu: {
      topByRevenue: topItemsByRevenue.map((i) => ({
        name: i.name,
        total: i._sum.lineTotal ?? 0,
        count: i._count.id,
      })),
      topByCount: topItemsByCount.map((i) => ({
        name: i.name,
        total: i._sum.lineTotal ?? 0,
        count: i._count.id,
      })),
      slowest: slowestItems.map((i) => ({
        name: i.name,
        count: i._count.id,
        lastOrderedAt: i._max.createdAt?.toISOString() ?? null,
      })),
    },
    tables: {
      avgTurnoverRate,
      avgSpendPerSession: Math.round(sessionSpend._avg.grandTotal ?? 0),
      busiestTableName,
      busiestTableCount,
    },
    ratings: {
      avg: ratingsAgg._avg.rating
        ? Math.round(ratingsAgg._avg.rating * 10) / 10
        : null,
      count: ratingsAgg._count.id,
      distribution: ratingDistribution
        .map((r) => ({ rating: r.rating, count: r._count.id }))
        .sort((a, b) => a.rating - b.rating),
      recentComments: recentComments.map((r) => ({
        rating: r.rating,
        comment: r.comment ?? "",
        date: r.order.confirmedAt?.toISOString() ?? r.createdAt.toISOString(),
      })),
    },
  });
}
