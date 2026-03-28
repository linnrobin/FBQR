/**
 * GET /api/customer/me
 *
 * Returns the current customer's profile + loyalty balance for a given restaurant.
 * Query params:
 *   restaurantId — include loyalty balance for this restaurant (optional)
 *
 * Response 200: { customer, loyaltyBalance? }
 * Response 401: not authenticated
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { getCustomerSession } from "@/lib/customer-auth";

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
      emailVerifiedAt: true,
      createdAt: true,
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let loyaltyBalance = null;
  if (restaurantId) {
    loyaltyBalance = await prisma.merchantLoyaltyBalance.findUnique({
      where: { customerId_restaurantId: { customerId: customer.id, restaurantId } },
      select: {
        balance: true,
        totalEarned: true,
        program: { select: { name: true, idrPerPoint: true, redemptionRate: true } },
        tier: { select: { name: true, customTitle: true } },
      },
    });
  }

  return NextResponse.json({
    customer: {
      ...customer,
      emailVerified: !!customer.emailVerifiedAt,
    },
    loyaltyBalance,
  });
}
