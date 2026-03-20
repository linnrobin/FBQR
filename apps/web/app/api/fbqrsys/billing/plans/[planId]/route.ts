/**
 * GET    /api/fbqrsys/billing/plans/[planId] — get a plan
 * PATCH  /api/fbqrsys/billing/plans/[planId] — update a plan
 * DELETE /api/fbqrsys/billing/plans/[planId] — deactivate a plan
 *
 * Requires: billing:manage
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireSystemAdmin } from "@/lib/auth/session";
import {
  getSystemAdminPermissions,
  hasPermission,
  forbiddenResponse,
} from "@/lib/auth/rbac";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  priceMonthly: z.number().int().min(0).optional(),
  priceAnnual: z.number().int().min(0).optional(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  tableLimitCount: z.number().int().positive().optional().nullable(),
  menuItemLimitCount: z.number().int().positive().optional().nullable(),
  branchLimitCount: z.number().int().positive().optional().nullable(),
  layoutAllowed: z.array(z.string()).optional(),
});

async function checkPermission(adminId: string) {
  const permissions = await getSystemAdminPermissions(adminId);
  return hasPermission(permissions, "billing:manage");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await requireSystemAdmin();
  if (!(await checkPermission(session.user.id))) {
    return NextResponse.json(forbiddenResponse("billing:manage"), {
      status: 403,
    });
  }

  const { planId } = await params;
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: planId },
    include: { _count: { select: { subscriptions: true } } },
  });

  if (!plan) {
    return NextResponse.json({ error: "PLAN_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ plan });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await requireSystemAdmin();
  if (!(await checkPermission(session.user.id))) {
    return NextResponse.json(forbiddenResponse("billing:manage"), {
      status: 403,
    });
  }

  const { planId } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const plan = await prisma.subscriptionPlan.update({
    where: { id: planId },
    data: {
      ...(d.name !== undefined && { name: d.name }),
      ...(d.description !== undefined && { description: d.description ?? null }),
      ...(d.priceMonthly !== undefined && { priceMonthly: d.priceMonthly }),
      ...(d.priceAnnual !== undefined && { priceAnnual: d.priceAnnual }),
      ...(d.features !== undefined && { features: d.features }),
      ...(d.isActive !== undefined && { isActive: d.isActive }),
      ...(d.tableLimitCount !== undefined && { tableLimitCount: d.tableLimitCount ?? null }),
      ...(d.menuItemLimitCount !== undefined && { menuItemLimitCount: d.menuItemLimitCount ?? null }),
      ...(d.branchLimitCount !== undefined && { branchLimitCount: d.branchLimitCount ?? null }),
      ...(d.layoutAllowed !== undefined && { layoutAllowed: d.layoutAllowed }),
    },
  });

  return NextResponse.json({ plan });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await requireSystemAdmin();
  if (!(await checkPermission(session.user.id))) {
    return NextResponse.json(forbiddenResponse("billing:manage"), {
      status: 403,
    });
  }

  const { planId } = await params;

  // Soft deactivate — do not hard-delete plans that have active subscriptions
  const plan = await prisma.subscriptionPlan.update({
    where: { id: planId },
    data: { isActive: false },
  });

  return NextResponse.json({ plan });
}
