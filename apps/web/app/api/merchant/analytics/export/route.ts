/**
 * Merchant analytics export — GET.
 * Route: GET /api/merchant/analytics/export
 *
 * Downloads an Excel (.xlsx) report of orders in the given date range.
 * Requires reports:read permission.
 *
 * Query params:
 *   from     — ISO date string (inclusive start)
 *   to       — ISO date string (inclusive end)
 *   branchId — optional branch UUID; omit for all branches
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";
import { getStaffSession, hasPermission, forbiddenResponse } from "@/lib/auth/rbac";
import { startOfDay, endOfDay, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import ExcelJS from "exceljs";

const WIB = "Asia/Jakarta";

function parseRange(fromStr: string, toStr: string) {
  const fromWib = startOfDay(toZonedTime(new Date(fromStr), WIB));
  const toWib = endOfDay(toZonedTime(new Date(toStr), WIB));
  return { from: fromWib, to: toWib };
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const staffSession = await getStaffSession(cookieStore);

  let restaurantId: string | null = null;

  if (staffSession) {
    if (!hasPermission(staffSession.permissions, "reports:read")) {
      return NextResponse.json(forbiddenResponse("reports:read"), { status: 403 });
    }
    restaurantId = staffSession.restaurantId;
  } else {
    const session = await requireMerchant();
    restaurantId = session.user.restaurantId;
  }

  if (!restaurantId) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  const { searchParams } = req.nextUrl;
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const branchIdParam = searchParams.get("branchId");

  if (!fromStr || !toStr) {
    return NextResponse.json(
      { error: "from and to query params are required" },
      { status: 400 }
    );
  }

  let dateFrom: Date, dateTo: Date;
  try {
    const range = parseRange(fromStr, toStr);
    dateFrom = range.from;
    dateTo = range.to;
  } catch {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  // Resolve branch IDs
  let branchIds: string[];
  if (branchIdParam) {
    const branch = await prisma.branch.findFirst({
      where: { id: branchIdParam, restaurantId },
      select: { id: true },
    });
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }
    branchIds = [branchIdParam];
  } else {
    const branches = await prisma.branch.findMany({
      where: { restaurantId },
      select: { id: true, name: true },
    });
    branchIds = branches.map((b) => b.id);
  }

  // Fetch orders with items and payments
  const orders = await prisma.order.findMany({
    where: {
      branchId: { in: branchIds },
      status: { in: ["CONFIRMED", "PREPARING", "READY", "COMPLETED"] },
      confirmedAt: { gte: dateFrom, lte: dateTo },
    },
    select: {
      id: true,
      orderType: true,
      status: true,
      subtotal: true,
      taxAmount: true,
      serviceChargeAmount: true,
      grandTotal: true,
      confirmedAt: true,
      branch: { select: { name: true } },
      items: {
        select: {
          name: true,
          quantity: true,
          unitPrice: true,
          variantPriceDelta: true,
          addonPriceTotal: true,
          lineTotal: true,
          specialRequest: true,
        },
      },
      payments: {
        where: { status: "SUCCESS" },
        select: { method: true, amount: true },
      },
      invoice: { select: { invoiceNumber: true } },
    },
    orderBy: { confirmedAt: "asc" },
    take: 5000, // safety cap
  });

  // Build Excel workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FBQR";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Laporan Pesanan");

  // Header row
  sheet.columns = [
    { header: "No. Invoice", key: "invoiceNumber", width: 22 },
    { header: "Tanggal", key: "date", width: 20 },
    { header: "Cabang", key: "branch", width: 20 },
    { header: "Tipe Pesanan", key: "orderType", width: 16 },
    { header: "Item", key: "itemName", width: 30 },
    { header: "Qty", key: "qty", width: 6 },
    { header: "Harga Satuan (IDR)", key: "unitPrice", width: 20 },
    { header: "Total Item (IDR)", key: "lineTotal", width: 18 },
    { header: "Subtotal Pesanan (IDR)", key: "subtotal", width: 22 },
    { header: "PPN (IDR)", key: "tax", width: 14 },
    { header: "Service Charge (IDR)", key: "serviceCharge", width: 20 },
    { header: "Grand Total (IDR)", key: "grandTotal", width: 18 },
    { header: "Metode Pembayaran", key: "paymentMethod", width: 20 },
    { header: "Diskon Diterapkan", key: "discount", width: 18 },
    { header: "Status", key: "status", width: 14 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEA580C" },
  };
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

  const ORDER_TYPE_LABELS: Record<string, string> = {
    DINE_IN: "Makan di Tempat",
    TAKEAWAY: "Bawa Pulang",
    DELIVERY: "Delivery",
  };
  const PAYMENT_METHOD_LABELS: Record<string, string> = {
    QRIS: "QRIS",
    EWALLET: "E-Wallet",
    VA: "Transfer Bank",
    CARD: "Kartu",
    CASH: "Tunai",
  };
  const STATUS_LABELS: Record<string, string> = {
    CONFIRMED: "Dikonfirmasi",
    PREPARING: "Diproses",
    READY: "Siap",
    COMPLETED: "Selesai",
  };

  for (const order of orders) {
    const dateStr = order.confirmedAt
      ? format(toZonedTime(order.confirmedAt, WIB), "d MMMM yyyy, HH:mm")
      : "-";
    const paymentMethod = order.payments
      .map((p) => PAYMENT_METHOD_LABELS[p.method] ?? p.method)
      .join(", ");
    // Discount = subtotal - sum of item line totals (if any)
    const itemsSum = order.items.reduce((s, i) => s + i.lineTotal, 0);
    const discount = Math.max(0, itemsSum - order.subtotal);

    order.items.forEach((item, idx) => {
      sheet.addRow({
        invoiceNumber: order.invoice?.invoiceNumber ?? order.id.slice(0, 8),
        date: idx === 0 ? dateStr : "",
        branch: idx === 0 ? order.branch.name : "",
        orderType: idx === 0 ? (ORDER_TYPE_LABELS[order.orderType] ?? order.orderType) : "",
        itemName: item.name + (item.specialRequest ? ` (${item.specialRequest})` : ""),
        qty: item.quantity,
        unitPrice: item.unitPrice + item.variantPriceDelta,
        lineTotal: item.lineTotal,
        subtotal: idx === 0 ? order.subtotal : "",
        tax: idx === 0 ? order.taxAmount : "",
        serviceCharge: idx === 0 ? order.serviceChargeAmount : "",
        grandTotal: idx === 0 ? order.grandTotal : "",
        paymentMethod: idx === 0 ? paymentMethod : "",
        discount: idx === 0 ? discount : "",
        status: idx === 0 ? (STATUS_LABELS[order.status] ?? order.status) : "",
      });
    });

    // Empty order (no items — shouldn't happen but safety)
    if (order.items.length === 0) {
      sheet.addRow({
        invoiceNumber: order.invoice?.invoiceNumber ?? order.id.slice(0, 8),
        date: dateStr,
        branch: order.branch.name,
        orderType: ORDER_TYPE_LABELS[order.orderType] ?? order.orderType,
        itemName: "-",
        qty: 0,
        unitPrice: 0,
        lineTotal: 0,
        subtotal: order.subtotal,
        tax: order.taxAmount,
        serviceCharge: order.serviceChargeAmount,
        grandTotal: order.grandTotal,
        paymentMethod,
        discount,
        status: STATUS_LABELS[order.status] ?? order.status,
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();

  const filename = `laporan-pesanan-${fromStr}-${toStr}.xlsx`;
  return new NextResponse(buffer as Buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
