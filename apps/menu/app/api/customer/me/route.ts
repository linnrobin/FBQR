/**
 * GET /api/customer/me
 *
 * Returns the current customer's profile, loyalty balance (with tier info),
 * platform loyalty balance, and recent orders.
 *
 * Query params:
 *   restaurantId — include merchant loyalty balance for this restaurant (optional)
 *
 * Response 200: { customer, loyaltyBalance?, platformLoyalty?, recentOrders }
 * Response 401: not authenticated
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { getCustomerSession } from "@/lib/customer-auth";
import { z } from "zod";

const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9]{8,15}$/, "Format nomor tidak valid (contoh: +6281234567890)")
    .nullable()
    .optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  }

  const data = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined)
  );

  const updated = await prisma.customer.update({
    where: { id: session.customerId },
    data,
    select: { id: true, email: true, name: true, phone: true },
  });

  return NextResponse.json({ customer: updated });
}

export async function GET(req: NextRequest) {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restaurantId = req.nextUrl.searchParams.get("restaurantId") ?? "";

  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId, status: "ACTIVE" },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      emailVerifiedAt: true,
      createdAt: true,
      platformLoyalty: {
        select: { balance: true, totalEarned: true },
      },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Merchant loyalty balance with tier + next-tier progress
  let loyaltyBalance = null;
  if (restaurantId) {
    const balance = await prisma.merchantLoyaltyBalance.findUnique({
      where: { customerId_restaurantId: { customerId: customer.id, restaurantId } },
      select: {
        balance: true,
        totalEarned: true,
        program: {
          select: {
            name: true,
            idrPerPoint: true,
            redemptionRate: true,
            tiers: {
              orderBy: { threshold: "asc" },
              select: {
                id: true,
                name: true,
                threshold: true,
                multiplier: true,
                customTitle: true,
                badge: true,
              },
            },
          },
        },
        tier: {
          select: {
            id: true,
            name: true,
            customTitle: true,
            badge: true,
            multiplier: true,
          },
        },
      },
    });

    if (balance) {
      const allTiers = balance.program?.tiers ?? [];
      const nextTier = allTiers.find((t) => t.threshold > balance.totalEarned) ?? null;

      loyaltyBalance = {
        balance: balance.balance,
        totalEarned: balance.totalEarned,
        program: {
          name: balance.program?.name ?? "",
          idrPerPoint: balance.program?.idrPerPoint ?? 1000,
          redemptionRate: balance.program?.redemptionRate ?? 100,
        },
        tier: balance.tier
          ? {
              name: balance.tier.name,
              customTitle: balance.tier.customTitle,
              badge: balance.tier.badge,
              multiplier: Number(balance.tier.multiplier),
            }
          : null,
        nextTier: nextTier
          ? {
              name: nextTier.name,
              threshold: nextTier.threshold,
              badge: nextTier.badge,
            }
          : null,
        pointsToNextTier: nextTier ? nextTier.threshold - balance.totalEarned : null,
      };
    }
  }

  // Recent orders (last 5, scoped to restaurant if restaurantId provided)
  const recentOrders = await prisma.order.findMany({
    where: {
      customerSession: { customerId: customer.id },
      status: { notIn: ["EXPIRED"] },
      ...(restaurantId ? { branch: { restaurantId } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      status: true,
      grandTotal: true,
      queueNumber: true,
      createdAt: true,
      items: {
        take: 5,
        select: { name: true, quantity: true, lineTotal: true },
      },
    },
  });

  return NextResponse.json({
    customer: {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone ?? null,
      emailVerified: !!customer.emailVerifiedAt,
      createdAt: customer.createdAt,
    },
    loyaltyBalance,
    platformLoyalty: customer.platformLoyalty ?? null,
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      status: o.status,
      grandTotal: o.grandTotal,
      queueNumber: o.queueNumber,
      createdAt: o.createdAt.toISOString(),
      items: o.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        lineTotal: i.lineTotal,
      })),
    })),
  });
}
