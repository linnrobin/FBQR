/**
 * Create new menu item.
 * Route: /merchant/menu/items/new?categoryId=...
 */
import { requireMerchant } from "@/lib/auth/session";
import { prisma } from "@repo/database";
import { redirect } from "next/navigation";
import { MenuItemForm } from "@/components/merchant/menu-item-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tambah Item Menu" };

export default async function NewMenuItemPage({
  searchParams,
}: {
  searchParams: Promise<{ categoryId?: string }>;
}) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) redirect("/merchant/dashboard");

  const { categoryId } = await searchParams;

  const [categories, stations] = await Promise.all([
    prisma.menuCategory.findMany({
      where: { restaurantId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.kitchenStation.findMany({
      where: { restaurantId },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <MenuItemForm
      restaurantId={restaurantId}
      categories={categories}
      stations={stations}
      defaultCategoryId={categoryId}
    />
  );
}
