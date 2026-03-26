/**
 * Table detail API — GET, PATCH, DELETE.
 * Route: /api/merchant/tables/[tableId]
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";
import { z } from "zod";

const UpdateTableSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  capacity: z.number().int().min(1).max(999).nullable().optional(),
});

async function resolveTable(tableId: string, restaurantId: string) {
  return prisma.table.findFirst({
    where: { id: tableId, branch: { restaurantId } },
    include: { branch: { select: { id: true, name: true } } },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const { tableId } = await params;
  const table = await resolveTable(tableId, restaurantId);
  if (!table) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  return NextResponse.json({ table });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const { tableId } = await params;
  const existing = await resolveTable(tableId, restaurantId);
  if (!existing) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = UpdateTableSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const table = await prisma.table.update({
    where: { id: tableId },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.capacity !== undefined && { capacity: parsed.data.capacity }),
    },
    include: { branch: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ table });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const { tableId } = await params;
  const existing = await resolveTable(tableId, restaurantId);
  if (!existing) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  // Only allow deletion if table is AVAILABLE (no active sessions)
  if (existing.status !== "AVAILABLE") {
    return NextResponse.json(
      { error: "Cannot delete a table that is not AVAILABLE" },
      { status: 409 }
    );
  }

  await prisma.table.delete({ where: { id: tableId } });

  return NextResponse.json({ success: true });
}
