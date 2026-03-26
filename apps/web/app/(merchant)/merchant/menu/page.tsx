/**
 * Menu Management page — server component.
 * Route: /merchant/menu
 *
 * Fetches categories + items + branches + kitchen stations and passes to client.
 */
import { requireMerchant } from "@/lib/auth/session";
import { prisma } from "@repo/database";
import { redirect } from "next/navigation";
import { MenuManagementClient } from "./menu-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Kelola Menu" };

export default async function MerchantMenuPage() {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) redirect("/merchant/dashboard");

  const [categories, branches, stations] = await Promise.all([
    prisma.menuCategory.findMany({
      where: { restaurantId, deletedAt: null },
      include: {
        kitchenStation: { select: { id: true, name: true } },
        items: {
          where: { deletedAt: null },
          include: {
            variants: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
            addons: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
          },
          orderBy: { displayOrder: "asc" },
        },
        _count: { select: { items: { where: { deletedAt: null } } } },
      },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.branch.findMany({
      where: { restaurantId },
      select: {
        id: true,
        name: true,
        branchMenuOverrides: { select: { menuItemId: true, isAvailable: true } },
      },
    }),
    prisma.kitchenStation.findMany({
      where: { restaurantId },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <MenuManagementClient
      restaurantId={restaurantId}
      initialCategories={categories}
      branches={branches}
      stations={stations}
    />
  );
}
