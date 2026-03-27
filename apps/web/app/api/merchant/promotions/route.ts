/**
 * Promotions API — GET (list) and POST (create).
 * Route: /api/merchant/promotions
 *
 * GET  — Returns all non-deleted promotions for the restaurant.
 * POST — Creates a new promotion.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { z } from "zod";

const CreatePromotionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "BOGO", "FREE_ITEM"]),
  discountValue: z.number().int().min(0),
  maximumDiscountAmount: z.number().int().min(0).nullable().optional(),
  minimumOrderValue: z.number().int().min(0).nullable().optional(),
  applicableTo: z.enum(["ALL_ITEMS", "SPECIFIC_CATEGORIES", "SPECIFIC_ITEMS"]).default("ALL_ITEMS"),
  applicableItemIds: z.array(z.string().uuid()).default([]),
  code: z.string().max(50).nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  perCustomerLimit: z.number().int().min(1).nullable().optional(),
  validFrom: z.string().datetime().nullable().optional(),
  validTo: z.string().datetime().nullable().optional(),
  isActive: z.boolean().default(true),
});

export async function GET(_req: NextRequest) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  if (!hasPermission(session.user.permissions, "promotions:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const promotions = await prisma.promotion.findMany({
    where: { restaurantId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ promotions });
}

export async function POST(req: NextRequest) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  if (!hasPermission(session.user.permissions, "promotions:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = CreatePromotionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    applicableItemIds,
    validFrom,
    validTo,
    maximumDiscountAmount,
    minimumOrderValue,
    code,
    usageLimit,
    perCustomerLimit,
    ...rest
  } = parsed.data;

  // Validate: code must be unique within the restaurant (if provided)
  if (code) {
    const existing = await prisma.promotion.findFirst({
      where: { restaurantId, code, deletedAt: null },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Kode promo sudah digunakan" },
        { status: 409 }
      );
    }
  }

  const promotion = await prisma.promotion.create({
    data: {
      restaurantId,
      ...rest,
      applicableItemIds,
      maximumDiscountAmount: maximumDiscountAmount ?? null,
      minimumOrderValue: minimumOrderValue ?? null,
      code: code ?? null,
      usageLimit: usageLimit ?? null,
      perCustomerLimit: perCustomerLimit ?? null,
      validFrom: validFrom ? new Date(validFrom) : null,
      validTo: validTo ? new Date(validTo) : null,
    },
  });

  return NextResponse.json({ promotion }, { status: 201 });
}
