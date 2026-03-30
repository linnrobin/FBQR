/**
 * Checkout page — pre-invoice + payment method + order submission.
 * Route: /{restaurantId}/{tableId}/checkout
 *
 * Server Component: validates session + fetches merchant settings.
 * Renders CheckoutScreen (client component) which reads cart from sessionStorage.
 */
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@repo/database";
import { CheckoutScreen, type CheckoutSettings } from "@/components/checkout-screen";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ restaurantId: string; tableId: string }>;
}) {
  const { restaurantId, tableId } = await params;

  // Validate session
  const cookieStore = await cookies();
  const sessionCookieVal = cookieStore.get("fbqr_session_id")?.value;

  if (!sessionCookieVal) {
    redirect(`/${restaurantId}/${tableId}`);
  }

  const session = await prisma.customerSession.findFirst({
    where: {
      sessionCookie: sessionCookieVal,
      tableId,
      status: "ACTIVE",
    },
    select: { id: true, expiresAt: true },
  });

  if (!session || session.expiresAt < new Date()) {
    redirect(`/${restaurantId}/${tableId}`);
  }

  // Fetch merchant settings + restaurant name
  const [settings, restaurant] = await Promise.all([
    prisma.merchantSettings.findUnique({
      where: { restaurantId },
      select: {
        paymentMode: true,
        taxRate: true,
        taxLabel: true,
        serviceChargeRate: true,
        serviceChargeLabel: true,
        taxOnServiceCharge: true,
        pricesIncludeTax: true,
        roundingRule: true,
        loyaltyEnabled: true,
      },
    }),
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { name: true },
    }),
  ]);

  if (!settings || !restaurant) {
    redirect(`/${restaurantId}/${tableId}`);
  }

  const checkoutSettings: CheckoutSettings = {
    paymentMode: settings.paymentMode as "PAY_FIRST" | "PAY_AT_CASHIER",
    restaurantId,
    tableId,
    loyaltyEnabled: settings.loyaltyEnabled,
    taxSettings: {
      taxRate: Number(settings.taxRate),
      taxLabel: settings.taxLabel,
      serviceChargeRate: Number(settings.serviceChargeRate),
      serviceChargeLabel: settings.serviceChargeLabel,
      taxOnServiceCharge: settings.taxOnServiceCharge,
      pricesIncludeTax: settings.pricesIncludeTax,
      roundingRule: settings.roundingRule as "NONE" | "ROUND_50" | "ROUND_100",
    },
  };

  return (
    <CheckoutScreen
      settings={checkoutSettings}
      restaurantName={restaurant.name}
    />
  );
}
