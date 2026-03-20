/**
 * GET  /api/fbqrsys/billing/plans — list all subscription plans (incl. inactive)
 * POST /api/fbqrsys/billing/plans — create a new subscription plan
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

const planSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  priceMonthly: z.number().int().min(0),
  priceAnnual: z.number().int().min(0),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  tableLimitCount: z.number().int().positive().optional().nullable(),
  menuItemLimitCount: z.number().int().positive().optional().nullable(),
  branchLimitCount: z.number().int().positive().optional().nullable(),
  layoutAllowed: z.array(z.string()).default([]),
});

export async function GET() {
  const session = await requireSystemAdmin();
  const permissions = await getSystemAdminPermissions(session.user.id);
  if (!hasPermission(permissions, "billing:manage")) {
    return NextResponse.json(forbiddenResponse("billing:manage"), {
      status: 403,
    });
  }

  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { priceMonthly: "asc" },
    include: {
      _count: { select: { subscriptions: true } },
    },
  });

  return NextResponse.json({ plans });
}

export async function POST(req: NextRequest) {
  const session = await requireSystemAdmin();
  const permissions = await getSystemAdminPermissions(session.user.id);
  if (!hasPermission(permissions, "billing:manage")) {
    return NextResponse.json(forbiddenResponse("billing:manage"), {
      status: 403,
    });
  }

  const body = await req.json();
  const parsed = planSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const plan = await prisma.subscriptionPlan.create({
    data: {
      name: d.name,
      description: d.description ?? null,
      priceMonthly: d.priceMonthly,
      priceAnnual: d.priceAnnual,
      features: d.features,
      isActive: d.isActive,
      tableLimitCount: d.tableLimitCount ?? null,
      menuItemLimitCount: d.menuItemLimitCount ?? null,
      branchLimitCount: d.branchLimitCount ?? null,
      layoutAllowed: d.layoutAllowed,
    },
  });

  return NextResponse.json({ plan }, { status: 201 });
}
