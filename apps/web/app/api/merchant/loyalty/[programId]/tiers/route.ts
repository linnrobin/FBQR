/**
 * GET  /api/merchant/loyalty/[programId]/tiers — list tiers for a program
 * POST /api/merchant/loyalty/[programId]/tiers — create a new tier
 *
 * Requires: loyalty:manage
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { z } from "zod";
import { auditLog, getRequestMeta } from "@/lib/audit";

const CreateSchema = z.object({
  name: z.string().min(1).max(80),
  threshold: z.number().int().min(0),
  multiplier: z.number().min(0.1).max(10).default(1.0),
  customTitle: z.string().max(80).optional(),
  badge: z.string().max(10).optional(),
});

async function resolveProgram(programId: string, restaurantId: string) {
  return prisma.merchantLoyaltyProgram.findFirst({
    where: { id: programId, restaurantId },
  });
}

export async function GET(
  _req: NextRequest,
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
  const program = await resolveProgram(programId, restaurantId);
  if (!program) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }

  const tiers = await prisma.loyaltyTier.findMany({
    where: { programId },
    orderBy: { threshold: "asc" },
  });

  return NextResponse.json({ tiers });
}

export async function POST(
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
  const program = await resolveProgram(programId, restaurantId);
  if (!program) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const tier = await prisma.loyaltyTier.create({
    data: {
      programId,
      name: parsed.data.name,
      threshold: parsed.data.threshold,
      multiplier: parsed.data.multiplier,
      customTitle: parsed.data.customTitle ?? null,
      badge: parsed.data.badge ?? null,
    },
  });

  const { ipAddress, userAgent } = getRequestMeta(req);
  await auditLog({
    actorId: session.user.merchantId ?? null,
    actorType: "MERCHANT",
    actorName: session.user.email ?? null,
    action: "CREATE",
    entity: "LoyaltyTier",
    entityId: tier.id,
    newValue: { name: tier.name, threshold: tier.threshold, programId },
    restaurantId,
    ipAddress,
    userAgent,
  });

  return NextResponse.json({ tier }, { status: 201 });
}
