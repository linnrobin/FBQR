/**
 * GET /api/fbqrsys/dashboard
 * Returns platform-level metrics for the FBQRSYS dashboard.
 * Requires: reports:read
 */
import { NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireSystemAdmin } from "@/lib/auth/session";
import {
  getSystemAdminPermissions,
  hasPermission,
  forbiddenResponse,
} from "@/lib/auth/rbac";
import { startOfMonth, subMonths } from "date-fns";

export async function GET() {
  const session = await requireSystemAdmin();
  const permissions = await getSystemAdminPermissions(session.user.id);
  if (!hasPermission(permissions, "reports:read")) {
    return NextResponse.json(forbiddenResponse("reports:read"), {
      status: 403,
    });
  }

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));

  const [
    activeCount,
    trialCount,
    suspendedCount,
    cancelledCount,
    activeLastMonth,
    trialLastMonth,
    suspendedLastMonth,
    newSignupsThisMonth,
    newSignupsLastMonth,
  ] = await Promise.all([
    prisma.merchant.count({ where: { status: "ACTIVE" } }),
    prisma.merchant.count({ where: { status: "TRIAL" } }),
    prisma.merchant.count({ where: { status: "SUSPENDED" } }),
    prisma.merchant.count({ where: { status: "CANCELLED" } }),
    prisma.merchant.count({
      where: {
        status: "ACTIVE",
        createdAt: { lt: thisMonthStart },
      },
    }),
    prisma.merchant.count({
      where: {
        status: "TRIAL",
        createdAt: { lt: thisMonthStart },
      },
    }),
    prisma.merchant.count({
      where: {
        status: "SUSPENDED",
        createdAt: { lt: thisMonthStart },
      },
    }),
    prisma.merchant.count({
      where: { createdAt: { gte: thisMonthStart } },
    }),
    prisma.merchant.count({
      where: {
        createdAt: { gte: lastMonthStart, lt: thisMonthStart },
      },
    }),
  ]);

  // MRR — sum of active monthly subscriptions
  const activeSubscriptions = await prisma.merchantSubscription.findMany({
    where: { merchant: { status: "ACTIVE" } },
    select: {
      cycle: true,
      plan: { select: { priceMonthly: true, priceAnnual: true } },
    },
  });

  const mrr = activeSubscriptions.reduce((sum, sub) => {
    const monthlyEquivalent =
      sub.cycle === "ANNUAL"
        ? Math.round(sub.plan.priceAnnual / 12)
        : sub.plan.priceMonthly;
    return sum + monthlyEquivalent;
  }, 0);

  // Merchant growth — last 30 days (daily counts of ACTIVE and TRIAL)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentMerchants = await prisma.merchant.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: { createdAt: true, status: true },
    orderBy: { createdAt: "asc" },
  });

  // Build daily growth series
  const growthByDay: Record<string, { active: number; trial: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    growthByDay[key] = { active: 0, trial: 0 };
  }
  for (const m of recentMerchants) {
    const key = m.createdAt.toISOString().slice(0, 10);
    if (growthByDay[key]) {
      if (m.status === "ACTIVE") growthByDay[key].active++;
      else if (m.status === "TRIAL") growthByDay[key].trial++;
    }
  }
  const merchantGrowth = Object.entries(growthByDay).map(([date, counts]) => ({
    date,
    ...counts,
  }));

  // New signups trend — last 30 days
  const signupsByDay: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    signupsByDay[d.toISOString().slice(0, 10)] = 0;
  }
  for (const m of recentMerchants) {
    const key = m.createdAt.toISOString().slice(0, 10);
    if (signupsByDay[key] !== undefined) signupsByDay[key]++;
  }
  const signupsTrend = Object.entries(signupsByDay).map(([date, count]) => ({
    date,
    count,
  }));

  const signupDelta =
    newSignupsLastMonth > 0
      ? Math.round(
          ((newSignupsThisMonth - newSignupsLastMonth) /
            newSignupsLastMonth) *
            100
        )
      : null;

  return NextResponse.json({
    stats: {
      activeMerchants: activeCount,
      activeDelta: activeCount - activeLastMonth,
      trialMerchants: trialCount,
      trialDelta: trialCount - trialLastMonth,
      suspendedMerchants: suspendedCount,
      suspendedDelta: suspendedCount - suspendedLastMonth,
      cancelledMerchants: cancelledCount,
      newSignupsThisMonth,
      newSignupsDelta: signupDelta,
      mrr,
      arr: mrr * 12,
    },
    charts: {
      merchantGrowth,
      signupsTrend,
    },
  });
}
