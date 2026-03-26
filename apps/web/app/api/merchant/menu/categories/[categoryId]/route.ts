/**
 * Single category API — GET, PATCH, DELETE.
 * Route: /api/merchant/menu/categories/[categoryId]
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";
import { z } from "zod";

const UpdateCategorySchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    imageUrl: z.string().url().nullable().optional(),
    menuLayoutOverride: z
      .enum(["GRID", "LIST", "BUNDLE", "SPOTLIGHT"])
      .nullable()
      .optional(),
    availableFrom: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .nullable()
      .optional(),
    availableTo: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .nullable()
      .optional(),
    kitchenStationId: z.string().uuid().nullable().optional(),
    displayOrder: z.number().int().optional(),
  })
  .refine(
    (d) =>
      d.availableFrom === undefined ||
      d.availableTo === undefined ||
      (d.availableFrom == null) === (d.availableTo == null),
    { message: "availableFrom and availableTo must both be set or both be null" }
  );

async function getCategory(categoryId: string, restaurantId: string) {
  return prisma.menuCategory.findFirst({
    where: { id: categoryId, restaurantId, deletedAt: null },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const { categoryId } = await params;
  const category = await prisma.menuCategory.findFirst({
    where: { id: categoryId, restaurantId, deletedAt: null },
    include: {
      kitchenStation: { select: { id: true, name: true } },
      items: {
        where: { deletedAt: null },
        orderBy: { displayOrder: "asc" },
        include: {
          variants: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
          addons: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  return NextResponse.json({ category });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const { categoryId } = await params;
  const existing = await getCategory(categoryId, restaurantId);
  if (!existing) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = UpdateCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
  if (data.menuLayoutOverride !== undefined) updateData.menuLayoutOverride = data.menuLayoutOverride;
  if (data.availableFrom !== undefined) updateData.availableFrom = data.availableFrom;
  if (data.availableTo !== undefined) updateData.availableTo = data.availableTo;
  if (data.kitchenStationId !== undefined) updateData.kitchenStationId = data.kitchenStationId;
  if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;

  const category = await prisma.menuCategory.update({
    where: { id: categoryId },
    data: updateData,
    include: { kitchenStation: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ category });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const { categoryId } = await params;
  const existing = await getCategory(categoryId, restaurantId);
  if (!existing) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  // Soft delete category and all its items
  await prisma.$transaction([
    prisma.menuItem.updateMany({
      where: { categoryId, deletedAt: null },
      data: { deletedAt: new Date() },
    }),
    prisma.menuCategory.update({
      where: { id: categoryId },
      data: { deletedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ success: true });
}
