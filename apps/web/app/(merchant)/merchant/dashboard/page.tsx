/**
 * Merchant POS dashboard — home screen.
 * Route: /merchant/dashboard
 *
 * If onboardingStep < 6, redirects to the appropriate wizard step.
 * If onboardingStep >= 6, shows the dashboard with the onboarding checklist
 * card (dismissible, persisted in Merchant.onboardingChecklist).
 *
 * Full live dashboard (stat cards, revenue chart, recent orders) is implemented
 * in Step 9+ when Supabase Realtime is connected.
 */
import { redirect } from "next/navigation";
import { requireMerchant } from "@/lib/auth/session";
import { prisma } from "@repo/database";
import { MerchantDashboardClient } from "./dashboard-client";

export default async function MerchantDashboardPage() {
  const session = await requireMerchant();
  const merchantId = session.user.id;

  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: {
      onboardingStep: true,
      onboardingChecklist: true,
      wizardCompletedAt: true,
      status: true,
      trialEndsAt: true,
      restaurant: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!merchant) {
    redirect("/merchant/login");
  }

  // Redirect to wizard if not complete
  // Steps 1 and 3 are required; step 0 means never started
  if (merchant.onboardingStep < 1) {
    redirect("/merchant/onboarding/step-1");
  }
  if (merchant.onboardingStep === 1) {
    redirect("/merchant/onboarding/step-2");
  }
  if (merchant.onboardingStep === 2) {
    redirect("/merchant/onboarding/step-3");
  }
  // Steps 3–5 are optional after 3 — wizard can be completed; allow dashboard access
  // if somehow the user bypassed (onboardingStep 3–5 + no wizardCompletedAt)
  // The "Lewati ke Dashboard" link handles this; onboarding/complete sets step=6.
  // If onboardingStep is 3–5 but wizard not complete, still allow dashboard access.

  const checklist = Array.isArray(merchant.onboardingChecklist)
    ? (merchant.onboardingChecklist as string[])
    : [];

  // Compute trial days remaining
  let trialDaysLeft: number | null = null;
  if (merchant.status === "TRIAL" && merchant.trialEndsAt) {
    const ms = merchant.trialEndsAt.getTime() - Date.now();
    trialDaysLeft = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }

  return (
    <MerchantDashboardClient
      restaurantName={merchant.restaurant?.name ?? "Restoran Anda"}
      merchantStatus={merchant.status}
      trialDaysLeft={trialDaysLeft}
      onboardingChecklist={checklist}
      wizardComplete={merchant.onboardingStep >= 6}
    />
  );
}
