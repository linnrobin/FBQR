/**
 * Branch menu overrides — list all overrides for a branch.
 * Route: GET /api/merchant/menu/branches/[branchId]/overrides
 *
 * Returns all BranchMenuOverride records for this branch so the UI can
 * show per-item availability toggles.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const { branchId } = await params;

  // Verify branch belongs to this restaurant
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, restaurantId },
  });
  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  const overrides = await prisma.branchMenuOverride.findMany({
    where: { branchId },
    select: { menuItemId: true, isAvailable: true },
  });

  return NextResponse.json({ branchId, overrides });
}
