/**
 * Merchant billing invoices page — server component.
 * Route: /merchant/billing
 *
 * Shows the merchant's FBQR subscription invoices with download links.
 */
import { requireMerchant } from "@/lib/auth/session";
import { prisma } from "@repo/database";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { BillingInvoicesClient } from "./billing-invoices-client";

export const metadata: Metadata = { title: "Tagihan Langganan" };

export default async function MerchantBillingPage() {
  const session = await requireMerchant();
  const merchantId = session.user.merchantId;
  if (!merchantId) redirect("/merchant/dashboard");

  // Fetch current subscription plan for display
  const subscription = await prisma.merchantSubscription.findUnique({
    where: { merchantId },
    select: {
      cycle: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      autoRenew: true,
      plan: { select: { name: true, priceMonthly: true, priceAnnual: true } },
    },
  });

  // Fetch invoices (first page — client handles pagination)
  const invoices = await prisma.merchantBillingInvoice.findMany({
    where: { merchantId },
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
    take: 20,
  });

  const formattedInvoices = invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    planName: inv.subscription.plan.name,
    periodStart: inv.periodStart.toISOString(),
    periodEnd: inv.periodEnd.toISOString(),
    amount: inv.amount,
    tax: inv.tax,
    total: inv.total,
    status: inv.status as string,
    dueAt: inv.dueAt.toISOString(),
    paidAt: inv.paidAt?.toISOString() ?? null,
    pdfUrl: inv.pdfUrl,
    currency: inv.currency,
    createdAt: inv.createdAt.toISOString(),
  }));

  return (
    <BillingInvoicesClient
      subscription={
        subscription
          ? {
              planName: subscription.plan.name,
              cycle: subscription.cycle,
              currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
              autoRenew: subscription.autoRenew,
              priceMonthly: subscription.plan.priceMonthly,
              priceAnnual: subscription.plan.priceAnnual,
            }
          : null
      }
      initialInvoices={formattedInvoices}
    />
  );
}
