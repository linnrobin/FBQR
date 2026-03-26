/**
 * Reorder items within a category.
 * Route: PATCH /api/merchant/menu/items/reorder
 * Body: { categoryId: string, orderedIds: string[] }
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";
import { z } from "zod";

const ReorderSchema = z.object({
  categoryId: z.string().uuid(),
  orderedIds: z.array(z.string().uuid()).min(1),
});

export async function PATCH(req: NextRequest) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = ReorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { categoryId, orderedIds } = parsed.data;

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.menuItem.updateMany({
        where: { id, categoryId, restaurantId, deletedAt: null },
        data: { displayOrder: index },
      })
    )
  );

  return NextResponse.json({ success: true });
}
