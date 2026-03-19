/**
 * GET  /api/fbqrsys/plans — list subscription plans
 * Requires: merchants:read (plans are read during merchant create/edit)
 */
import { NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireSystemAdmin } from "@/lib/auth/session";
import {
  getSystemAdminPermissions,
  hasPermission,
  forbiddenResponse,
} from "@/lib/auth/rbac";

export async function GET() {
  const session = await requireSystemAdmin();
  const permissions = await getSystemAdminPermissions(session.user.id);
  if (!hasPermission(permissions, "merchants:read")) {
    return NextResponse.json(forbiddenResponse("merchants:read"), {
      status: 403,
    });
  }

  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { priceMonthly: "asc" },
  });

  return NextResponse.json({ plans });
}
