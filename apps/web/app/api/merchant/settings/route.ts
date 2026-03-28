/**
 * Merchant settings API — GET and PATCH.
 * Route: /api/merchant/settings
 *
 * GET  — Returns current MerchantSettings for the restaurant.
 * PATCH — Partial update; any subset of fields may be sent per tab save.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";
import { z } from "zod";

const PushNotificationsSchema = z.object({
  newOrder: z.boolean(),
  waiterCall: z.boolean(),
  lowStock: z.boolean(),
  billingReminder: z.boolean(),
});

const EmailNotificationsSchema = z.object({
  dailySummary: z.boolean(),
  billingInvoice: z.boolean(),
  lowStock: z.boolean(),
});

const WaNotificationsSchema = z.object({
  orderReady: z.boolean(),
  invoiceSent: z.boolean(),
  newOrder: z.boolean(),
});

const UpdateSettingsSchema = z.object({
  // Ordering control
  orderingPaused: z.boolean().optional(),
  orderingPausedMessage: z.string().max(200).nullable().optional(),
  // Payment
  paymentMode: z.enum(["PAY_FIRST", "PAY_AT_CASHIER"]).optional(),
  paymentTimeoutMinutes: z.number().int().min(5).max(60).optional(),
  maxPendingOrders: z.number().int().min(1).max(100).optional(),
  maxOrderValueIDR: z.number().int().min(1000).optional(),
  maxActiveOrders: z.number().int().min(1).max(999).nullable().optional(),
  eodCashCleanupHour: z.number().int().min(0).max(23).optional(),
  roundingRule: z.enum(["NONE", "ROUND_50", "ROUND_100"]).optional(),
  // Table session
  enableDirtyState: z.boolean().optional(),
  tableSessionTimeoutMinutes: z.number().int().min(15).max(1440).optional(),
  // Kitchen
  preparingAlertMinutes: z.number().int().min(5).max(240).optional(),
  autoCompleteReadyMinutes: z.number().int().min(1).max(120).nullable().optional(),
  autoPrintKitchenTicket: z.boolean().optional(),
  autoPrintReceipt: z.boolean().optional(),
  // Notifications
  pushNotifications: PushNotificationsSchema.optional(),
  emailNotifications: EmailNotificationsSchema.optional(),
  // AI
  aiShowBestsellers: z.boolean().optional(),
  aiPersonalized: z.boolean().optional(),
  aiUpsell: z.boolean().optional(),
  aiTimeBased: z.boolean().optional(),
  // Promotions
  allowPromotionStacking: z.boolean().optional(),
  // Loyalty
  loyaltyEnabled: z.boolean().optional(),
  // WhatsApp
  waNotifications: WaNotificationsSchema.optional(),
});

export async function GET(_req: NextRequest) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const settings = await prisma.merchantSettings.findUnique({
    where: { restaurantId },
  });

  return NextResponse.json({ settings: settings ?? null });
}

export async function PATCH(req: NextRequest) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = UpdateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Strip undefined keys so Prisma's exactOptionalPropertyTypes constraint is satisfied.
  // null values are intentional (nullable fields) and must be preserved.
  const data = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined)
  );

  const settings = await prisma.merchantSettings.upsert({
    where: { restaurantId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update: data as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: { restaurantId, ...(data as any) },
  });

  return NextResponse.json({ settings });
}
