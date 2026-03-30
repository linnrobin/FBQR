/**
 * Shared delivery order creation helper.
 *
 * Called by each platform webhook handler (GrabFood, GoFood, ShopeeFood)
 * after they authenticate and parse the platform-specific payload.
 *
 * Responsibilities:
 *   - Idempotency: returns existing order if (platformName, platformOrderId)
 *     already exists. Duplicate webhooks from delivery platforms are common.
 *   - Branch resolution: looks up Branch by platformStoreId + restaurantId.
 *   - Queue number: increments today's QueueCounter (WIB date).
 *   - Creates CONFIRMED Order + OrderItems + initial CONFIRMED OrderEvent.
 *   - Fires push notification for kitchen staff (non-fatal).
 *
 * The created order has:
 *   - orderType: DELIVERY
 *   - status: CONFIRMED (delivery orders arrive pre-confirmed)
 *   - confirmedAt: now
 *   - platformName, platformOrderId, estimatedPickupTime
 *   - All item/financial fields snapshotted
 *
 * See docs/merchant.md § Delivery Platform Integration
 *     docs/architecture.md § ADR-012
 */

import { prisma } from "@repo/database";
import { formatInTimeZone } from "date-fns-tz";
import { sendNewOrderNotification } from "@/lib/push";
import { after } from "next/server";

export type DeliveryPlatform = "GRABFOOD" | "GOFOOD" | "SHOPEEFOOD";

export interface DeliveryOrderItem {
  /** Item name as it appears on delivery platform (stored as snapshot) */
  name: string;
  quantity: number;
  /** Unit price in IDR (integer) */
  unitPrice: number;
  /** Optional notes from customer */
  specialRequest?: string | undefined;
}

export interface CreateDeliveryOrderInput {
  platform: DeliveryPlatform;
  /** Unique order ID from the delivery platform */
  platformOrderId: string;
  /** Platform store identifier — used to look up Branch.platformStoreId */
  storeId: string;
  /** Restaurant ID this webhook belongs to (resolved from API key / config) */
  restaurantId: string;
  items: DeliveryOrderItem[];
  /** Subtotal in IDR (before tax/service) */
  subtotal: number;
  taxAmount?: number | undefined;
  serviceChargeAmount?: number | undefined;
  grandTotal: number;
  estimatedPickupTime?: Date | undefined;
  customerNote?: string | undefined;
}

export interface CreateDeliveryOrderResult {
  orderId: string;
  /** true if order was newly created; false if it already existed (idempotent replay) */
  created: boolean;
}

export async function createDeliveryOrder(
  input: CreateDeliveryOrderInput
): Promise<CreateDeliveryOrderResult> {
  const {
    platform,
    platformOrderId,
    storeId,
    restaurantId,
    items,
    subtotal,
    taxAmount = 0,
    serviceChargeAmount = 0,
    grandTotal,
    estimatedPickupTime,
    customerNote,
  } = input;

  // ── Idempotency check ──────────────────────────────────────────────────────
  const existing = await prisma.order.findFirst({
    where: { platformName: platform, platformOrderId },
    select: { id: true },
  });
  if (existing) {
    return { orderId: existing.id, created: false };
  }

  // ── Resolve branch via platformStoreId ────────────────────────────────────
  const branch = await prisma.branch.findFirst({
    where: { restaurantId, platformStoreId: storeId },
    select: { id: true },
  });
  if (!branch) {
    throw new Error(
      `Branch not found for storeId=${storeId} restaurantId=${restaurantId}`
    );
  }

  // ── Queue number ──────────────────────────────────────────────────────────
  const todayKey = formatInTimeZone(new Date(), "Asia/Jakarta", "yyyy-MM-dd");
  const counter = await prisma.queueCounter.upsert({
    where: { branchId_date: { branchId: branch.id, date: todayKey } },
    update: { lastNumber: { increment: 1 } },
    create: { branchId: branch.id, date: todayKey, lastNumber: 1 },
  });

  // ── Resolve kitchen station (use default/first active station) ─────────────
  const defaultStation = await prisma.kitchenStation.findFirst({
    where: { restaurantId, isActive: true },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  const kitchenStationId = defaultStation?.id ?? "default";

  // ── Create order + items + event in transaction ────────────────────────────
  const now = new Date();

  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        branchId: branch.id,
        orderType: "DELIVERY",
        status: "CONFIRMED",
        queueNumber: counter.lastNumber,
        subtotal,
        taxAmount,
        serviceChargeAmount,
        grandTotal,
        currency: "IDR",
        confirmedAt: now,
        platformName: platform,
        platformOrderId,
        estimatedPickupTime: estimatedPickupTime ?? null,
        customerNote: customerNote ?? null,
        items: {
          create: items.map((item) => ({
            menuItemId: "00000000-0000-0000-0000-000000000000", // placeholder — delivery items have no local menuItemId
            name: item.name,
            unitPrice: item.unitPrice,
            variantPriceDelta: 0,
            addonPriceTotal: 0,
            lineTotal: item.unitPrice * item.quantity,
            quantity: item.quantity,
            kitchenStationId,
            specialRequest: item.specialRequest ?? null,
          })),
        },
      },
      select: { id: true },
    });

    // Record CONFIRMED transition in OrderEvent
    await tx.orderEvent.create({
      data: {
        orderId: newOrder.id,
        fromStatus: null,
        toStatus: "CONFIRMED",
        actorType: "SYSTEM",
        actorName: platform,
        note: `Delivery order received from ${platform}`,
      },
    });

    return newOrder;
  });

  // ── Fire push notification (non-fatal) ─────────────────────────────────────
  const platformLabel =
    platform === "GRABFOOD"
      ? "GrabFood"
      : platform === "GOFOOD"
      ? "GoFood"
      : "ShopeeFood";

  after(async () => {
    try {
      await sendNewOrderNotification({
        restaurantId,
        branchId: branch.id,
        orderNumber: String(counter.lastNumber),
        tableLabel: `🛵 ${platformLabel}`,
        grandTotal,
      });
    } catch {
      // Non-fatal
    }
  });

  return { orderId: order.id, created: true };
}
