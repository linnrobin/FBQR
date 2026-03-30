/**
 * PATCH /api/merchant/loyalty/[programId] — update loyalty program
 * DELETE /api/merchant/loyalty/[programId] — deactivate loyalty program
 *
 * Requires: loyalty:manage
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { z } from "zod";
import { auditLog, getRequestMeta } from "@/lib/audit";

const UpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  idrPerPoint: z.number().int().min(1).optional(),
  redemptionRate: z.number().min(0.01).max(100).optional(),
  pointsCalculationBasis: z.enum(["SUBTOTAL", "TOTAL"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant" }, { status: 404 });
  }
  if (!hasPermission(session.user.permissions, "loyalty:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { programId } = await params;
  const existing = await prisma.merchantLoyaltyProgram.findFirst({
    where: { id: programId, restaurantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined)
  );

  const program = await prisma.merchantLoyaltyProgram.update({
    where: { id: programId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: data as any,
  });

  const { ipAddress, userAgent } = getRequestMeta(req);
  await auditLog({
    actorId: session.user.merchantId ?? null,
    actorType: "MERCHANT",
    actorName: session.user.email ?? null,
    action: "UPDATE",
    entity: "MerchantLoyaltyProgram",
    entityId: programId,
    oldValue: { name: existing.name, idrPerPoint: existing.idrPerPoint },
    newValue: data,
    restaurantId,
    ipAddress,
    userAgent,
  });

  return NextResponse.json({ program });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant" }, { status: 404 });
  }
  if (!hasPermission(session.user.permissions, "loyalty:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { programId } = await params;
  const existing = await prisma.merchantLoyaltyProgram.findFirst({
    where: { id: programId, restaurantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.merchantLoyaltyProgram.update({
      where: { id: programId },
      data: { isActive: false, deactivatedAt: new Date() },
    }),
    prisma.merchantSettings.update({
      where: { restaurantId },
      data: { loyaltyEnabled: false },
    }),
  ]);

  const { ipAddress, userAgent } = getRequestMeta(req);
  await auditLog({
    actorId: session.user.merchantId ?? null,
    actorType: "MERCHANT",
    actorName: session.user.email ?? null,
    action: "UPDATE",
    entity: "MerchantLoyaltyProgram",
    entityId: programId,
    oldValue: { isActive: true },
    newValue: { isActive: false },
    restaurantId,
    ipAddress,
    userAgent,
  });

  return NextResponse.json({ ok: true });
}
