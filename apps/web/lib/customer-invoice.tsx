/**
 * Customer invoice PDF generation helper for apps/web.
 *
 * generateAndStoreCustomerInvoice(orderId):
 *   Used for waiter-assisted orders created via apps/web.
 *   Same logic as apps/menu/lib/invoice.ts.
 */

import { prisma } from "@repo/database";
import { createClient } from "@supabase/supabase-js";
import { renderToBuffer } from "@react-pdf/renderer";
import { formatInTimeZone } from "date-fns-tz";
import React from "react";
import {
  CustomerInvoicePdf,
  type CustomerInvoiceData,
} from "./pdf/customer-invoice";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars not configured");
  return createClient(url, key);
}

const BUCKET = "invoices";
const SIGNED_URL_TTL = 60 * 60 * 24;

export async function generateAndStoreCustomerInvoice(
  orderId: string
): Promise<void> {
  try {
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
              },
            },
          },
        },
      },
    });

    if (!order) {
      console.error(`[web/invoice] Order not found: ${orderId}`);
      return;
    }

    const existing = await prisma.invoice.findUnique({
      where: { orderId },
      select: { pdfUrl: true, invoiceNumber: true },
    });
    if (existing?.pdfUrl) return;

    const branch = order.branch;
    const wibDate = formatInTimeZone(order.createdAt, "Asia/Jakarta", "yyyyMMdd");

    let invoiceNumber: string;
    if (existing?.invoiceNumber) {
      invoiceNumber = existing.invoiceNumber;
    } else {
      const prefix = `INV-${branch.branchCode}-${wibDate}-`;
      const count = await prisma.invoice.count({
        where: { invoiceNumber: { startsWith: prefix } },
      });
      invoiceNumber = `${prefix}${String(count + 1).padStart(4, "0")}`;
      await prisma.invoice.upsert({
        where: { orderId },
        update: {},
        create: { orderId, invoiceNumber },
      });
    }

    const primaryPayment =
      order.payments.find((p) => p.paymentType === "FULL") ?? order.payments[0];

    const invoiceData: CustomerInvoiceData = {
      invoiceNumber,
      createdAt: order.createdAt,
      restaurantName: branch.restaurant.name,
      restaurantAddress: branch.restaurant.address ?? null,
      branchName: branch.name,
      items: order.items.map((item) => {
        const snapshot = item.variantSnapshot as { id: string; name: string } | null;
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
      paymentStatus: primaryPayment?.status ?? "PENDING_CASH",
      midtransTransactionId: primaryPayment?.midtransTransactionId ?? null,
      currency: order.currency,
    };

    const pdfBuffer = await renderToBuffer(
      React.createElement(CustomerInvoicePdf, { data: invoiceData })
    );

    const supabase = getSupabaseAdmin();
    const storagePath = `orders/${orderId}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      console.error(`[web/invoice] Upload failed: ${uploadError.message}`);
      return;
    }

    const { data: signedData, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL);

    if (signError || !signedData?.signedUrl) {
      console.error(`[web/invoice] Signed URL failed: ${signError?.message}`);
      return;
    }

    await prisma.invoice.update({
      where: { orderId },
      data: { pdfUrl: signedData.signedUrl },
    });

    console.log(`[web/invoice] Generated invoice ${invoiceNumber} for order ${orderId}`);
  } catch (err) {
    console.error(`[web/invoice] generateAndStoreCustomerInvoice failed for ${orderId}:`, err);
  }
}
