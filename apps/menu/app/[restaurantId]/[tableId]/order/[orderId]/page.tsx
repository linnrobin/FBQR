/**
 * Order Tracking Page — Server Component.
 * Route: /{restaurantId}/{tableId}/order/{orderId}
 *
 * 1. Validates session cookie (must be ACTIVE or recently expired — customer
 *    can still view tracking screen for in-flight orders after session expiry).
 * 2. Renders OrderTrackingScreen (client component).
 *
 * The client component handles all dynamic data fetching and Realtime updates.
 * This server component only validates the route and redirects if no session at all.
 */
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@repo/database";
import { OrderTrackingScreen } from "@/components/order-tracking-screen";

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ restaurantId: string; tableId: string; orderId: string }>;
}) {
  const { restaurantId, tableId, orderId } = await params;
  const cookieStore = await cookies();
  const sessionCookieVal = cookieStore.get("fbqr_session_id")?.value;

  if (!sessionCookieVal) {
    // No session at all — redirect to menu root (they need to scan QR)
    redirect(`/${restaurantId}/${tableId}`);
  }

  // Allow viewing the tracking screen even for expired sessions — customer
  // may need to see in-flight order status after session timeout.
  const session = await prisma.customerSession.findFirst({
    where: {
      sessionCookie: sessionCookieVal,
      tableId,
    },
    select: { id: true, status: true },
  });

  if (!session) {
    redirect(`/${restaurantId}/${tableId}`);
  }

  return (
    <OrderTrackingScreen
      orderId={orderId}
      restaurantId={restaurantId}
      tableId={tableId}
    />
  );
}
