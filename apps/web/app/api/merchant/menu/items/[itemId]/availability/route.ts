/**
 * Toggle menu item availability.
 * Route: PATCH /api/merchant/menu/items/[itemId]/availability
 * Body: { isAvailable: boolean }
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";
import { z } from "zod";

const Schema = z.object({ isAvailable: z.boolean() });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const { itemId } = await params;
  const existing = await prisma.menuItem.findFirst({
    where: { id: itemId, restaurantId, deletedAt: null },
  });
  if (!existing) {
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

  const item = await prisma.menuItem.update({
    where: { id: itemId },
    data: { isAvailable: parsed.data.isAvailable },
    select: { id: true, isAvailable: true },
  });

  return NextResponse.json({ item });
}
