/**
 * Invoice generation helpers for apps/menu.
 *
 * generateAndStoreCustomerInvoice(orderId):
 *   1. Fetch order + items + payments + branch + restaurant
 *   2. Generate invoice number: INV-{branchCode}-{YYYYMMDD}-{sequence:04d}
 *   3. Render PDF via @react-pdf/renderer
 *   4. Upload to Supabase Storage — invoices/orders/{orderId}.pdf
 *   5. Create or update Invoice row with signed URL (24h)
 *
 * Called from:
 *   - app/api/webhook/midtrans/route.ts (after() on payment success)
 *   - app/api/order/route.ts (after() for PAY_AT_CASHIER orders)
 */

import { prisma } from "@repo/database";
import { createClient } from "@supabase/supabase-js";
import { renderToBuffer } from "@react-pdf/renderer";
import { formatInTimeZone } from "date-fns-tz";
import {
  CustomerInvoicePdf,
  type CustomerInvoiceData,
} from "./pdf/customer-invoice";

// ─── Supabase admin client ────────────────────────────────────────────────────

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase env vars not configured");
  }
  return createClient(url, key);
}

const BUCKET = "invoices";
const SIGNED_URL_TTL = 60 * 60 * 24; // 24 hours in seconds

// ─── Invoice number generation ────────────────────────────────────────────────

/**
 * Generates the next invoice number for a branch on a given date (WIB).
 * Format: INV-{branchCode}-{YYYYMMDD}-{sequence:04d}
 * Sequence resets daily per branch.
 *
 * Protected by Invoice.invoiceNumber @unique — on collision (rare race),
 * the caller should retry with incrementing sequence.
 */
async function getNextInvoiceNumber(
  branchCode: string,
  wibDate: string
): Promise<string> {
  const prefix = `INV-${branchCode}-${wibDate}-`;
  const count = await prisma.invoice.count({
    where: { invoiceNumber: { startsWith: prefix } },
  });
  const seq = String(count + 1).padStart(4, "0");
  return `${prefix}${seq}`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateAndStoreCustomerInvoice(
  orderId: string
): Promise<void> {
  try {
    // 1. Fetch order data
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        subtotal: true,
        taxAmount: true,
        serviceChargeAmount: true,
        grandTotal: true,
        currency: true,
        createdAt: true,
        customerNote: true,
        items: {
          select: {
            name: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
            variantSnapshot: true,
          },
        },
        payments: {
          select: {
            method: true,
            paymentType: true,
            status: true,
            midtransTransactionId: true,
          },
          orderBy: { createdAt: "asc" },
        },
        branch: {
          select: {
            id: true,
            name: true,
            branchCode: true,
            restaurant: {
              select: {
                name: true,
                address: true,
                branding: { select: { logoUrl: true } },
              },
            },
          },
        },
      },
    });

    if (!order) {
      console.error(`[invoice] Order not found: ${orderId}`);
      return;
    }

    const branch = order.branch;
    const restaurant = branch.restaurant;

    // 2. Generate invoice number
    const wibDate = formatInTimeZone(
      order.createdAt,
      "Asia/Jakarta",
      "yyyyMMdd"
    );

    let invoiceNumber: string;
    let attempt = 0;
    // Retry up to 5 times on unique constraint collision
    while (true) {
      const prefix = `INV-${branch.branchCode}-${wibDate}-`;
      const count = await prisma.invoice.count({
        where: { invoiceNumber: { startsWith: prefix } },
      });
      const seq = String(count + 1 + attempt).padStart(4, "0");
      invoiceNumber = `${prefix}${seq}`;

      // Check if this invoice already has a number (was already created by the stub)
      const existing = await prisma.invoice.findUnique({
        where: { orderId },
        select: { id: true, invoiceNumber: true, pdfUrl: true },
      });

      if (existing?.pdfUrl) {
        // Already generated — nothing to do
        return;
      }

      if (existing?.invoiceNumber) {
        // Invoice already has a number (from stub) — keep it, just generate PDF
        invoiceNumber = existing.invoiceNumber;
        break;
      }

      // Try to create/update with this invoice number
      try {
        await prisma.invoice.upsert({
          where: { orderId },
          update: {}, // Don't overwrite if already exists with number
          create: { orderId, invoiceNumber },
        });
        break;
      } catch (err) {
        attempt++;
        if (attempt >= 5) {
          console.error(`[invoice] Failed to assign invoice number after 5 attempts`, err);
          return;
        }
      }
    }

    // 3. Build PDF data
    const primaryPayment =
      order.payments.find((p) => p.paymentType === "FULL") ??
      order.payments[0];

    const invoiceData: CustomerInvoiceData = {
      invoiceNumber,
      createdAt: order.createdAt,
      restaurantName: restaurant.name,
      restaurantAddress: restaurant.address ?? null,
      branchName: branch.name,
      items: order.items.map((item) => {
        const snapshot = item.variantSnapshot as
          | { id: string; name: string }
          | null;
        return {
          name: item.name,
          variantName: snapshot?.name ?? null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        };
      }),
      subtotal: order.subtotal,
      serviceChargeAmount: order.serviceChargeAmount,
      taxAmount: order.taxAmount,
      grandTotal: order.grandTotal,
      paymentMethod: primaryPayment?.method ?? "CASH",
      paymentStatus: primaryPayment?.status ?? "PENDING",
      midtransTransactionId: primaryPayment?.midtransTransactionId ?? null,
      currency: order.currency,
    };

    // 4. Render PDF to buffer
    const pdfBuffer = await renderToBuffer(
      <CustomerInvoicePdf data={invoiceData} />
    );

    // 5. Upload to Supabase Storage
    const supabase = getSupabaseAdmin();
    const storagePath = `orders/${orderId}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error(`[invoice] Supabase upload failed for ${orderId}:`, uploadError.message);
      return;
    }

    // 6. Create signed URL (24h)
    const { data: signedData, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL);

    if (signError || !signedData?.signedUrl) {
      console.error(`[invoice] Failed to create signed URL for ${orderId}:`, signError?.message);
      return;
    }

    // 7. Store URL in Invoice row
    await prisma.invoice.update({
      where: { orderId },
      data: { pdfUrl: signedData.signedUrl },
    });

    console.log(`[invoice] Generated invoice ${invoiceNumber} for order ${orderId}`);
  } catch (err) {
    // Non-fatal — invoice generation failure never affects the order
    console.error(`[invoice] generateAndStoreCustomerInvoice failed for ${orderId}:`, err);
  }
}
