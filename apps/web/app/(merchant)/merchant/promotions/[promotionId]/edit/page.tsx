/**
 * Edit Promotion page — server component.
 * Route: /merchant/promotions/[promotionId]/edit
 */
import { requireMerchant } from "@/lib/auth/session";
import { prisma } from "@repo/database";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PromotionForm } from "../../promotion-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Edit Promosi" };

export default async function EditPromotionPage({
  params,
}: {
  params: Promise<{ promotionId: string }>;
}) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) redirect("/merchant/dashboard");

  const { promotionId } = await params;

  const [promotion, categories, menuItems] = await Promise.all([
    prisma.promotion.findFirst({
      where: { id: promotionId, restaurantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        description: true,
        discountType: true,
        discountValue: true,
        maximumDiscountAmount: true,
        minimumOrderValue: true,
        applicableTo: true,
        applicableItemIds: true,
        code: true,
        usageLimit: true,
        perCustomerLimit: true,
        validFrom: true,
        validTo: true,
        isActive: true,
      },
    }),
    prisma.menuCategory.findMany({
      where: { restaurantId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.menuItem.findMany({
      where: {
        category: { restaurantId },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        category: { select: { name: true } },
      },
      orderBy: { displayOrder: "asc" },
    }),
  ]);

  if (!promotion) notFound();

  const menuItemsMapped = menuItems.map((it) => ({
    id: it.id,
    name: it.name,
    category: it.category.name,
  }));

  // Convert Prisma types to form values
  const initial = {
    name: promotion.name,
    description: promotion.description ?? "",
    discountType: promotion.discountType as "PERCENTAGE" | "FIXED_AMOUNT" | "BOGO" | "FREE_ITEM",
    discountValue: promotion.discountValue,
    maximumDiscountAmount: promotion.maximumDiscountAmount,
    minimumOrderValue: promotion.minimumOrderValue,
    applicableTo: promotion.applicableTo as "ALL_ITEMS" | "SPECIFIC_CATEGORIES" | "SPECIFIC_ITEMS",
    applicableItemIds: Array.isArray(promotion.applicableItemIds)
      ? (promotion.applicableItemIds as string[])
      : [],
    code: promotion.code ?? "",
    usageLimit: promotion.usageLimit,
    perCustomerLimit: promotion.perCustomerLimit,
    validFrom: promotion.validFrom
      ? new Date(promotion.validFrom).toISOString().slice(0, 16)
      : "",
    validTo: promotion.validTo
      ? new Date(promotion.validTo).toISOString().slice(0, 16)
      : "",
    isActive: promotion.isActive,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/merchant/promotions"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Promosi</h1>
      </div>

      <PromotionForm
        promotionId={promotionId}
        initial={initial}
        categories={categories}
        menuItems={menuItemsMapped}
      />
    </div>
  );
}
