/**
 * WhatsApp Business notification sender for apps/menu — Step 27.
 *
 * Mirror of apps/web/lib/whatsapp.ts (same interface, same non-fatal behavior).
 * Reads MerchantIntegration credentials from DB directly.
 *
 * Uses Fonnte API. Credentials stored per-merchant in MerchantIntegration.credentials:
 *   { "token": "<fonnte_device_token>", "senderNumber": "+6281234567890" }
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

  const rawPrefs = (restaurant.settings?.waNotifications ?? {}) as Record<string, unknown>;
  const prefs: WaNotificationPrefs = {
    orderReady: rawPrefs.orderReady !== false,
    invoiceSent: rawPrefs.invoiceSent !== false,
    newOrder: rawPrefs.newOrder === true,
  };

  return {
    creds: { token: creds.token, senderNumber: (creds.senderNumber as string) ?? undefined },
    prefs,
  };
}

// ── Public notification helpers ────────────────────────────────────────────────

/**
 * Send invoice + payment confirmation to customer via WhatsApp.
 * Called after invoice PDF is generated (non-fatal).
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
