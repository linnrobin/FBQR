/**
 * WhatsApp Business notification sender — Step 27.
 *
 * Uses the Fonnte API (https://fonnte.com) to send WhatsApp messages.
 * Credentials are stored per-merchant in MerchantIntegration.credentials JSON:
 *   { "token": "<fonnte_device_token>", "senderNumber": "+6281234567890" }
 *
 * All send functions are non-fatal — errors are logged but never thrown.
 * Call them via after() or fire-and-forget from API routes.
 *
 * Env vars:
 *   None required globally — credentials are per-merchant in DB.
 *
 * MerchantSettings.waNotifications JSON:
 *   { "orderReady": true, "invoiceSent": true, "newOrder": false }
 */

import { prisma } from "@repo/database";

// ── Types ──────────────────────────────────────────────────────────────────────

interface FonnteCredentials {
  token: string;
  senderNumber?: string;
}

interface WaNotificationPrefs {
  orderReady: boolean;
  invoiceSent: boolean;
  newOrder: boolean;
}

// ── Core sender ────────────────────────────────────────────────────────────────

const FONNTE_SEND_URL = "https://api.fonnte.com/send";

/**
 * Send a WhatsApp message via Fonnte API.
 * @param token  Fonnte device token
 * @param to     Recipient phone in E.164 or local format (e.g. 081234567890)
 * @param message Message text (supports basic markdown: *bold*, _italic_)
 * @returns true on success, false on failure
 */
async function sendFonnteMessage(token: string, to: string, message: string): Promise<boolean> {
  try {
    const res = await fetch(FONNTE_SEND_URL, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ target: to, message }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[whatsapp] Fonnte API error", { status: res.status, body });
      return false;
    }

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (data.status === false) {
      console.error("[whatsapp] Fonnte rejected message", data);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[whatsapp] sendFonnteMessage network error", err);
    return false;
  }
}

// ── Integration lookup ─────────────────────────────────────────────────────────

async function getWaIntegration(
  restaurantId: string
): Promise<{ creds: FonnteCredentials; prefs: WaNotificationPrefs } | null> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      merchantId: true,
      settings: { select: { waNotifications: true } },
    },
  });

  if (!restaurant) return null;

  const integration = await prisma.merchantIntegration.findFirst({
    where: {
      merchantId: restaurant.merchantId,
      type: "WHATSAPP",
      isActive: true,
    },
    select: { credentials: true },
  });

  if (!integration) return null;

  const creds = integration.credentials as Record<string, unknown>;
  if (!creds.token || typeof creds.token !== "string") return null;

  const defaultPrefs: WaNotificationPrefs = { orderReady: true, invoiceSent: true, newOrder: false };
  const rawPrefs = (restaurant.settings?.waNotifications ?? {}) as Record<string, unknown>;
  const prefs: WaNotificationPrefs = {
    orderReady: rawPrefs.orderReady !== false,
    invoiceSent: rawPrefs.invoiceSent !== false,
    newOrder: rawPrefs.newOrder === true,
  };

  return {
    creds: { token: creds.token, senderNumber: (creds.senderNumber as string) ?? undefined },
    prefs: { ...defaultPrefs, ...prefs },
  };
}

// ── Public notification helpers ────────────────────────────────────────────────

/**
 * Notify customer via WhatsApp when their order is READY.
 * Called from kitchen status route after READY transition.
 */
export async function sendOrderReadyNotification(params: {
  restaurantId: string;
  orderId: string;
  customerPhone: string | null | undefined;
  restaurantName: string;
  tableLabel: string;
  orderNumber: string;
}): Promise<void> {
  if (!params.customerPhone) return;

  try {
    const integration = await getWaIntegration(params.restaurantId);
    if (!integration) return;
    if (!integration.prefs.orderReady) return;

    const message =
      `🍽️ *Pesanan Anda Siap!*\n\n` +
      `Restoran: *${params.restaurantName}*\n` +
      `Meja: ${params.tableLabel}\n` +
      `No. Pesanan: #${params.orderNumber}\n\n` +
      `Pesanan Anda sudah siap disajikan. Selamat menikmati! 😊`;

    await sendFonnteMessage(integration.creds.token, params.customerPhone, message);
  } catch (err) {
    console.error("[whatsapp] sendOrderReadyNotification failed (non-fatal)", err);
  }
}

/**
 * Send invoice link to customer via WhatsApp after payment is confirmed.
 * Called after invoice PDF is generated.
 */
export async function sendInvoiceNotification(params: {
  restaurantId: string;
  customerPhone: string | null | undefined;
  restaurantName: string;
  invoiceNumber: string;
  grandTotal: number;
  pdfUrl: string | null | undefined;
}): Promise<void> {
  if (!params.customerPhone) return;

  try {
    const integration = await getWaIntegration(params.restaurantId);
    if (!integration) return;
    if (!integration.prefs.invoiceSent) return;

    const formattedTotal = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(params.grandTotal);

    let message =
      `🧾 *Struk Pembayaran*\n\n` +
      `Restoran: *${params.restaurantName}*\n` +
      `No. Invoice: ${params.invoiceNumber}\n` +
      `Total: *${formattedTotal}*\n\n` +
      `Terima kasih telah makan di ${params.restaurantName}! 🙏`;

    if (params.pdfUrl) {
      message += `\n\nUnduh struk: ${params.pdfUrl}`;
    }

    await sendFonnteMessage(integration.creds.token, params.customerPhone, message);
  } catch (err) {
    console.error("[whatsapp] sendInvoiceNotification failed (non-fatal)", err);
  }
}

/**
 * Notify merchant (restaurant owner) via WhatsApp when a new order arrives.
 * Only fires when MerchantSettings.waNotifications.newOrder = true.
 */
export async function sendNewOrderWaNotification(params: {
  restaurantId: string;
  orderNumber: string;
  tableLabel: string;
  grandTotal: number;
  itemCount: number;
  ownerPhone: string | null | undefined;
}): Promise<void> {
  if (!params.ownerPhone) return;

  try {
    const integration = await getWaIntegration(params.restaurantId);
    if (!integration) return;
    if (!integration.prefs.newOrder) return;

    const formattedTotal = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(params.grandTotal);

    const message =
      `🔔 *Pesanan Baru!*\n\n` +
      `Meja: ${params.tableLabel}\n` +
      `No. Pesanan: #${params.orderNumber}\n` +
      `Item: ${params.itemCount} item\n` +
      `Total: *${formattedTotal}*\n\n` +
      `Buka dapur untuk memproses pesanan.`;

    await sendFonnteMessage(integration.creds.token, params.ownerPhone, message);
  } catch (err) {
    console.error("[whatsapp] sendNewOrderWaNotification failed (non-fatal)", err);
  }
}
