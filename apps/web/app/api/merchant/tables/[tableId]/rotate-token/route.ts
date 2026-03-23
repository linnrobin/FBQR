/**
 * QR token rotation API.
 * Route: POST /api/merchant/tables/[tableId]/rotate-token
 *
 * Generates a new UUID qrToken for the table.
 * WARNING: Existing physical QR codes immediately become invalid.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";
import { randomUUID } from "crypto";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const { tableId } = await params;
  const table = await prisma.table.findFirst({
    where: { id: tableId, branch: { restaurantId } },
  });
  if (!table) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  const updated = await prisma.table.update({
    where: { id: tableId },
    data: { qrToken: randomUUID() },
    include: { branch: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ table: updated });
}
