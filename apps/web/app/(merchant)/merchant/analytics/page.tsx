/**
 * Merchant analytics dashboard — server component.
 * Route: /merchant/analytics
 * Permission: reports:read (owner always allowed)
 *
 * Fetches branches for the branch selector, then delegates all data
 * fetching to the client (AnalyticsDashboard) via the analytics API.
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireMerchant } from "@/lib/auth/session";
import { prisma } from "@repo/database";
import { AnalyticsDashboard } from "@/components/merchant/analytics-dashboard";

export const metadata: Metadata = { title: "Analitik" };

export default async function MerchantAnalyticsPage() {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) redirect("/merchant/dashboard");

  const branches = await prisma.branch.findMany({
    where: { restaurantId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Analitik</h1>
        <p className="text-sm text-stone-500 mt-1">
          Laporan penjualan, pesanan, dan performa menu
        </p>
      </div>
      <AnalyticsDashboard branches={branches} />
    </div>
  );
}
