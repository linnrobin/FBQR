/**
 * Table management API — GET and POST.
 * Route: /api/merchant/tables
 *
 * GET  — List all tables for a branch (query: ?branchId=).
 *         If branchId is omitted, returns tables for the first branch of the restaurant.
 * POST — Create a new table with an auto-generated QR token.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";
import { z } from "zod";
import { randomUUID } from "crypto";

const CreateTableSchema = z.object({
  branchId: z.string().uuid(),
  name: z.string().min(1).max(100),
  capacity: z.number().int().min(1).max(999).nullable().optional(),
});

export async function GET(req: NextRequest) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId");

  // Verify branch belongs to this restaurant
  const whereClause = branchId
    ? { branchId, branch: { restaurantId } }
    : { branch: { restaurantId } };

  const tables = await prisma.table.findMany({
    where: whereClause,
    include: {
      branch: { select: { id: true, name: true } },
      _count: {
        select: {
          sessions: {
            where: {
              status: { in: ["ACTIVE", "ORDERING"] },
            },
          },
        },
      },
    },
    orderBy: [{ branch: { name: "asc" } }, { name: "asc" }],
  });

  return NextResponse.json({ tables });
}

export async function POST(req: NextRequest) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = CreateTableSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { branchId, name, capacity } = parsed.data;

  // Verify branch belongs to this restaurant
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, restaurantId },
  });
  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  const table = await prisma.table.create({
    data: {
      branchId,
      name,
      capacity: capacity ?? null,
      qrToken: randomUUID(),
    },
    include: {
      branch: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ table }, { status: 201 });
}
