/**
 * GET /api/merchant/onboarding — fetch current onboarding state for the merchant
 *
 * Returns onboardingStep, restaurantId, branchId, and key onboarding data
 * so wizard pages can pre-populate fields on revisit.
 *
 * Requires: active MERCHANT NextAuth session.
 */
import { NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth/session";
import { prisma } from "@repo/database";

export async function GET() {
  const session = await requireMerchant();
  const merchantId = session.user.id;

  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: {
      onboardingStep: true,
      onboardingChecklist: true,
      wizardCompletedAt: true,
      restaurant: {
        select: {
          id: true,
          name: true,
          cuisineType: true,
          branding: { select: { logoUrl: true } },
          branches: {
            take: 1,
            orderBy: { createdAt: "asc" },
            select: { id: true, name: true, address: true },
          },
          settings: { select: { paymentMode: true } },
        },
      },
    },
  });

  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  return NextResponse.json({ merchant });
}
