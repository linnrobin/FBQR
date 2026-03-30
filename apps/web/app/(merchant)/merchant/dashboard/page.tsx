/**
 * Merchant POS dashboard — home screen.
 * Route: /merchant/dashboard
 *
 * If onboardingStep < 6, redirects to the appropriate wizard step.
 * If onboardingStep >= 6, shows the full live dashboard (stat cards,
 * ordering toggle, revenue chart, recent orders, waiter requests).
 *
 * Spec: docs/merchant.md § Screen 3 — Dashboard / Home
 */
import { redirect } from "next/navigation";
import { requireMerchant } from "@/lib/auth/session";
import { prisma } from "@repo/database";
import { MerchantDashboardClient } from "./dashboard-client";
import { startOfDay, subDays, format } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const WIB = "Asia/Jakarta";

export default async function MerchantDashboardPage() {
  const session = await requireMerchant();
  const merchantId = session.user.id;

  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: {
      onboardingStep: true,
      onboardingChecklist: true,
      wizardCompletedAt: true,
      status: true,
      trialEndsAt: true,
      restaurant: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!merchant) {
    redirect("/merchant/login");
  }

  // Redirect to wizard if not complete (steps 1 and 3 are required)
  if (merchant.onboardingStep < 1) redirect("/merchant/onboarding/step-1");
  if (merchant.onboardingStep === 1) redirect("/merchant/onboarding/step-2");
  if (merchant.onboardingStep === 2) redirect("/merchant/onboarding/step-3");

  const restaurantId = merchant.restaurant?.id;
  if (!restaurantId) redirect("/merchant/login");

  const checklist = Array.isArray(merchant.onboardingChecklist)
    ? (merchant.onboardingChecklist as string[])
    : [];

  // Compute trial days remaining
  let trialDaysLeft: number | null = null;
  if (merchant.status === "TRIAL" && merchant.trialEndsAt) {
    const ms = merchant.trialEndsAt.getTime() - Date.now();
    trialDaysLeft = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }

  // ── Fetch initial dashboard data ────────────────────────────────────────
  const branches = await prisma.branch.findMany({
    where: { restaurantId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const bIds = branches.map((b) => b.id);
  const primaryBranchId = branches[0]?.id ?? null;

  const nowWib = toZonedTime(new Date(), WIB);
  const todayStartUtc = fromZonedTime(startOfDay(nowWib), WIB);
  const sevenDaysAgoUtc = fromZonedTime(startOfDay(subDays(nowWib, 6)), WIB);

  const [
    activeOrdersCount,
    tableStats,
    openWaiterRequests,
    todayRevenue,
    revenueByDay,
    recentOrders,
    settings,
  ] = await Promise.all([
    prisma.order.count({
      where: {
        branchId: { in: bIds },
        status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY"] },
      },
    }),

    prisma.table.groupBy({
      by: ["status"],
      where: { branch: { restaurantId }, deletedAt: null },
      _count: { id: true },
    }),

    prisma.waiterRequest.findMany({
      where: { branchId: { in: bIds }, resolvedAt: null },
      include: { table: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),

    prisma.order.aggregate({
      where: {
        branchId: { in: bIds },
        status: { in: ["CONFIRMED", "PREPARING", "READY", "COMPLETED"] },
        confirmedAt: { gte: todayStartUtc },
      },
      _sum: { grandTotal: true },
    }),

    prisma.order.findMany({
      where: {
        branchId: { in: bIds },
        status: { in: ["CONFIRMED", "PREPARING", "READY", "COMPLETED"] },
        confirmedAt: { gte: sevenDaysAgoUtc },
      },
      select: { confirmedAt: true, grandTotal: true },
    }),

    prisma.order.findMany({
      where: { branchId: { in: bIds }, status: { notIn: ["PENDING"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        customerSession: { select: { table: { select: { name: true } } } },
        items: { select: { itemName: true, quantity: true }, take: 3 },
      },
    }),

    prisma.merchantSettings.findFirst({
      where: { restaurantId },
      select: { orderingPaused: true, orderingPausedMessage: true },
    }),
  ]);

  // Process table stats
  let occupiedTables = 0;
  let totalTables = 0;
  for (const row of tableStats) {
    totalTables += row._count.id;
    if (row.status === "OCCUPIED") occupiedTables += row._count.id;
  }

  // Build 7-day revenue chart
  const revenueMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    revenueMap[format(subDays(nowWib, i), "yyyy-MM-dd")] = 0;
  }
  for (const order of revenueByDay) {
    if (!order.confirmedAt) continue;
    const key = format(toZonedTime(order.confirmedAt, WIB), "yyyy-MM-dd");
    if (key in revenueMap) revenueMap[key] += order.grandTotal;
  }
  const chartData = Object.entries(revenueMap).map(([date, revenue]) => ({
    date,
    label: format(new Date(date + "T00:00:00"), "d/M"),
    revenue,
  }));

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

  const formattedWaiterRequests = openWaiterRequests.map((wr) => ({
    id: wr.id,
    type: wr.type,
    tableName: wr.table.name,
    createdAt: wr.createdAt.toISOString(),
  }));

  const initialData = {
    primaryBranchId,
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
  };

  return (
    <MerchantDashboardClient
      restaurantName={merchant.restaurant?.name ?? "Restoran Anda"}
      merchantStatus={merchant.status}
      trialDaysLeft={trialDaysLeft}
      onboardingChecklist={checklist}
      wizardComplete={merchant.onboardingStep >= 6}
      initialData={initialData}
    />
  );
}
