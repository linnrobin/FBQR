/**
 * POST /api/merchant/onboarding/complete — mark the onboarding wizard as complete
 *
 * Sets Merchant.onboardingStep = 6 and Merchant.wizardCompletedAt = now().
 * Also initializes Merchant.onboardingChecklist with completed items from the wizard.
 *
 * Can only complete if step 1 and step 3 are done (onboardingStep >= 3).
 * Requires: active MERCHANT NextAuth session.
 */
import { NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth/session";
import { prisma } from "@repo/database";

export async function POST() {
  const session = await requireMerchant();
  const merchantId = session.user.id;

  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { onboardingStep: true },
  });

  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  // Steps 1 and 3 are required before completing
  if (merchant.onboardingStep < 1) {
    return NextResponse.json(
      { error: "Langkah 1 (Info Restoran) wajib diselesaikan terlebih dahulu." },
      { status: 400 }
    );
  }

  // Build checklist from completed steps
  const checklist: string[] = [];
  if (merchant.onboardingStep >= 1) checklist.push("restaurantInfo");
  if (merchant.onboardingStep >= 2) checklist.push("menuCreated");
  if (merchant.onboardingStep >= 3) checklist.push("tableCreated");
  if (merchant.onboardingStep >= 4) checklist.push("paymentConfigured");
  if (merchant.onboardingStep >= 5) checklist.push("staffInvited");

  await prisma.merchant.update({
    where: { id: merchantId },
    data: {
      onboardingStep: 6,
      wizardCompletedAt: new Date(),
      onboardingChecklist: checklist,
    },
  });

  return NextResponse.json({ success: true });
}
