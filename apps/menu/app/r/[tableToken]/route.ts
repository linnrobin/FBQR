/**
 * QR redirect handler — validates the static tableToken, generates a 24h
 * HMAC-signed URL, and redirects the customer to the branded menu.
 *
 * Route:  GET /r/[tableToken]
 * Static QR codes always point here. This route owns signing.
 * See docs/customer.md § 1. QR Code Scanning + ADR-015.
 */
import { NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { buildSignedMenuUrl } from "@/lib/qr-auth";

// ─── HTML Error Helpers ───────────────────────────────────────────────────────

function htmlError(title: string, body: string, showReloadBtn = false): Response {
  const btn = showReloadBtn
    ? `<a href="javascript:location.reload()" style="display:inline-block;margin-top:20px;padding:10px 24px;background:#E8622A;color:#fff;border-radius:8px;text-decoration:none;font-size:14px">Muat Ulang QR</a>`
    : "";
  const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;background:#FAFAF9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}.card{background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);padding:40px 32px;max-width:360px;width:100%;text-align:center}h2{font-size:20px;font-weight:700;color:#1C1917;margin-bottom:12px}p{font-size:14px;color:#78716C;line-height:1.6}</style></head><body><div class="card"><h2>${title}</h2><p>${body}</p>${btn}</div></body></html>`;
  return new Response(html, {
    status: 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tableToken: string }> }
) {
  const { tableToken } = await params;

  // 1. Lookup table by qrToken
  const table = await prisma.table.findUnique({
    where: { qrToken: tableToken },
    select: {
      id: true,
      status: true,
      name: true,
      branchId: true,
      branch: {
        select: {
          id: true,
          restaurantId: true,
          restaurant: {
            select: {
              id: true,
              merchant: { select: { status: true } },
              settings: { select: { enableDirtyState: true } },
            },
          },
        },
      },
    },
  });

  if (!table) {
    return htmlError(
      "QR Code Tidak Valid",
      "QR code ini tidak valid atau sudah tidak berlaku. Minta staff untuk membantu."
    );
  }

  const { restaurant } = table.branch;
  const merchantStatus = restaurant.merchant.status;
  const enableDirtyState = restaurant.settings?.enableDirtyState ?? false;

  // 2. Merchant/restaurant blocked?
  if (merchantStatus === "SUSPENDED" || merchantStatus === "CANCELLED") {
    return htmlError(
      "Restoran Sementara Tidak Tersedia",
      "Kami sedang melakukan perbaikan. Silakan kembali lagi nanti."
    );
  }

  // 3. Table status checks
  if (table.status === "CLOSED") {
    return htmlError(
      "Meja Tidak Tersedia",
      "Meja ini sementara tidak tersedia. Silakan tanya staff."
    );
  }
  if (table.status === "RESERVED") {
    return htmlError(
      "Meja Direservasi",
      "Meja ini sudah direservasi. Silakan tanya staff untuk meja yang tersedia."
    );
  }
  if (table.status === "DIRTY" && enableDirtyState) {
    return htmlError(
      "Meja Sedang Disiapkan",
      "Meja ini sedang dibersihkan. Silakan tanya staff."
    );
  }

  // 4. All clear — build signed URL and redirect
  const signedUrl = buildSignedMenuUrl(
    restaurant.id,
    table.id,
    tableToken
  );

  return NextResponse.redirect(signedUrl, { status: 302 });
}
