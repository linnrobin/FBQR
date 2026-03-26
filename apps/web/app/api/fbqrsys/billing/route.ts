/**
 * GET /api/fbqrsys/billing — list merchant billing invoices (with filter/pagination)
 *
 * Requires: billing:manage
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireSystemAdmin } from "@/lib/auth/session";
import {
  getSystemAdminPermissions,
  hasPermission,
  forbiddenResponse,
} from "@/lib/auth/rbac";
import type { BillingInvoiceStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await requireSystemAdmin();
  const permissions = await getSystemAdminPermissions(session.user.id);
  if (!hasPermission(permissions, "billing:manage")) {
    return NextResponse.json(forbiddenResponse("billing:manage"), {
      status: 403,
    });
  }

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") ?? "";
  const planId = searchParams.get("planId") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = 25;

  const statusFilter =
    status && status !== "ALL"
      ? { status: status as BillingInvoiceStatus }
      : {};

  const planFilter =
    planId && planId !== "ALL"
      ? { subscription: { planId } }
      : {};

  const dateFilter =
    dateFrom || dateTo
      ? {
          dueAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {};

  const where = { ...statusFilter, ...planFilter, ...dateFilter };

  const [invoices, total] = await Promise.all([
    prisma.merchantBillingInvoice.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        subscription: {
          include: {
            plan: { select: { id: true, name: true } },
            merchant: {
              include: {
                restaurant: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.merchantBillingInvoice.count({ where }),
  ]);

  return NextResponse.json({
    invoices,
    total,
    page,
    totalPages: Math.ceil(total / pageSize),
  });
}
