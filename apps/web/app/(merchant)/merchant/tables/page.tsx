/**
 * Table Management page — server component.
 * Route: /merchant/tables
 *
 * Fetches branches + tables + MerchantSettings and passes to client.
 */
import { requireMerchant } from "@/lib/auth/session";
import { prisma } from "@repo/database";
import { redirect } from "next/navigation";
import { TablesClient } from "./tables-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Meja & QR" };

export default async function TablesPage() {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) redirect("/merchant/dashboard");

  const [branches, settings, categories] = await Promise.all([
    prisma.branch.findMany({
      where: { restaurantId },
      include: {
        tables: {
          include: {
            _count: {
              select: {
                sessions: {
                  where: { status: { in: ["ACTIVE", "ORDERING"] } },
                },
              },
            },
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.merchantSettings.findUnique({
      where: { restaurantId },
      select: { orderingPaused: true, orderingPausedMessage: true, enableDirtyState: true },
    }),
    prisma.menuCategory.findMany({
      where: { restaurantId, deletedAt: null },
      include: {
        items: {
          where: { deletedAt: null, isAvailable: true },
          include: {
            variants: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
            addons: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
          },
          orderBy: { displayOrder: "asc" },
        },
      },
      orderBy: { displayOrder: "asc" },
    }),
  ]);

  return (
    <TablesClient
      restaurantId={restaurantId}
      initialBranches={branches}
      initialSettings={settings ?? { orderingPaused: false, orderingPausedMessage: null, enableDirtyState: false }}
      menuCategories={categories}
    />
  );
}
