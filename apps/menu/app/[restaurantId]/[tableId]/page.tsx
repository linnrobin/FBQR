/**
 * Table menu page — QR-validated.
 * Route: /{restaurantId}/{tableId}?token=...&sig=...&exp=...
 *
 * Steps:
 *  1. Validate HMAC signature + expiry from query params.
 *  2. Lookup Table by token; assert path params match DB record (ADR-015).
 *  3. Check restaurant/merchant status.
 *  4. Resume or create CustomerSession (via /api/menu/session redirect).
 *  5. Fetch menu data and render.
 */
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@repo/database";
import { verifyQrSig, isQrExpired, buildSignedMenuUrl } from "@/lib/qr-auth";
import { MenuHome } from "@/components/menu-home";
import type { MenuItemData } from "@/components/menu-item-card";
import type { MenuCategoryData } from "@/components/menu-grid-layout";

// ─── Error page helper ───────────────────────────────────────────────────────

function ErrorScreen({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
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

export default async function TableMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ restaurantId: string; tableId: string }>;
  searchParams: Promise<{ token?: string; sig?: string; exp?: string }>;
}) {
  const { restaurantId, tableId } = await params;
  const { token, sig, exp: expStr } = await searchParams;

  const exp = expStr ? parseInt(expStr, 10) : NaN;

  // ── 1. Validate signature ─────────────────────────────────────────────────
  if (
    !token ||
    !sig ||
    isNaN(exp) ||
    isQrExpired(exp) ||
    !verifyQrSig(token, exp, sig)
  ) {
    // Expired or invalid — redirect to static redirect handler for fresh URL
    redirect(`/r/${token ?? ""}`);
  }

  // ── 2. Lookup table; assert path params match DB record (ADR-015) ─────────
  const table = await prisma.table.findUnique({
    where: { qrToken: token },
    select: {
      id: true,
      status: true,
      name: true,
      branchId: true,
      branch: {
        select: {
          id: true,
          restaurantId: true,
          openingHours: true,
          restaurant: {
            select: {
              id: true,
              name: true,
              merchant: { select: { status: true } },
            },
          },
        },
      },
    },
  });

  // Security: path params must match the DB record for this token
  if (
    !table ||
    table.id !== tableId ||
    table.branch.restaurantId !== restaurantId
  ) {
    // 400 — do NOT redirect to /r/ here (could be a tampered URL)
    return (
      <ErrorScreen
        title="QR Code Tidak Valid"
        body="QR code ini tidak valid. Minta staff untuk membantu."
      />
    );
  }

  const { restaurant } = table.branch;
  const merchantStatus = restaurant.merchant.status;

  // ── 3. Status checks ──────────────────────────────────────────────────────
  if (merchantStatus === "SUSPENDED" || merchantStatus === "CANCELLED") {
    return (
      <ErrorScreen
        title="Restoran Sementara Tidak Tersedia"
        body="Kami sedang melakukan perbaikan. Silakan kembali lagi nanti."
      />
    );
  }

  const settings = await prisma.merchantSettings.findUnique({
    where: { restaurantId },
    select: {
      enableDirtyState: true,
      orderingPaused: true,
      orderingPausedMessage: true,
      tableSessionTimeoutMinutes: true,
    },
  });

  if (table.status === "CLOSED") {
    return (
      <ErrorScreen
        title="Meja Tidak Tersedia"
        body="Meja ini sementara tidak tersedia. Silakan tanya staff."
      />
    );
  }
  if (table.status === "RESERVED") {
    return (
      <ErrorScreen
        title="Meja Direservasi"
        body="Meja ini sudah direservasi. Silakan tanya staff untuk meja yang tersedia."
      />
    );
  }
  if (table.status === "DIRTY" && (settings?.enableDirtyState ?? false)) {
    return (
      <ErrorScreen
        title="Meja Sedang Disiapkan"
        body="Meja ini sedang dibersihkan. Silakan tanya staff."
      />
    );
  }

  // ── 4. Session — resume or create ────────────────────────────────────────
  const cookieStore = await cookies();
  const sessionCookieVal = cookieStore.get("fbqr_session_id")?.value;

  let hasValidSession = false;
  if (sessionCookieVal) {
    const session = await prisma.customerSession.findFirst({
      where: {
        sessionCookie: sessionCookieVal,
        tableId,
        status: "ACTIVE",
      },
      select: { id: true, expiresAt: true },
    });
    hasValidSession = !!(session && session.expiresAt > new Date());
  }

  if (!hasValidSession) {
    // Redirect to session creation route, which sets cookie and comes back here
    const base = process.env.NEXT_PUBLIC_MENU_APP_URL ?? "http://localhost:3001";
    const sessionUrl = new URL("/api/menu/session", base);
    sessionUrl.searchParams.set("restaurantId", restaurantId);
    sessionUrl.searchParams.set("tableId", tableId);
    sessionUrl.searchParams.set("tableToken", token);
    sessionUrl.searchParams.set("sig", sig);
    sessionUrl.searchParams.set("exp", String(exp));
    redirect(sessionUrl.toString());
  }

  // ── 5. Fetch menu data ────────────────────────────────────────────────────
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
    prisma.branchMenuOverride.findMany({
      where: { branchId: table.branchId },
      select: { menuItemId: true, isAvailable: true },
    }),
  ]);

  // Build override map: itemId → isAvailable
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
      isOrderingMode={true}
      orderingPaused={settings?.orderingPaused ?? false}
      orderingPausedMessage={settings?.orderingPausedMessage ?? null}
      categories={categories}
      menuLayout={(branding?.menuLayout as "GRID" | "LIST" | "BUNDLE" | "SPOTLIGHT") ?? "GRID"}
    />
  );
}
