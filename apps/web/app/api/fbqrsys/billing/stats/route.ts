/**
 * GET /api/fbqrsys/billing/stats — billing overview stats
 * Returns: MRR, invoices issued, overdue count, collection rate
 *
 * Requires: billing:manage
 */
import { NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireSystemAdmin } from "@/lib/auth/session";
import {
  getSystemAdminPermissions,
  hasPermission,
  forbiddenResponse,
} from "@/lib/auth/rbac";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET() {
  const session = await requireSystemAdmin();
  const permissions = await getSystemAdminPermissions(session.user.id);
  if (!hasPermission(permissions, "billing:manage")) {
    return NextResponse.json(forbiddenResponse("billing:manage"), {
      status: 403,
    });
  }

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Active subscriptions for MRR
  const activeSubscriptions = await prisma.merchantSubscription.findMany({
    where: {
      merchant: { status: "ACTIVE" },
    },
    include: {
      plan: { select: { priceMonthly: true, priceAnnual: true } },
    },
  });

  // MRR: sum of monthly equivalent for all active subscriptions
  const mrr = activeSubscriptions.reduce((sum, sub) => {
    const monthly =
      sub.cycle === "ANNUAL"
        ? Math.round(sub.plan.priceAnnual / 12)
        : sub.plan.priceMonthly;
    return sum + monthly;
  }, 0);

  // Invoices this month
  const [issuedThisMonth, overdueCount, paidThisMonth, totalIssuedThisMonth] =
    await Promise.all([
      prisma.merchantBillingInvoice.count({
        where: {
          createdAt: { gte: monthStart, lte: monthEnd },
          status: { not: "CANCELLED" },
        },
      }),
      prisma.merchantBillingInvoice.count({
        where: { status: "OVERDUE" },
      }),
      prisma.merchantBillingInvoice.count({
        where: {
          createdAt: { gte: monthStart, lte: monthEnd },
          status: "PAID",
        },
      }),
      prisma.merchantBillingInvoice.count({
        where: {
          createdAt: { gte: monthStart, lte: monthEnd },
          status: { not: "CANCELLED" },
        },
      }),
    ]);

  const collectionRate =
    totalIssuedThisMonth > 0
      ? Math.round((paidThisMonth / totalIssuedThisMonth) * 100)
      : 100;

  return NextResponse.json({
    mrr,
    issuedThisMonth,
    overdueCount,
    collectionRate,
  });
}
