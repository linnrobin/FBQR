/**
 * Edit menu item.
 * Route: /merchant/menu/items/[itemId]/edit
 */
import { requireMerchant } from "@/lib/auth/session";
import { prisma } from "@repo/database";
import { redirect, notFound } from "next/navigation";
import { MenuItemForm } from "@/components/merchant/menu-item-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Edit Item Menu" };

export default async function EditMenuItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) redirect("/merchant/dashboard");

  const { itemId } = await params;

  const [item, categories, stations] = await Promise.all([
    prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId, deletedAt: null },
      include: {
        variants: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
        addons: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
      },
    }),
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

  if (!item) notFound();

  return (
    <MenuItemForm
      restaurantId={restaurantId}
      categories={categories}
      stations={stations}
      item={item}
    />
  );
}
