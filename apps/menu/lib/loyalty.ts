/**
 * Loyalty points crediting helpers for apps/menu.
 *
 * creditLoyaltyPoints(orderId) — credits merchant loyalty points after Order → CONFIRMED.
 *   - Non-fatal: never throws.
 *   - Tier-aware: applies the multiplier from the customer's current tier.
 *   - After crediting, recalculates and assigns the correct tier based on new totalEarned.
 *
 * creditPlatformLoyaltyPoints(orderId) — credits cross-restaurant FBQR Platform Points.
 *   - 1 platform point per Rp 50,000 of grand total paid.
 *   - Non-fatal: never throws.
 */
import { prisma } from "@repo/database";
import type { Prisma } from "@repo/database";

// Platform points rate: 1 FBQR point per 50,000 IDR
const PLATFORM_IDR_PER_POINT = 50_000;

export async function creditLoyaltyPoints(orderId: string): Promise<void> {
  try {
    // Load order + session + restaurant settings + tiers
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        grandTotal: true,
        subtotal: true,
        status: true,
        branch: {
          select: {
            restaurantId: true,
            restaurant: {
              select: {
                settings: { select: { loyaltyEnabled: true } },
                loyaltyPrograms: {
                  where: { isActive: true },
                  take: 1,
                  select: {
                    id: true,
                    idrPerPoint: true,
                    pointsCalculationBasis: true,
                    tiers: {
                      orderBy: { threshold: "asc" },
                      select: {
                        id: true,
                        threshold: true,
                        multiplier: true,
                        customTitle: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        customerSession: {
          select: {
            customerId: true,
            customer: { select: { emailVerifiedAt: true } },
          },
        },
      },
    });

    if (!order) return;
    if (!order.customerSession?.customerId) return;
    if (!order.customerSession.customer?.emailVerifiedAt) return;

    const { restaurantId, restaurant } = order.branch;
    if (!restaurant.settings?.loyaltyEnabled) return;
    const program = restaurant.loyaltyPrograms[0];
    if (!program) return;

    const customerId = order.customerSession.customerId;

    // Idempotency: check if points already credited for this order via AuditLog
    const alreadyCredited = await prisma.auditLog.findFirst({
      where: {
        entity: "MerchantLoyaltyBalance",
        action: "CREDIT",
        entityId: orderId,
      },
      select: { id: true },
    });
    if (alreadyCredited) return;

    // Compute base points
    const basisAmount =
      program.pointsCalculationBasis === "SUBTOTAL"
        ? (order.subtotal ?? order.grandTotal)
        : order.grandTotal;
    const basePoints = Math.floor(basisAmount / program.idrPerPoint);
    if (basePoints <= 0) return;

    // Look up current balance to determine active tier multiplier
    const currentBalance = await prisma.merchantLoyaltyBalance.findUnique({
      where: { customerId_restaurantId: { customerId, restaurantId } },
      select: { totalEarned: true },
    });
    const currentTotal = currentBalance?.totalEarned ?? 0;

    // Find current tier (highest threshold the customer has already reached)
    const currentTier = program.tiers
      .filter((t) => currentTotal >= t.threshold)
      .at(-1);

    const multiplier = currentTier ? Number(currentTier.multiplier) : 1.0;
    const pointsEarned = Math.floor(basePoints * multiplier);

    // Upsert balance
    const newBalance = await prisma.merchantLoyaltyBalance.upsert({
      where: { customerId_restaurantId: { customerId, restaurantId } },
      update: {
        balance: { increment: pointsEarned },
        totalEarned: { increment: pointsEarned },
      },
      create: {
        customerId,
        restaurantId,
        programId: program.id,
        balance: pointsEarned,
        totalEarned: pointsEarned,
      },
      select: { totalEarned: true },
    });

    // Recalculate tier assignment based on new totalEarned
    const newTier = program.tiers
      .filter((t) => newBalance.totalEarned >= t.threshold)
      .at(-1);

    const updateData: Prisma.MerchantLoyaltyBalanceUpdateInput = {};
    if (newTier) {
      updateData.tier = { connect: { id: newTier.id } };
    } else {
      updateData.tier = { disconnect: true };
    }
    await prisma.merchantLoyaltyBalance.update({
      where: { customerId_restaurantId: { customerId, restaurantId } },
      data: updateData,
    });

    // Audit log for idempotency guard
    await prisma.auditLog.create({
      data: {
        actorType: "SYSTEM",
        actorName: "System",
        action: "CREDIT",
        entity: "MerchantLoyaltyBalance",
        entityId: orderId, // keyed on orderId for idempotency
        newValue: {
          customerId,
          pointsEarned,
          multiplier,
          programId: program.id,
          tierId: newTier?.id ?? null,
        } as Prisma.InputJsonValue,
        restaurantId,
      },
    });
  } catch (err) {
    console.error("[creditLoyaltyPoints] Failed:", err);
  }
}

/**
 * Credits FBQR Platform Points for a confirmed order.
 * Rate: 1 platform point per PLATFORM_IDR_PER_POINT IDR of grand total.
 * Idempotent: guarded by AuditLog check keyed on orderId.
 */
export async function creditPlatformLoyaltyPoints(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        grandTotal: true,
        customerSession: {
          select: {
            customerId: true,
            customer: { select: { emailVerifiedAt: true } },
          },
        },
      },
    });

    if (!order) return;
    if (!order.customerSession?.customerId) return;
    if (!order.customerSession.customer?.emailVerifiedAt) return;

    const customerId = order.customerSession.customerId;

    // Idempotency
    const alreadyCredited = await prisma.auditLog.findFirst({
      where: {
        entity: "PlatformLoyaltyBalance",
        action: "CREDIT",
        entityId: orderId,
      },
      select: { id: true },
    });
    if (alreadyCredited) return;

    const platformPoints = Math.floor(order.grandTotal / PLATFORM_IDR_PER_POINT);
    if (platformPoints <= 0) return;

    await prisma.platformLoyaltyBalance.upsert({
      where: { customerId },
      update: {
        balance: { increment: platformPoints },
        totalEarned: { increment: platformPoints },
      },
      create: {
        customerId,
        balance: platformPoints,
        totalEarned: platformPoints,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorType: "SYSTEM",
        actorName: "System",
        action: "CREDIT",
        entity: "PlatformLoyaltyBalance",
        entityId: orderId,
        newValue: { customerId, platformPoints } as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error("[creditPlatformLoyaltyPoints] Failed:", err);
  }
}
