/**
 * Menu categories API — GET and POST.
 * Route: /api/merchant/menu/categories
 *
 * GET  — List all active categories for the authenticated merchant's restaurant.
 * POST — Create a new category.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";
import { z } from "zod";

const CreateCategorySchema = z
  .object({
    name: z.string().min(1).max(100),
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
      (d.availableFrom == null) === (d.availableTo == null),
    { message: "availableFrom and availableTo must both be set or both be null" }
  );

export async function GET() {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId, deletedAt: null },
    include: {
      kitchenStation: { select: { id: true, name: true } },
      _count: { select: { items: { where: { deletedAt: null } } } },
    },
    orderBy: { displayOrder: "asc" },
  });

  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = CreateCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Get max displayOrder for new category
  const maxOrder = await prisma.menuCategory.aggregate({
    where: { restaurantId, deletedAt: null },
    _max: { displayOrder: true },
  });

  const category = await prisma.menuCategory.create({
    data: {
      restaurantId,
      name: data.name,
      imageUrl: data.imageUrl ?? null,
      menuLayoutOverride: data.menuLayoutOverride ?? null,
      availableFrom: data.availableFrom ?? null,
      availableTo: data.availableTo ?? null,
      kitchenStationId: data.kitchenStationId ?? null,
      displayOrder: data.displayOrder ?? (maxOrder._max.displayOrder ?? 0) + 1,
    },
    include: {
      kitchenStation: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ category }, { status: 201 });
}
