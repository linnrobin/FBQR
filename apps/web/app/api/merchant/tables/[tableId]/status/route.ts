/**
 * Table status update API.
 * Route: PATCH /api/merchant/tables/[tableId]/status
 *
 * Allowed transitions:
 *   DIRTY → AVAILABLE     (mark clean)
 *   AVAILABLE → CLOSED    (close table)
 *   CLOSED → AVAILABLE    (open table)
 *   AVAILABLE → RESERVED  (reserve table)
 *   RESERVED → AVAILABLE  (cancel reservation)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";
import { z } from "zod";
import type { TableStatus } from "@repo/database";

const UpdateStatusSchema = z.object({
  status: z.enum(["AVAILABLE", "OCCUPIED", "RESERVED", "DIRTY", "CLOSED"]),
});

// Allowed manual transitions map
const ALLOWED_TRANSITIONS: Partial<Record<TableStatus, TableStatus[]>> = {
  DIRTY: ["AVAILABLE"],
  AVAILABLE: ["CLOSED", "RESERVED"],
  CLOSED: ["AVAILABLE"],
  RESERVED: ["AVAILABLE"],
  OCCUPIED: ["AVAILABLE"], // emergency clear
};

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
  const table = await prisma.table.findFirst({
    where: { id: tableId, branch: { restaurantId } },
  });
  if (!table) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = UpdateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const newStatus = parsed.data.status;
  const allowed = ALLOWED_TRANSITIONS[table.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      {
        error: `Cannot transition from ${table.status} to ${newStatus}`,
      },
      { status: 409 }
    );
  }

  const updated = await prisma.table.update({
    where: { id: tableId },
    data: { status: newStatus },
    include: { branch: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ table: updated });
}
