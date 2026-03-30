/**
 * Internal push notification helper for apps/menu.
 *
 * Calls the apps/web internal notify endpoint to send push notifications to merchant staff.
 * Non-fatal — any errors are logged but do not affect the caller's response.
 *
 * Requires:
 *   NEXT_PUBLIC_WEB_APP_URL  — URL of apps/web (e.g. https://app.fbqr.app)
 *   INTERNAL_API_SECRET      — shared secret for internal API auth
 */

type NotifyParams =
  | {
      type: "NEW_ORDER";
      restaurantId: string;
      branchId: string;
      payload: { orderNumber: string; tableLabel: string; grandTotal: number };
    }
  | {
      type: "WAITER_CALL";
      restaurantId: string;
      branchId: string;
      payload: { tableLabel: string; requestType: string };
    };

export async function sendInternalNotification(params: NotifyParams): Promise<void> {
  const webAppUrl = process.env.NEXT_PUBLIC_WEB_APP_URL;
  const secret = process.env.INTERNAL_API_SECRET;

  if (!webAppUrl || !secret) return;

  try {
    await fetch(`${webAppUrl}/api/internal/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(params),
    });
  } catch (err) {
    console.error("[notify] sendInternalNotification failed (non-fatal)", err);
  }
}
