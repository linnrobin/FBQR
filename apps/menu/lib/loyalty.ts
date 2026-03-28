/**
 * Loyalty points crediting helper for apps/menu.
 *
 * Called after an Order moves to CONFIRMED. Non-fatal — never throws.
 * Points are only credited if:
 *   1. The order's CustomerSession has a customerId (customer is logged in)
 *   2. The customer's emailVerifiedAt is set
 *   3. The restaurant has loyaltyEnabled = true with an active MerchantLoyaltyProgram
 *   4. No prior credit exists for this order (idempotency)
 */
import { prisma } from "@repo/database";

export async function creditLoyaltyPoints(orderId: string): Promise<void> {
  try {
    // Load order + session + restaurant settings
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

    // Compute points
    const basisAmount =
      program.pointsCalculationBasis === "SUBTOTAL"
        ? (order.subtotal ?? order.grandTotal)
        : order.grandTotal;
    const pointsEarned = Math.floor(basisAmount / program.idrPerPoint);
    if (pointsEarned <= 0) return;

    // Upsert balance
    await prisma.merchantLoyaltyBalance.upsert({
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
    });

    // Audit log for idempotency guard
    await prisma.auditLog.create({
      data: {
        actorType: "SYSTEM",
        actorName: "System",
        action: "CREDIT",
        entity: "MerchantLoyaltyBalance",
        entityId: orderId, // keyed on orderId for idempotency
        newValue: { customerId, pointsEarned, programId: program.id },
        restaurantId,
      },
    });
  } catch (err) {
    console.error("[creditLoyaltyPoints] Failed:", err);
  }
}
