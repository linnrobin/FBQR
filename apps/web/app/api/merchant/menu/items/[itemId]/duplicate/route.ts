/**
 * Duplicate a menu item (including variants and addons).
 * Route: POST /api/merchant/menu/items/[itemId]/duplicate
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const { itemId } = await params;
  const original = await prisma.menuItem.findFirst({
    where: { id: itemId, restaurantId, deletedAt: null },
    include: {
      variants: { where: { deletedAt: null } },
      addons: { where: { deletedAt: null } },
    },
  });

  if (!original) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Get max displayOrder in the same category
  const maxOrder = await prisma.menuItem.aggregate({
    where: { categoryId: original.categoryId, deletedAt: null },
    _max: { displayOrder: true },
  });

  const { id: _id, createdAt: _c, updatedAt: _u, deletedAt: _d,
    variants, addons, ...rest } = original;

  const duplicate = await prisma.menuItem.create({
    data: {
      ...rest,
      name: `${original.name} (Salinan)`,
      displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
      isAvailable: false, // new duplicate starts unavailable
      variants: {
        create: variants.map(({ id: _vid, menuItemId: _mid, createdAt: _vc,
          updatedAt: _vu, deletedAt: _vd, ...v }) => v),
      },
      addons: {
        create: addons.map(({ id: _aid, menuItemId: _amid, createdAt: _ac,
          updatedAt: _au, deletedAt: _ad, ...a }) => a),
      },
    },
    include: {
      variants: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
      addons: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
      category: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ item: duplicate }, { status: 201 });
}
