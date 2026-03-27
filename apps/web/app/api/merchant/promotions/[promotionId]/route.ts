/**
 * Single promotion API — GET, PATCH, DELETE.
 * Route: /api/merchant/promotions/[promotionId]
 *
 * GET    — Returns the promotion.
 * PATCH  — Partial update (any subset of fields).
 * DELETE — Soft delete (sets deletedAt).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { z } from "zod";

const UpdatePromotionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "BOGO", "FREE_ITEM"]).optional(),
  discountValue: z.number().int().min(0).optional(),
  maximumDiscountAmount: z.number().int().min(0).nullable().optional(),
  minimumOrderValue: z.number().int().min(0).nullable().optional(),
  applicableTo: z.enum(["ALL_ITEMS", "SPECIFIC_CATEGORIES", "SPECIFIC_ITEMS"]).optional(),
  applicableItemIds: z.array(z.string().uuid()).optional(),
  code: z.string().max(50).nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  perCustomerLimit: z.number().int().min(1).nullable().optional(),
  validFrom: z.string().datetime().nullable().optional(),
  validTo: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
});

async function loadPromotion(restaurantId: string, promotionId: string) {
  return prisma.promotion.findFirst({
    where: { id: promotionId, restaurantId, deletedAt: null },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ promotionId: string }> }
) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  if (!hasPermission(session.user.permissions, "promotions:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { promotionId } = await params;
  const promotion = await loadPromotion(restaurantId, promotionId);
  if (!promotion) {
    return NextResponse.json({ error: "Promotion not found" }, { status: 404 });
  }

  return NextResponse.json({ promotion });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ promotionId: string }> }
) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  if (!hasPermission(session.user.permissions, "promotions:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { promotionId } = await params;
  const existing = await loadPromotion(restaurantId, promotionId);
  if (!existing) {
    return NextResponse.json({ error: "Promotion not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = UpdatePromotionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { validFrom, validTo, applicableItemIds, ...rest } = parsed.data;

  // Check code uniqueness if code is being changed
  if (rest.code !== undefined && rest.code !== null && rest.code !== existing.code) {
    const conflict = await prisma.promotion.findFirst({
      where: { restaurantId, code: rest.code, deletedAt: null, id: { not: promotionId } },
    });
    if (conflict) {
      return NextResponse.json(
        { error: "Kode promo sudah digunakan" },
        { status: 409 }
      );
    }
  }

  // Strip undefined — preserve null (nullable fields)
  const data: Record<string, unknown> = Object.fromEntries(
    Object.entries(rest).filter(([, v]) => v !== undefined)
  );
  if (applicableItemIds !== undefined) data.applicableItemIds = applicableItemIds;
  if (validFrom !== undefined) data.validFrom = validFrom ? new Date(validFrom) : null;
  if (validTo !== undefined) data.validTo = validTo ? new Date(validTo) : null;

  const promotion = await prisma.promotion.update({
    where: { id: promotionId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: data as any,
  });

  return NextResponse.json({ promotion });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ promotionId: string }> }
) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  if (!hasPermission(session.user.permissions, "promotions:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { promotionId } = await params;
  const existing = await loadPromotion(restaurantId, promotionId);
  if (!existing) {
    return NextResponse.json({ error: "Promotion not found" }, { status: 404 });
  }

  await prisma.promotion.update({
    where: { id: promotionId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
