/**
 * PATCH  /api/merchant/loyalty/[programId]/tiers/[tierId] — update tier
 * DELETE /api/merchant/loyalty/[programId]/tiers/[tierId] — delete tier
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
  name: z.string().min(1).max(80).optional(),
  threshold: z.number().int().min(0).optional(),
  multiplier: z.number().min(0.1).max(10).optional(),
  customTitle: z.string().max(80).nullable().optional(),
  badge: z.string().max(10).nullable().optional(),
});

async function resolveTier(tierId: string, programId: string, restaurantId: string) {
  return prisma.loyaltyTier.findFirst({
    where: {
      id: tierId,
      programId,
      program: { restaurantId },
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ programId: string; tierId: string }> }
) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant" }, { status: 404 });
  }
  if (!hasPermission(session.user.permissions, "loyalty:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { programId, tierId } = await params;
  const existing = await resolveTier(tierId, programId, restaurantId);
  if (!existing) {
    return NextResponse.json({ error: "Tier not found" }, { status: 404 });
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

  const tier = await prisma.loyaltyTier.update({
    where: { id: tierId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: data as any,
  });

  const { ipAddress, userAgent } = getRequestMeta(req);
  await auditLog({
    actorId: session.user.merchantId ?? null,
    actorType: "MERCHANT",
    actorName: session.user.email ?? null,
    action: "UPDATE",
    entity: "LoyaltyTier",
    entityId: tierId,
    oldValue: { name: existing.name, threshold: existing.threshold },
    newValue: data,
    restaurantId,
    ipAddress,
    userAgent,
  });

  return NextResponse.json({ tier });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ programId: string; tierId: string }> }
) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant" }, { status: 404 });
  }
  if (!hasPermission(session.user.permissions, "loyalty:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { programId, tierId } = await params;
  const existing = await resolveTier(tierId, programId, restaurantId);
  if (!existing) {
    return NextResponse.json({ error: "Tier not found" }, { status: 404 });
  }

  await prisma.loyaltyTier.delete({ where: { id: tierId } });

  const { ipAddress, userAgent } = getRequestMeta(req);
  await auditLog({
    actorId: session.user.merchantId ?? null,
    actorType: "MERCHANT",
    actorName: session.user.email ?? null,
    action: "DELETE",
    entity: "LoyaltyTier",
    entityId: tierId,
    oldValue: { name: existing.name, threshold: existing.threshold },
    newValue: null,
    restaurantId,
    ipAddress,
    userAgent,
  });

  return NextResponse.json({ ok: true });
}
