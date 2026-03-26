/**
 * QR code generation API.
 * Route: GET /api/merchant/tables/[tableId]/qr
 *
 * Returns the QR code as a base64 data URL (PNG).
 * The QR encodes: {MENU_APP_URL}/r/{qrToken}
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";
import QRCode from "qrcode";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const { tableId } = await params;
  const table = await prisma.table.findFirst({
    where: { id: tableId, branch: { restaurantId } },
    select: { id: true, name: true, qrToken: true },
  });
  if (!table) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  const menuAppUrl =
    process.env.NEXT_PUBLIC_MENU_APP_URL ?? "https://menu.fbqr.app";
  const qrUrl = `${menuAppUrl}/r/${table.qrToken}`;

  const dataUrl = await QRCode.toDataURL(qrUrl, {
    width: 480,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#1C1917", light: "#FFFFFF" },
  });

  return NextResponse.json({
    qrDataUrl: dataUrl,
    qrUrl,
    tableName: table.name,
  });
}
