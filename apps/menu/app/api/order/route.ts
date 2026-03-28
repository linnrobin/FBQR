/**
 * POST /api/order — Create a new Order + Payment from cart data.
 *
 * Request body (JSON):
 *   restaurantId    string
 *   tableId         string
 *   items           CartEntry[]
 *   paymentMethod   "QRIS" | "VA" | "CARD" | "CASH"
 *   idempotencyKey  string (client-generated UUID)
 *   customerNote?   string
 *
 * Response:
 *   PAY_FIRST:       { orderId, snapToken, redirectUrl, grandTotal }
 *   PAY_AT_CASHIER:  { orderId, grandTotal, paymentMode: "PAY_AT_CASHIER" }
 */
import { NextRequest, NextResponse, after } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@repo/database";
import { formatInTimeZone } from "date-fns-tz";
import type { CartEntry } from "@/components/item-detail-modal";
import { sendInternalNotification } from "@/lib/notify";
import { generateAndStoreCustomerInvoice } from "@/lib/invoice";

// ─── Midtrans helpers ────────────────────────────────────────────────────────

function midtransBaseUrl(): string {
  return process.env.MIDTRANS_IS_PRODUCTION === "true"
    ? "https://app.midtrans.com"
    : "https://app.sandbox.midtrans.com";
}

async function createSnapToken(
  orderId: string,
  grandTotal: number,
  createdAt: Date,
  paymentTimeoutMinutes: number,
  restaurantId: string,
  tableId: string
): Promise<{ snapToken: string; redirectUrl: string }> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) throw new Error("MIDTRANS_SERVER_KEY not configured");

  const menuUrl =
    process.env.NEXT_PUBLIC_MENU_APP_URL ?? "http://localhost:3001";
  const orderUrl = `${menuUrl}/${restaurantId}/${tableId}/order/${orderId}`;

  const body = {
    transaction_details: {
      order_id: orderId,
      gross_amount: grandTotal,
    },
    custom_expiry: {
      order_time: formatInTimeZone(
        createdAt,
        "Asia/Jakarta",
        "yyyy-MM-dd HH:mm:ss xx"
      ),
      expiry_duration: paymentTimeoutMinutes,
      unit: "minute",
    },
    callbacks: {
      finish: `${orderUrl}?status=finish`,
      error: `${orderUrl}?status=error`,
      pending: `${orderUrl}?status=pending`,
    },
  };

  const response = await fetch(`${midtransBaseUrl()}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:
        "Basic " +
        Buffer.from(`${serverKey}:`).toString("base64"),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Midtrans Snap error ${response.status}: ${err}`);
  }

  const data = (await response.json()) as { token: string; redirect_url: string };
  return { snapToken: data.token, redirectUrl: data.redirect_url };
}

// ─── Tax computation (ADR-013) ────────────────────────────────────────────────

function computeFinancials(
  subtotal: number,
  taxRate: number,
  serviceChargeRate: number,
  taxOnServiceCharge: boolean,
  pricesIncludeTax: boolean,
  roundingRule: string
): {
  subtotal: number;
  serviceChargeAmount: number;
  taxAmount: number;
  grandTotal: number;
} {
  let serviceChargeAmount = 0;
  let taxAmount = 0;
  let grandTotal = subtotal;

  if (pricesIncludeTax) {
    taxAmount = Math.round((subtotal * taxRate) / (1 + taxRate));
    grandTotal = subtotal;
  } else {
    serviceChargeAmount = Math.round(subtotal * serviceChargeRate);
    const taxBase = taxOnServiceCharge
      ? subtotal + serviceChargeAmount
      : subtotal;
    taxAmount = Math.round(taxBase * taxRate);
    grandTotal = subtotal + serviceChargeAmount + taxAmount;
  }

  // Apply rounding rule to grandTotal only
  if (roundingRule === "ROUND_50") {
    grandTotal = Math.round(grandTotal / 50) * 50;
  } else if (roundingRule === "ROUND_100") {
    grandTotal = Math.round(grandTotal / 100) * 100;
  }

  return { subtotal, serviceChargeAmount, taxAmount, grandTotal };
}

// ─── Queue number generation ──────────────────────────────────────────────────

async function generateQueueNumber(branchId: string): Promise<number> {
  // Get today's date in WIB (Asia/Jakarta)
  const todayWIB = formatInTimeZone(new Date(), "Asia/Jakarta", "yyyy-MM-dd");

  // Atomically increment the daily QueueCounter
  const counter = await prisma.queueCounter.upsert({
    where: { branchId_date: { branchId, date: todayWIB } },
    update: { lastNumber: { increment: 1 } },
    create: { branchId, date: todayWIB, lastNumber: 1 },
  });

  return counter.lastNumber;
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookieVal = cookieStore.get("fbqr_session_id")?.value;

    if (!sessionCookieVal) {
      return NextResponse.json({ error: "Session required" }, { status: 401 });
    }

    const body = await req.json();
    const {
      restaurantId,
      tableId,
      items,
      paymentMethod = "QRIS",
      idempotencyKey,
      customerNote,
    } = body as {
      restaurantId: string;
      tableId: string;
      items: CartEntry[];
      paymentMethod: string;
      idempotencyKey?: string;
      customerNote?: string;
    };

    if (!restaurantId || !tableId || !items?.length) {
      return NextResponse.json(
        { error: "restaurantId, tableId, and items are required" },
        { status: 400 }
      );
    }

    // ── Validate session ────────────────────────────────────────────────────
    const session = await prisma.customerSession.findFirst({
      where: {
        sessionCookie: sessionCookieVal,
        tableId,
        status: "ACTIVE",
      },
      select: { id: true, expiresAt: true, branchId: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    // ── Idempotency check ────────────────────────────────────────────────────
    if (idempotencyKey) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey },
        select: {
          id: true,
          grandTotal: true,
          status: true,
          payments: {
            select: { id: true, status: true },
            take: 1,
          },
        },
      });
      if (existing) {
        // Only return existing if it's less than 24h old (spec-compliant)
        const orderAge = await prisma.order.findUnique({
          where: { idempotencyKey },
          select: { createdAt: true },
        });
        if (
          orderAge &&
          new Date().getTime() - orderAge.createdAt.getTime() < 24 * 60 * 60 * 1000
        ) {
          return NextResponse.json({
            orderId: existing.id,
            grandTotal: existing.grandTotal,
            idempotent: true,
          });
        }
      }
    }

    // ── Fetch merchant settings ───────────────────────────────────────────────
    const settings = await prisma.merchantSettings.findUnique({
      where: { restaurantId },
      select: {
        paymentMode: true,
        paymentTimeoutMinutes: true,
        taxRate: true,
        serviceChargeRate: true,
        taxOnServiceCharge: true,
        pricesIncludeTax: true,
        roundingRule: true,
        maxOrderValueIDR: true,
        maxPendingOrders: true,
        orderingPaused: true,
      },
    });

    if (!settings) {
      return NextResponse.json(
        { error: "Merchant settings not found" },
        { status: 500 }
      );
    }

    if (settings.orderingPaused) {
      return NextResponse.json(
        { error: "Ordering is currently paused" },
        { status: 409 }
      );
    }

    // ── Pending order limit check ─────────────────────────────────────────────
    const pendingCount = await prisma.order.count({
      where: {
        customerSessionId: session.id,
        status: "PENDING",
      },
    });
    if (pendingCount >= settings.maxPendingOrders) {
      return NextResponse.json(
        {
          error: `Anda sudah memiliki ${settings.maxPendingOrders} pesanan yang menunggu pembayaran.`,
        },
        { status: 409 }
      );
    }

    // ── Compute subtotal from items ───────────────────────────────────────────
    const subtotal = items.reduce((sum, entry) => sum + entry.lineTotal, 0);

    if (subtotal <= 0) {
      return NextResponse.json(
        { error: "Cart is empty" },
        { status: 400 }
      );
    }

    // ── Verify item prices against DB (snapshot integrity) ──────────────────
    const itemIds = items.map((e) => e.itemId);
    const dbItems = await prisma.menuItem.findMany({
      where: { id: { in: itemIds }, deletedAt: null },
      select: { id: true, price: true, priceType: true, name: true },
    });
    const dbItemMap = new Map(dbItems.map((i) => [i.id, i]));

    for (const entry of items) {
      const dbItem = dbItemMap.get(entry.itemId);
      if (!dbItem) {
        return NextResponse.json(
          { error: `Item "${entry.itemId}" not found or deleted` },
          { status: 400 }
        );
      }
      if (dbItem.priceType === "BY_WEIGHT") {
        return NextResponse.json(
          {
            error: `Item "${dbItem.name}" adalah item timbang — tidak dapat ditambahkan ke keranjang reguler`,
          },
          { status: 400 }
        );
      }
    }

    // ── Compute financials ────────────────────────────────────────────────────
    const financials = computeFinancials(
      subtotal,
      Number(settings.taxRate),
      Number(settings.serviceChargeRate),
      settings.taxOnServiceCharge,
      settings.pricesIncludeTax,
      settings.roundingRule
    );

    if (financials.grandTotal > settings.maxOrderValueIDR) {
      return NextResponse.json(
        {
          error: `Total pesanan melebihi batas maksimum (Rp ${settings.maxOrderValueIDR.toLocaleString("id-ID")})`,
        },
        { status: 400 }
      );
    }

    // ── Fetch kitchen station + table orderType ───────────────────────────────
    const [restaurant, table] = await Promise.all([
      prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: {
          defaultStationId: true,
          stations: {
            select: { id: true },
            take: 1,
          },
        },
      }),
      prisma.table.findUnique({
        where: { id: tableId },
        select: { tableType: true, name: true },
      }),
    ]);
    const defaultStationId =
      restaurant?.defaultStationId ??
      restaurant?.stations?.[0]?.id ??
      "default";
    const orderType = table?.tableType ?? "DINE_IN";

    // ── Generate queue number ─────────────────────────────────────────────────
    const queueNumber = await generateQueueNumber(session.branchId);

    // ── Build OrderItems from cart entries ────────────────────────────────────
    const orderItemsData = items.map((entry) => {
      const basePrice = dbItemMap.get(entry.itemId)?.price ?? entry.lineTotal;
      // Build optional JSON fields only when present (exactOptionalPropertyTypes safe)
      const variantSnapshot = entry.variantId
        ? { id: entry.variantId, name: entry.variantName }
        : null;
      const addonSnapshot =
        entry.addons.length > 0
          ? entry.addons.map((a) => ({
              id: a.id,
              name: a.name,
              priceDelta: a.priceDelta,
              qty: a.qty,
            }))
          : null;
      return {
        menuItemId: entry.itemId,
        name: entry.itemName,
        unitPrice: basePrice,
        variantPriceDelta: entry.variantPriceDelta ?? 0,
        addonPriceTotal: entry.addons.reduce(
          (s, a) => s + a.priceDelta * a.qty,
          0
        ),
        lineTotal: entry.lineTotal,
        quantity: entry.qty,
        // Spread optional JSON fields only when present — avoids Prisma nullable JSON type issues
        ...(variantSnapshot ? { variantSnapshot } : {}),
        ...(addonSnapshot ? { addonSnapshot } : {}),
        ...(entry.specialRequest ? { specialRequest: entry.specialRequest } : {}),
        kitchenStationId: defaultStationId,
      };
    });

    // ── Map payment method to enum ────────────────────────────────────────────
    type PMethod = "QRIS" | "EWALLET" | "VA" | "CARD" | "CASH";
    const methodMap: Record<string, PMethod> = {
      QRIS: "QRIS",
      VA: "VA",
      CARD: "CARD",
      CASH: "CASH",
      EWALLET: "EWALLET",
    };
    const payMethod: PMethod = methodMap[paymentMethod] ?? "QRIS";

    // ── Create Order + Payment atomically ─────────────────────────────────────
    const isPayFirst = settings.paymentMode === "PAY_FIRST";
    const paymentStatus = isPayFirst ? "PENDING" : "PENDING_CASH";

    const order = await prisma.order.create({
      data: {
        branchId: session.branchId,
        customerSessionId: session.id,
        orderType,
        queueNumber,
        subtotal: financials.subtotal,
        taxAmount: financials.taxAmount,
        serviceChargeAmount: financials.serviceChargeAmount,
        grandTotal: financials.grandTotal,
        ...(idempotencyKey ? { idempotencyKey } : {}),
        ...(customerNote ? { customerNote } : {}),
        items: { create: orderItemsData },
        payments: {
          create: {
            amount: financials.grandTotal,
            method: payMethod,
            paymentType: "FULL",
            status: paymentStatus,
          },
        },
      },
      select: {
        id: true,
        grandTotal: true,
        createdAt: true,
      },
    });

    // ── AuditLog ──────────────────────────────────────────────────────────────
    await prisma.auditLog.create({
      data: {
        action: "CREATE",
        entity: "Order",
        entityId: order.id,
        actorType: "CUSTOMER",
        actorName: "Customer",
        restaurantId,
        newValue: {
          grandTotal: financials.grandTotal,
          itemCount: items.length,
          paymentMode: settings.paymentMode,
          paymentMethod: payMethod,
        },
      },
    });

    // ── PAY_AT_CASHIER — notify kitchen immediately, generate invoice, return ──
    if (!isPayFirst) {
      // Fire-and-forget push notification (kitchen needs to see this right away)
      sendInternalNotification({
        type: "NEW_ORDER",
        restaurantId,
        branchId: session.branchId,
        payload: {
          orderNumber: String(queueNumber),
          tableLabel: table?.name ?? tableId,
          grandTotal: financials.grandTotal,
        },
      }).catch(() => {
        // Non-fatal — notification failure never affects the order response
      });

      // PAY_AT_CASHIER orders are immediately confirmed — generate invoice async
      after(() => generateAndStoreCustomerInvoice(order.id));

      return NextResponse.json({
        orderId: order.id,
        grandTotal: financials.grandTotal,
        paymentMode: "PAY_AT_CASHIER",
      });
    }

    // ── PAY_FIRST — create Snap token ─────────────────────────────────────────
    const snap = await createSnapToken(
      order.id,
      financials.grandTotal,
      order.createdAt,
      settings.paymentTimeoutMinutes,
      restaurantId,
      tableId
    );

    return NextResponse.json({
      orderId: order.id,
      grandTotal: financials.grandTotal,
      snapToken: snap.snapToken,
      redirectUrl: snap.redirectUrl,
      paymentMode: "PAY_FIRST",
    });
  } catch (err) {
    console.error("[POST /api/order]", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
