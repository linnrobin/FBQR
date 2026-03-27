/**
 * Promotions page — server component.
 * Route: /merchant/promotions
 *
 * Fetches all active promotions and passes to PromotionsClient.
 */
import { requireMerchant } from "@/lib/auth/session";
import { prisma } from "@repo/database";
import { redirect } from "next/navigation";
import { PromotionsClient } from "./promotions-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Promosi" };

export default async function PromotionsPage() {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) redirect("/merchant/dashboard");

  const promotions = await prisma.promotion.findMany({
    where: { restaurantId, deletedAt: null },
    select: {
      id: true,
      name: true,
      description: true,
      discountType: true,
      discountValue: true,
      maximumDiscountAmount: true,
      minimumOrderValue: true,
      applicableTo: true,
      code: true,
      usageLimit: true,
      usageCount: true,
      perCustomerLimit: true,
      validFrom: true,
      validTo: true,
      isActive: true,
      deletedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <PromotionsClient initialPromotions={promotions as any} />;
}
