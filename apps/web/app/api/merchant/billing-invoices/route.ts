/**
 * GET /api/merchant/billing-invoices
 *
 * Lists the authenticated merchant's FBQR subscription invoices.
 * Requires merchant owner session (billing:read permission or owner).
 *
 * Query params:
 *   page     number (default 1)
 *   status   PENDING | PAID | OVERDUE | CANCELLED (optional)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await requireMerchant();
    const merchantId = session.user.merchantId;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const status = searchParams.get("status");
    const pageSize = 20;

    const where = {
      merchantId,
      ...(status ? { status: status as "PENDING" | "PAID" | "OVERDUE" | "CANCELLED" } : {}),
    };

    const [invoices, total] = await Promise.all([
      prisma.merchantBillingInvoice.findMany({
        where,
        select: {
          id: true,
          invoiceNumber: true,
          periodStart: true,
          periodEnd: true,
          amount: true,
          tax: true,
          total: true,
          status: true,
          dueAt: true,
          paidAt: true,
          pdfUrl: true,
          currency: true,
          createdAt: true,
          subscription: {
            select: { plan: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.merchantBillingInvoice.count({ where }),
    ]);

    return NextResponse.json({
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        planName: inv.subscription.plan.name,
        periodStart: inv.periodStart,
        periodEnd: inv.periodEnd,
        amount: inv.amount,
        tax: inv.tax,
        total: inv.total,
        status: inv.status,
        dueAt: inv.dueAt,
        paidAt: inv.paidAt,
        pdfUrl: inv.pdfUrl,
        currency: inv.currency,
        createdAt: inv.createdAt,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    console.error("[GET /api/merchant/billing-invoices]", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan." },
      { status: 500 }
    );
  }
}
