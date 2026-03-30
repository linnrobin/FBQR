/**
 * Merchant Settings page — server component.
 * Route: /merchant/settings
 *
 * Fetches current MerchantSettings and passes to SettingsClient.
 * If no settings row exists yet, passes schema defaults.
 */
import { requireMerchant } from "@/lib/auth/session";
import { prisma } from "@repo/database";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function SettingsPage() {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) redirect("/merchant/dashboard");

  const settings = await prisma.merchantSettings.findUnique({
    where: { restaurantId },
    select: {
      paymentMode: true,
      paymentTimeoutMinutes: true,
      maxPendingOrders: true,
      maxOrderValueIDR: true,
      maxActiveOrders: true,
      eodCashCleanupHour: true,
      roundingRule: true,
      orderingPaused: true,
      orderingPausedMessage: true,
      enableDirtyState: true,
      tableSessionTimeoutMinutes: true,
      preparingAlertMinutes: true,
      autoCompleteReadyMinutes: true,
      autoPrintKitchenTicket: true,
      autoPrintReceipt: true,
      pushNotifications: true,
      emailNotifications: true,
      aiShowBestsellers: true,
      aiPersonalized: true,
      aiUpsell: true,
      aiTimeBased: true,
      allowPromotionStacking: true,
      loyaltyEnabled: true,
    },
  });

  // Cast: Prisma enum/Json types are structurally identical to the client interface;
  // the cast is safe and contained here rather than leaking Prisma types into client components.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <SettingsClient initialSettings={settings as any} />;
}
