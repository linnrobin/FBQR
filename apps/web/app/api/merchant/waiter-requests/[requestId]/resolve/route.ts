/**
 * Resolve a waiter request.
 * Route: PATCH /api/merchant/waiter-requests/[requestId]/resolve
 *
 * Sets resolvedAt = NOW() on the WaiterRequest.
 * Auth: merchant owner session or staff session with orders:view.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";
import { getStaffSession, hasPermission, forbiddenResponse } from "@/lib/auth/rbac";
import { auditLog } from "@/lib/audit";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const { requestId } = await params;
  const cookieStore = await cookies();
  const staffSession = await getStaffSession(cookieStore);

  let restaurantId: string | null = null;
  let actorId: string | null = null;
  let actorName: string = "Staff";

  if (staffSession) {
    if (!hasPermission(staffSession.permissions, "orders:view")) {
      return NextResponse.json(forbiddenResponse("orders:view"), { status: 403 });
    }
    restaurantId = staffSession.restaurantId;
    actorId = staffSession.staffId;
    actorName = staffSession.staffName ?? "Staff";
  } else {
    const session = await requireMerchant();
    restaurantId = session.user.restaurantId;
    actorId = session.user.id;
    actorName = session.user.name ?? "Owner";
  }

  if (!restaurantId) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  // Verify the WaiterRequest belongs to this restaurant
  const waiterRequest = await prisma.waiterRequest.findFirst({
    where: {
      id: requestId,
      branch: { restaurantId },
    },
  });

  if (!waiterRequest) {
    return NextResponse.json({ error: "Waiter request not found" }, { status: 404 });
  }

  if (waiterRequest.resolvedAt) {
    return NextResponse.json({ error: "Already resolved" }, { status: 409 });
  }

  const updated = await prisma.waiterRequest.update({
    where: { id: requestId },
    data: { resolvedAt: new Date() },
  });

  await auditLog({
    actorType: staffSession ? "STAFF" : "MERCHANT",
    actorId: actorId ?? "",
    actorName,
    action: "UPDATE",
    entity: "WaiterRequest",
    entityId: requestId,
    restaurantId,
    newValue: { resolvedAt: updated.resolvedAt },
  });

  return NextResponse.json({ ok: true });
}
