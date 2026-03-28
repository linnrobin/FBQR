/**
 * Web Push notification sender utility — Step 18.
 *
 * Uses the Web Push API (VAPID) to send browser push notifications to merchant staff.
 * Subscriptions are stored in `StaffPushSubscription` table, scoped to a restaurant.
 *
 * Environment variables required:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY  — safe to expose (used by browser to subscribe)
 *   VAPID_PRIVATE_KEY             — server-only, never expose to client
 *   VAPID_SUBJECT                 — "mailto:..." or app URL
 */

import webpush from "web-push";
import { prisma } from "@repo/database";

// ── VAPID initialisation ──────────────────────────────────────────────────────

let vapidInitialised = false;

function ensureVapid() {
  if (vapidInitialised) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@fbqr.app";

  if (!publicKey || !privateKey) {
    console.warn("[push] VAPID keys not configured — push notifications disabled");
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidInitialised = true;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

// ── Internal send helper ──────────────────────────────────────────────────────

async function sendToSubscriptions(
  subscriptions: Array<{ id: string; endpoint: string; p256dh: string; auth: string }>,
  payload: PushPayload
): Promise<void> {
  ensureVapid();
  if (!vapidInitialised) return;

  const payloadStr = JSON.stringify(payload);
  const staleIds: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payloadStr
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          // Subscription expired or removed — mark for cleanup
          staleIds.push(sub.id);
        } else {
          console.error("[push] sendNotification error", { endpoint: sub.endpoint, status, err });
        }
      }
    })
  );

  // Clean up stale subscriptions asynchronously
  if (staleIds.length > 0) {
    prisma.staffPushSubscription
      .deleteMany({ where: { id: { in: staleIds } } })
      .catch((e) => console.error("[push] cleanup stale subs failed", e));
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Send a "new order" push notification to all subscribers for a restaurant/branch.
 * Respects the `pushNotifications.newOrder` MerchantSettings toggle.
 */
export async function sendNewOrderNotification(params: {
  restaurantId: string;
  branchId: string;
  orderNumber: string;
  tableLabel: string;
  grandTotal: number;
}): Promise<void> {
  try {
    const settings = await prisma.merchantSettings.findFirst({
      where: { restaurantId: params.restaurantId },
      select: { pushNotifications: true },
    });

    const prefs = (settings?.pushNotifications ?? {}) as Record<string, boolean>;
    if (prefs.newOrder === false) return;

    const subscriptions = await prisma.staffPushSubscription.findMany({
      where: {
        restaurantId: params.restaurantId,
        ...(params.branchId ? { OR: [{ branchId: params.branchId }, { branchId: null }] } : {}),
      },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });

    if (subscriptions.length === 0) return;

    const formattedTotal = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(params.grandTotal);

    await sendToSubscriptions(subscriptions, {
      title: `Pesanan Baru — ${params.tableLabel}`,
      body: `${formattedTotal} · #${params.orderNumber}`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      tag: `new-order-${params.orderNumber}`,
      data: { type: "NEW_ORDER", restaurantId: params.restaurantId, branchId: params.branchId },
    });
  } catch (err) {
    console.error("[push] sendNewOrderNotification failed", err);
  }
}

/**
 * Send a "Call Waiter" push notification to all subscribers for a branch.
 * Respects the `pushNotifications.waiterCall` MerchantSettings toggle.
 */
export async function sendWaiterCallNotification(params: {
  restaurantId: string;
  branchId: string;
  tableLabel: string;
  requestType: string;
}): Promise<void> {
  try {
    const settings = await prisma.merchantSettings.findFirst({
      where: { restaurantId: params.restaurantId },
      select: { pushNotifications: true },
    });

    const prefs = (settings?.pushNotifications ?? {}) as Record<string, boolean>;
    if (prefs.waiterCall === false) return;

    const subscriptions = await prisma.staffPushSubscription.findMany({
      where: {
        restaurantId: params.restaurantId,
        OR: [{ branchId: params.branchId }, { branchId: null }],
      },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });

    if (subscriptions.length === 0) return;

    const typeLabel =
      params.requestType === "BILL"
        ? "Minta Struk"
        : params.requestType === "ASSISTANCE"
          ? "Butuh Bantuan"
          : "Panggil Pelayan";

    await sendToSubscriptions(subscriptions, {
      title: typeLabel,
      body: `Meja ${params.tableLabel} membutuhkan perhatian.`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      tag: `waiter-call-${params.branchId}`,
      data: {
        type: "WAITER_CALL",
        restaurantId: params.restaurantId,
        branchId: params.branchId,
        requestType: params.requestType,
      },
    });
  } catch (err) {
    console.error("[push] sendWaiterCallNotification failed", err);
  }
}
