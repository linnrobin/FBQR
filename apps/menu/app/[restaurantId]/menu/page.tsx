/**
 * Shareable browse-only menu page.
 * Route: /{restaurantId}/menu
 * URL: https://menu.fbqr.app/{restaurantId}/menu
 *
 * Public, no QR required, no session created.
 * Browse-only — no cart, no ordering.
 * Shows a sticky bottom banner: "Pindai QR di meja untuk memesan".
 * See docs/customer.md § Shareable Browse-Only Menu URL.
 */
import { prisma } from "@repo/database";
import { MenuHome } from "@/components/menu-home";
import type { MenuItemData } from "@/components/menu-item-card";
import type { MenuCategoryData } from "@/components/menu-grid-layout";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}): Promise<Metadata> {
  const { restaurantId } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { name: true },
  });
  return { title: restaurant ? `Menu — ${restaurant.name}` : "Menu" };
}

// ─── Error screen ─────────────────────────────────────────────────────────────

function ErrorScreen({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl shadow-md p-10 max-w-sm w-full text-center">
        <h2 className="text-lg font-bold text-stone-900 mb-3">{title}</h2>
        <p className="text-sm text-stone-500 leading-relaxed">{body}</p>
      </div>
    </main>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function ShareableMenuPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;

  // Load restaurant + merchant status
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      name: true,
      merchant: { select: { status: true } },
    },
  });

  if (!restaurant) {
    return (
      <ErrorScreen
        title="Restoran Tidak Ditemukan"
        body="Menu ini tidak tersedia. Periksa kembali tautan yang Anda gunakan."
      />
    );
  }

  const merchantStatus = restaurant.merchant.status;
  if (merchantStatus === "SUSPENDED" || merchantStatus === "CANCELLED") {
    return (
      <ErrorScreen
        title="Restoran Sementara Tidak Tersedia"
        body="Kami sedang melakukan perbaikan. Silakan kembali lagi nanti."
      />
    );
  }

  // Use primary branch (first by createdAt) for BranchMenuOverride availability
  const primaryBranch = await prisma.branch.findFirst({
    where: { restaurantId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const [branding, rawCategories, branchOverrides] = await Promise.all([
    prisma.restaurantBranding.findUnique({
      where: { restaurantId },
      select: { logoUrl: true, menuLayout: true },
    }),
    prisma.menuCategory.findMany({
      where: { restaurantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        displayOrder: true,
        availableFrom: true,
        availableTo: true,
        menuLayoutOverride: true,
        items: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            price: true,
            priceType: true,
            depositAmount: true,
            isAvailable: true,
            stockCount: true,
            isHalal: true,
            isVegetarian: true,
            isVegan: true,
            allergens: true,
            spiceLevel: true,
            estimatedPrepTime: true,
            variants: {
              where: { deletedAt: null },
              select: {
                id: true,
                name: true,
                priceDelta: true,
                isDefault: true,
                sortOrder: true,
              },
              orderBy: { sortOrder: "asc" },
            },
            addons: {
              where: { deletedAt: null },
              select: {
                id: true,
                name: true,
                priceDelta: true,
                isDefault: true,
                maxQuantity: true,
                sortOrder: true,
              },
              orderBy: { sortOrder: "asc" },
            },
          },
          orderBy: { displayOrder: "asc" },
        },
      },
      orderBy: { displayOrder: "asc" },
    }),
    primaryBranch
      ? prisma.branchMenuOverride.findMany({
          where: { branchId: primaryBranch.id },
          select: { menuItemId: true, isAvailable: true },
        })
      : Promise.resolve([]),
  ]);

  const overrideMap = new Map(
    branchOverrides.map((o) => [o.menuItemId, o.isAvailable])
  );

  const categories: MenuCategoryData[] = rawCategories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    availableFrom: cat.availableFrom,
    availableTo: cat.availableTo,
    items: cat.items.map((item): MenuItemData => ({
      id: item.id,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      price: item.price,
      priceType: item.priceType,
      depositAmount: item.depositAmount,
      isAvailable: item.isAvailable,
      stockCount: item.stockCount,
      isHalal: item.isHalal,
      isVegetarian: item.isVegetarian,
      isVegan: item.isVegan,
      allergens: item.allergens as string[],
      spiceLevel: item.spiceLevel,
      estimatedPrepTime: item.estimatedPrepTime,
      effectivelyAvailable: overrideMap.has(item.id)
        ? (overrideMap.get(item.id) ?? true)
        : item.isAvailable,
      variants: item.variants,
      addons: item.addons,
    })),
  }));

  return (
    <MenuHome
      restaurantName={restaurant.name}
      logoUrl={branding?.logoUrl ?? null}
      isOrderingMode={false}
      orderingPaused={false}
      orderingPausedMessage={null}
      categories={categories}
      menuLayout={(branding?.menuLayout as "GRID" | "LIST" | "BUNDLE" | "SPOTLIGHT") ?? "GRID"}
    />
  );
}
