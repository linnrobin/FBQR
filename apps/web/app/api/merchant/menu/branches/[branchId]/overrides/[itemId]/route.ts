/**
 * Per-branch item availability toggle.
 * Route: PATCH /api/merchant/menu/branches/[branchId]/overrides/[itemId]
 * Body: { isAvailable: boolean }
 *
 * Creates or updates a BranchMenuOverride record (upsert).
 * Invalidation: callers should trigger revalidation of the menu cache.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";
import { z } from "zod";

const Schema = z.object({ isAvailable: z.boolean() });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string; itemId: string }> }
) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const { branchId, itemId } = await params;

  // Verify branch belongs to this restaurant
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, restaurantId },
  });
  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  // Verify item belongs to this restaurant
  const item = await prisma.menuItem.findFirst({
    where: { id: itemId, restaurantId, deletedAt: null },
  });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const override = await prisma.branchMenuOverride.upsert({
    where: { branchId_menuItemId: { branchId, menuItemId: itemId } },
    update: { isAvailable: parsed.data.isAvailable },
    create: { branchId, menuItemId: itemId, isAvailable: parsed.data.isAvailable },
    select: { menuItemId: true, isAvailable: true },
  });

  return NextResponse.json({ override });
}
