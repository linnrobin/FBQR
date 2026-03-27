/**
 * Create Promotion page — server component.
 * Route: /merchant/promotions/new
 */
import { requireMerchant } from "@/lib/auth/session";
import { prisma } from "@repo/database";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PromotionForm } from "../promotion-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Buat Promosi" };

export default async function NewPromotionPage() {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) redirect("/merchant/dashboard");

  const [categories, menuItems] = await Promise.all([
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

  const menuItemsMapped = menuItems.map((it) => ({
    id: it.id,
    name: it.name,
    category: it.category.name,
  }));

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
        <h1 className="text-2xl font-bold text-gray-900">Buat Promosi</h1>
      </div>

      <PromotionForm categories={categories} menuItems={menuItemsMapped} />
    </div>
  );
}
