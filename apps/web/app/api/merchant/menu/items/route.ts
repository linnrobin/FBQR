/**
 * Menu items API — GET and POST.
 * Route: /api/merchant/menu/items
 *
 * GET  — List items for a category (or all items for the restaurant).
 * POST — Create a new menu item with optional variants and addons.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";
import { z } from "zod";
import { auditLog, getRequestMeta } from "@/lib/audit";

const ALLERGENS = ["nuts", "dairy", "gluten", "seafood", "eggs", "soy"] as const;

const VariantSchema = z.object({
  name: z.string().min(1).max(100),
  priceDelta: z.number().int().default(0),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

const AddonSchema = z.object({
  name: z.string().min(1).max(100),
  priceDelta: z.number().int().default(0),
  isDefault: z.boolean().default(false),
  maxQuantity: z.number().int().min(1).nullable().optional(),
  sortOrder: z.number().int().default(0),
});

const CreateItemSchema = z
  .object({
    categoryId: z.string().uuid(),
    name: z.string().min(1).max(100),
    description: z.string().max(500).nullable().optional(),
    price: z.number().int().min(0),
    imageUrl: z.string().url().nullable().optional(),
    priceType: z.enum(["FIXED", "BY_WEIGHT"]).default("FIXED"),
    pricePerUnit: z.number().int().min(0).nullable().optional(),
    unitLabel: z.string().max(50).nullable().optional(),
    depositAmount: z.number().int().min(0).nullable().optional(),
    isAvailable: z.boolean().default(true),
    stockCount: z.number().int().min(0).nullable().optional(),
    autoResetAvailability: z.boolean().default(false),
    estimatedPrepTime: z.number().int().min(1).nullable().optional(),
    isHalal: z.boolean().default(false),
    isVegetarian: z.boolean().default(false),
    isVegan: z.boolean().default(false),
    allergens: z.array(z.enum(ALLERGENS)).default([]),
    spiceLevel: z.number().int().min(0).max(3).nullable().optional(),
    kitchenStationOverride: z.string().uuid().nullable().optional(),
    displayOrder: z.number().int().optional(),
    variants: z.array(VariantSchema).default([]),
    addons: z.array(AddonSchema).default([]),
  })
  .refine(
    (d) => !(d.autoResetAvailability && d.stockCount != null),
    { message: "autoResetAvailability and stockCount are mutually exclusive" }
  )
  .refine(
    (d) => d.priceType !== "BY_WEIGHT" || (d.pricePerUnit != null && d.unitLabel),
    { message: "BY_WEIGHT items require pricePerUnit and unitLabel" }
  );

export async function GET(req: NextRequest) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = { restaurantId, deletedAt: null };
  if (categoryId) where.categoryId = categoryId;
  if (search) where.name = { contains: search, mode: "insensitive" };

  const items = await prisma.menuItem.findMany({
    where,
    include: {
      variants: {
        where: { deletedAt: null },
        orderBy: { sortOrder: "asc" },
      },
      addons: {
        where: { deletedAt: null },
        orderBy: { sortOrder: "asc" },
      },
      category: { select: { id: true, name: true } },
    },
    orderBy: { displayOrder: "asc" },
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = CreateItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Verify category belongs to this restaurant
  const category = await prisma.menuCategory.findFirst({
    where: { id: data.categoryId, restaurantId, deletedAt: null },
  });
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  // Get max displayOrder if not provided
  let displayOrder = data.displayOrder;
  if (displayOrder === undefined) {
    const maxOrder = await prisma.menuItem.aggregate({
      where: { categoryId: data.categoryId, deletedAt: null },
      _max: { displayOrder: true },
    });
    displayOrder = (maxOrder._max.displayOrder ?? 0) + 1;
  }

  const item = await prisma.menuItem.create({
    data: {
      restaurantId,
      categoryId: data.categoryId,
      name: data.name,
      description: data.description ?? null,
      imageUrl: data.imageUrl ?? null,
      price: data.price,
      priceType: data.priceType,
      pricePerUnit: data.pricePerUnit ?? null,
      unitLabel: data.unitLabel ?? null,
      depositAmount: data.depositAmount ?? null,
      isAvailable: data.isAvailable,
      stockCount: data.stockCount ?? null,
      autoResetAvailability: data.autoResetAvailability,
      estimatedPrepTime: data.estimatedPrepTime ?? null,
      isHalal: data.isHalal,
      isVegetarian: data.isVegetarian,
      isVegan: data.isVegan,
      allergens: data.allergens,
      spiceLevel: data.spiceLevel ?? null,
      kitchenStationOverride: data.kitchenStationOverride ?? null,
      displayOrder,
      variants: {
        create: data.variants.map((v) => ({
          name: v.name,
          priceDelta: v.priceDelta,
          isDefault: v.isDefault,
          sortOrder: v.sortOrder,
        })),
      },
      addons: {
        create: data.addons.map((a) => ({
          name: a.name,
          priceDelta: a.priceDelta,
          isDefault: a.isDefault,
          maxQuantity: a.maxQuantity ?? null,
          sortOrder: a.sortOrder,
        })),
      },
    },
    include: {
      variants: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
      addons: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
      category: { select: { id: true, name: true } },
    },
  });

  const { ipAddress, userAgent } = getRequestMeta(req);
  await auditLog({
    actorId: session.user.merchantId ?? null,
    actorType: "MERCHANT",
    actorName: session.user.email ?? null,
    action: "CREATE",
    entity: "MenuItem",
    entityId: item.id,
    newValue: { name: item.name, price: item.price, categoryId: item.categoryId },
    restaurantId,
    ipAddress,
    userAgent,
  });

  return NextResponse.json({ item }, { status: 201 });
}
