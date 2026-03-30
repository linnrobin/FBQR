/**
 * AI Recommendation Engine — pure SQL, no external service.
 * Route: GET /api/recommendations?restaurantId=...&cartItemIds=...&branchId=...
 *
 * Returns:
 *   bestsellerIds   — top item IDs by order count (last 30 days)
 *   upsellIds       — bestsellers not in cart (for cart-sheet upsell chips)
 *   togetherIds     — items frequently ordered with cart contents
 *
 * Time-based filtering is done client-side: the page passes category
 * availableFrom/availableTo already; the layout filters categories accordingly.
 *
 * Auth: none required (menu is public within a valid session context).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { formatInTimeZone } from "date-fns-tz";
import { subDays } from "date-fns";

const MAX_BESTSELLERS = 20;
const MAX_UPSELL = 6;
const MAX_TOGETHER = 8;

// UUID v4 regex — used to validate all ID parameters
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const restaurantId = searchParams.get("restaurantId");
  const branchId = searchParams.get("branchId");
  const cartParam = searchParams.get("cartItemIds") ?? "";

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId required" }, { status: 400 });
  }

  // Validate IDs are valid UUIDs before they are used in raw SQL interpolation.
  // This prevents SQL injection — UUIDs cannot contain SQL metacharacters.
  if (!UUID_RE.test(restaurantId)) {
    return NextResponse.json({ error: "invalid restaurantId" }, { status: 400 });
  }
  if (branchId && !UUID_RE.test(branchId)) {
    return NextResponse.json({ error: "invalid branchId" }, { status: 400 });
  }
  // Validate each cart item ID is a UUID to prevent injection via the cartItemIds param
  const rawCartIds = cartParam ? cartParam.split(",").filter(Boolean) : [];
  for (const id of rawCartIds) {
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "invalid cartItemId" }, { status: 400 });
    }
  }

  // Check if AI features are enabled for this restaurant
  const settings = await prisma.merchantSettings.findUnique({
    where: { restaurantId },
    select: {
      aiShowBestsellers: true,
      aiPersonalized: true,
      aiUpsell: true,
    },
  });

  // If all AI features disabled, return empty
  if (
    !settings ||
    (!settings.aiShowBestsellers && !settings.aiPersonalized && !settings.aiUpsell)
  ) {
    return NextResponse.json({
      bestsellerIds: [],
      upsellIds: [],
      togetherIds: [],
    });
  }

  const cartItemIds = rawCartIds;

  const since = subDays(new Date(), 30);

  // ── 1. Bestsellers: top items by order count (last 30 days) ─────────────────
  let bestsellerIds: string[] = [];

  if (settings.aiShowBestsellers || settings.aiUpsell) {
    // Use separate parameterized queries for branch vs restaurant scope to
    // avoid string interpolation in raw SQL entirely.
    const bestsellers = branchId
      ? await prisma.$queryRawUnsafe<Array<{ menuItemId: string; cnt: bigint }>>(
          `
          SELECT oi."menuItemId", COUNT(*) AS cnt
          FROM "OrderItem" oi
          JOIN "Order" o ON o.id = oi."orderId"
          WHERE o."createdAt" >= $1
            AND o."branchId" = $2
            AND o.status NOT IN ('CANCELLED')
            AND oi."menuItemId" != '00000000-0000-0000-0000-000000000000'
          GROUP BY oi."menuItemId"
          ORDER BY cnt DESC
          LIMIT $3
          `,
          since,
          branchId,
          MAX_BESTSELLERS
        )
      : await prisma.$queryRawUnsafe<Array<{ menuItemId: string; cnt: bigint }>>(
          `
          SELECT oi."menuItemId", COUNT(*) AS cnt
          FROM "OrderItem" oi
          JOIN "Order" o ON o.id = oi."orderId"
          JOIN "Branch" b ON b.id = o."branchId"
          WHERE o."createdAt" >= $1
            AND b."restaurantId" = $2
            AND o.status NOT IN ('CANCELLED')
            AND oi."menuItemId" != '00000000-0000-0000-0000-000000000000'
          GROUP BY oi."menuItemId"
          ORDER BY cnt DESC
          LIMIT $3
          `,
          since,
          restaurantId,
          MAX_BESTSELLERS
        );

    bestsellerIds = bestsellers.map((r) => r.menuItemId);
  }

  // ── 2. Frequently ordered together (collaborative filtering) ─────────────────
  let togetherIds: string[] = [];

  if (settings.aiPersonalized && cartItemIds.length > 0) {
    // Find orders that contain at least one cart item, then count co-occurring items
    const placeholders = cartItemIds
      .map((_, i) => `$${i + 2}`)
      .join(", ");

    // $1 = restaurantId, $2..$N = cartItemIds, $N+1 = since, $N+2 = MAX_TOGETHER
    const sinceIdx = cartItemIds.length + 2;
    const limitIdx = cartItemIds.length + 3;
    const together = await prisma.$queryRawUnsafe<Array<{ menuItemId: string; cnt: bigint }>>(
      `
      SELECT oi2."menuItemId", COUNT(DISTINCT oi2."orderId") AS cnt
      FROM "OrderItem" oi1
      JOIN "OrderItem" oi2 ON oi2."orderId" = oi1."orderId"
        AND oi2."menuItemId" != oi1."menuItemId"
      JOIN "Order" o ON o.id = oi1."orderId"
      JOIN "Branch" b ON b.id = o."branchId"
      WHERE oi1."menuItemId" IN (${placeholders})
        AND b."restaurantId" = $1
        AND o."createdAt" >= $${sinceIdx}
        AND o.status NOT IN ('CANCELLED')
        AND oi2."menuItemId" != '00000000-0000-0000-0000-000000000000'
        AND oi2."menuItemId" NOT IN (${placeholders})
      GROUP BY oi2."menuItemId"
      ORDER BY cnt DESC
      LIMIT $${limitIdx}
      `,
      restaurantId,
      ...cartItemIds,
      since,
      MAX_TOGETHER
    );

    togetherIds = together.map((r) => r.menuItemId);
  }

  // ── 3. Upsell: bestsellers not already in cart ────────────────────────────────
  let upsellIds: string[] = [];

  if (settings.aiUpsell && bestsellerIds.length > 0) {
    const cartSet = new Set(cartItemIds);
    upsellIds = bestsellerIds
      .filter((id) => !cartSet.has(id))
      .slice(0, MAX_UPSELL);
  }

  return NextResponse.json({
    bestsellerIds,
    upsellIds,
    togetherIds,
  });
}
