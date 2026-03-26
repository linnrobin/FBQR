/**
 * Single menu item API — GET, PATCH, DELETE.
 * Route: /api/merchant/menu/items/[itemId]
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";
import { z } from "zod";

const ALLERGENS = ["nuts", "dairy", "gluten", "seafood", "eggs", "soy"] as const;

const VariantSchema = z.object({
  id: z.string().uuid().optional(), // omit for new variants
  name: z.string().min(1).max(100),
  priceDelta: z.number().int().default(0),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  _delete: z.boolean().optional(), // true = soft delete
});

const AddonSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  priceDelta: z.number().int().default(0),
  isDefault: z.boolean().default(false),
  maxQuantity: z.number().int().min(1).nullable().optional(),
  sortOrder: z.number().int().default(0),
  _delete: z.boolean().optional(),
});

const UpdateItemSchema = z
  .object({
    categoryId: z.string().uuid().optional(),
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).nullable().optional(),
    price: z.number().int().min(0).optional(),
    imageUrl: z.string().url().nullable().optional(),
    priceType: z.enum(["FIXED", "BY_WEIGHT"]).optional(),
    pricePerUnit: z.number().int().min(0).nullable().optional(),
    unitLabel: z.string().max(50).nullable().optional(),
    depositAmount: z.number().int().min(0).nullable().optional(),
    isAvailable: z.boolean().optional(),
    stockCount: z.number().int().min(0).nullable().optional(),
    autoResetAvailability: z.boolean().optional(),
    estimatedPrepTime: z.number().int().min(1).nullable().optional(),
    isHalal: z.boolean().optional(),
    isVegetarian: z.boolean().optional(),
    isVegan: z.boolean().optional(),
    allergens: z.array(z.enum(ALLERGENS)).optional(),
    spiceLevel: z.number().int().min(0).max(3).nullable().optional(),
    kitchenStationOverride: z.string().uuid().nullable().optional(),
    displayOrder: z.number().int().optional(),
    variants: z.array(VariantSchema).optional(),
    addons: z.array(AddonSchema).optional(),
  });

async function getItem(itemId: string, restaurantId: string) {
  return prisma.menuItem.findFirst({
    where: { id: itemId, restaurantId, deletedAt: null },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const { itemId } = await params;
  const item = await prisma.menuItem.findFirst({
    where: { id: itemId, restaurantId, deletedAt: null },
    include: {
      variants: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
      addons: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
      category: { select: { id: true, name: true } },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ item });
}

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
  const existing = await getItem(itemId, restaurantId);
  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = UpdateItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Mutual exclusivity check
  const newAutoReset = data.autoResetAvailability ?? existing.autoResetAvailability;
  const newStockCount = data.stockCount !== undefined ? data.stockCount : existing.stockCount;
  if (newAutoReset && newStockCount != null) {
    return NextResponse.json(
      { error: "autoResetAvailability and stockCount are mutually exclusive" },
      { status: 400 }
    );
  }

  // Verify categoryId if changing
  if (data.categoryId) {
    const cat = await prisma.menuCategory.findFirst({
      where: { id: data.categoryId, restaurantId, deletedAt: null },
    });
    if (!cat) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
  }

  const updateData: Record<string, unknown> = {};
  const fields = [
    "categoryId", "name", "description", "price", "imageUrl",
    "priceType", "pricePerUnit", "unitLabel", "depositAmount",
    "isAvailable", "stockCount", "autoResetAvailability", "estimatedPrepTime",
    "isHalal", "isVegetarian", "isVegan", "allergens", "spiceLevel",
    "kitchenStationOverride", "displayOrder",
  ] as const;
  for (const f of fields) {
    if (data[f] !== undefined) updateData[f] = data[f];
  }

  // Handle variants and addons in a transaction
  const variantOps = (data.variants ?? []).map((v) => {
    if (v.id && v._delete) {
      return prisma.menuItemVariant.update({
        where: { id: v.id },
        data: { deletedAt: new Date() },
      });
    } else if (v.id) {
      return prisma.menuItemVariant.update({
        where: { id: v.id },
        data: { name: v.name, priceDelta: v.priceDelta, isDefault: v.isDefault, sortOrder: v.sortOrder },
      });
    } else {
      return prisma.menuItemVariant.create({
        data: { menuItemId: itemId, name: v.name, priceDelta: v.priceDelta, isDefault: v.isDefault, sortOrder: v.sortOrder },
      });
    }
  });

  const addonOps = (data.addons ?? []).map((a) => {
    if (a.id && a._delete) {
      return prisma.menuItemAddon.update({
        where: { id: a.id },
        data: { deletedAt: new Date() },
      });
    } else if (a.id) {
      return prisma.menuItemAddon.update({
        where: { id: a.id },
        data: { name: a.name, priceDelta: a.priceDelta, isDefault: a.isDefault, maxQuantity: a.maxQuantity ?? null, sortOrder: a.sortOrder },
      });
    } else {
      return prisma.menuItemAddon.create({
        data: { menuItemId: itemId, name: a.name, priceDelta: a.priceDelta, isDefault: a.isDefault, maxQuantity: a.maxQuantity ?? null, sortOrder: a.sortOrder },
      });
    }
  });

  await prisma.$transaction([
    prisma.menuItem.update({ where: { id: itemId }, data: updateData }),
    ...variantOps,
    ...addonOps,
  ]);

  const item = await prisma.menuItem.findUnique({
    where: { id: itemId },
    include: {
      variants: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
      addons: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
      category: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ item });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const { itemId } = await params;
  const existing = await getItem(itemId, restaurantId);
  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  await prisma.menuItem.update({
    where: { id: itemId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
