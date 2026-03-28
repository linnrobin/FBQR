/**
 * POST /api/kitchen/print
 *
 * Triggers a print job (kitchen ticket or customer receipt) for an order.
 * Reads printer config from MerchantSettings.printerConfig.
 * Fails gracefully — never affects order/payment state.
 *
 * Requires kitchen:manage permission or merchant owner session.
 *
 * Body:
 *   { type: "KITCHEN_TICKET" | "RECEIPT", orderId: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { getStaffSession, hasPermission } from "@/lib/auth/rbac";
import { requireMerchant } from "@/lib/auth/session";
import { cookies } from "next/headers";
import {
  printKitchenTicket,
  printCustomerReceipt,
  type KitchenTicketData,
  type ReceiptData,
} from "@/lib/printer";

export async function POST(req: NextRequest) {
  try {
    // Auth
    const cookieStore = await cookies();
    let restaurantId: string | null = null;

    const staffCookie = cookieStore.get("fbqr_staff_session");
    if (staffCookie) {
      const staffSession = await getStaffSession(cookieStore);
      if (!staffSession) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (!hasPermission(staffSession.permissions, "kitchen:manage")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const staff = await prisma.staff.findUnique({
        where: { id: staffSession.staffId },
        select: { restaurantId: true },
      });
      restaurantId = staff?.restaurantId ?? null;
    } else {
      try {
        const session = await requireMerchant();
        const merchant = await prisma.merchant.findUnique({
          where: { id: session.user.merchantId! },
          select: { restaurant: { select: { id: true } } },
        });
        restaurantId = merchant?.restaurant?.id ?? null;
      } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const { type, orderId } = body as { type?: string; orderId?: string };

    if (!type || !orderId) {
      return NextResponse.json(
        { error: "type and orderId required" },
        { status: 400 }
      );
    }

    // Fetch order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        queueNumber: true,
        orderType: true,
        customerNote: true,
        createdAt: true,
        subtotal: true,
        taxAmount: true,
        serviceChargeAmount: true,
        grandTotal: true,
        table: { select: { name: true } },
        branch: {
          select: {
            restaurantId: true,
            name: true,
            branchCode: true,
            restaurant: {
              select: { name: true, address: true },
            },
          },
        },
        items: {
          select: {
            name: true,
            quantity: true,
            lineTotal: true,
            specialRequest: true,
            variantSnapshot: true,
            addonSnapshot: true,
          },
        },
        payments: {
          select: { method: true, paymentType: true, status: true },
          orderBy: { createdAt: "asc" },
        },
        invoice: { select: { invoiceNumber: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.branch.restaurantId !== restaurantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch printer config from MerchantSettings
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId! },
      select: {
        settings: {
          select: {
            printerConfig: true,
            autoPrintKitchenTicket: true,
            autoPrintReceipt: true,
          },
        },
      },
    });

    const settings = restaurant?.settings;
    const printerConfig = settings?.printerConfig as {
      type: "USB" | "NETWORK" | "BLUETOOTH";
      address: string;
      paperWidth: 58 | 80;
    } | null;

    if (!printerConfig) {
      return NextResponse.json(
        { ok: false, error: "Printer not configured" },
        { status: 200 }
      );
    }

    let result: { ok: boolean; error?: string };

    if (type === "KITCHEN_TICKET") {
      const ticketData: KitchenTicketData = {
        queueNumber: order.queueNumber,
        orderType: order.orderType,
        tableName: order.table?.name ?? null,
        customerNote: order.customerNote,
        createdAt: order.createdAt,
        items: order.items.map((item) => {
          const variant = item.variantSnapshot as { name: string } | null;
          const addons = item.addonSnapshot as
            | { name: string; quantity: number }[]
            | null;
          return {
            name: item.name,
            quantity: item.quantity,
            variantName: variant?.name ?? null,
            addons: addons ?? undefined,
            specialRequest: item.specialRequest ?? null,
          };
        }),
      };
      result = await printKitchenTicket(printerConfig, ticketData);
    } else if (type === "RECEIPT") {
      const primaryPayment =
        order.payments.find((p) => p.paymentType === "FULL") ??
        order.payments[0];
      const receiptData: ReceiptData = {
        invoiceNumber:
          order.invoice?.invoiceNumber ??
          `INV-${order.branch.branchCode}-${Date.now()}`,
        restaurantName: order.branch.restaurant.name,
        restaurantAddress: order.branch.restaurant.address ?? null,
        branchName: order.branch.name,
        items: order.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
        })),
        subtotal: order.subtotal,
        serviceChargeAmount: order.serviceChargeAmount,
        taxAmount: order.taxAmount,
        grandTotal: order.grandTotal,
        paymentMethod: primaryPayment?.method ?? "CASH",
        createdAt: order.createdAt,
      };
      result = await printCustomerReceipt(printerConfig, receiptData);
    } else {
      return NextResponse.json(
        { error: "type must be KITCHEN_TICKET or RECEIPT" },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/kitchen/print]", err);
    return NextResponse.json({ error: "Terjadi kesalahan." }, { status: 500 });
  }
}
