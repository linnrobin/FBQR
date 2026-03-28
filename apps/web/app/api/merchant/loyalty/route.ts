/**
 * GET  /api/merchant/loyalty — get the restaurant's loyalty program (if any)
 * POST /api/merchant/loyalty — create a new loyalty program
 *
 * Requires: loyalty:manage
 * One active program per restaurant (constraint enforced via unique partial index).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { z } from "zod";
import { auditLog, getRequestMeta } from "@/lib/audit";

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  idrPerPoint: z.number().int().min(1),
  redemptionRate: z.number().min(0.01).max(100),
  pointsCalculationBasis: z.enum(["SUBTOTAL", "TOTAL"]).default("SUBTOTAL"),
});

export async function GET() {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant" }, { status: 404 });
  }

  if (!hasPermission(session.user.permissions, "loyalty:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const program = await prisma.merchantLoyaltyProgram.findFirst({
    where: { restaurantId, isActive: true },
    include: { tiers: { orderBy: { threshold: "asc" } } },
  });

  return NextResponse.json({ program });
}

export async function POST(req: NextRequest) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant" }, { status: 404 });
  }

  if (!hasPermission(session.user.permissions, "loyalty:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Deactivate any existing active program first
  await prisma.merchantLoyaltyProgram.updateMany({
    where: { restaurantId, isActive: true },
    data: { isActive: false, deactivatedAt: new Date() },
  });

  const program = await prisma.merchantLoyaltyProgram.create({
    data: {
      restaurantId,
      name: parsed.data.name,
      idrPerPoint: parsed.data.idrPerPoint,
      redemptionRate: parsed.data.redemptionRate,
      pointsCalculationBasis: parsed.data.pointsCalculationBasis,
      isActive: true,
      activatedAt: new Date(),
    },
  });

  // Enable loyalty in settings
  await prisma.merchantSettings.upsert({
    where: { restaurantId },
    update: { loyaltyEnabled: true },
    create: { restaurantId, loyaltyEnabled: true },
  });

  const { ipAddress, userAgent } = getRequestMeta(req);
  await auditLog({
    actorId: session.user.merchantId ?? null,
    actorType: "MERCHANT",
    actorName: session.user.email ?? null,
    action: "CREATE",
    entity: "MerchantLoyaltyProgram",
    entityId: program.id,
    newValue: { name: program.name, idrPerPoint: program.idrPerPoint },
    restaurantId,
    ipAddress,
    userAgent,
  });

  return NextResponse.json({ program }, { status: 201 });
}
