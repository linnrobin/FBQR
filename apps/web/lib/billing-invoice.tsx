/**
 * Merchant billing invoice PDF generation helper for apps/web.
 *
 * generateAndStoreBillingInvoice(invoiceId):
 *   1. Fetch MerchantBillingInvoice + merchant data
 *   2. Render PDF via @react-pdf/renderer
 *   3. Upload to Supabase Storage — invoices/billing/{merchantId}/{invoiceNumber}.pdf
 *   4. Update MerchantBillingInvoice.pdfUrl with signed URL (24h)
 *
 * Called from:
 *   - app/api/cron/billing/route.ts (after() after creating invoice)
 */

import { prisma } from "@repo/database";
import { createClient } from "@supabase/supabase-js";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import {
  BillingInvoicePdf,
  type BillingInvoiceData,
} from "./pdf/billing-invoice";

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

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateAndStoreBillingInvoice(
  invoiceId: string
): Promise<void> {
  try {
    // 1. Fetch invoice + merchant data
    const invoice = await prisma.merchantBillingInvoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        invoiceNumber: true,
        merchantId: true,
        periodStart: true,
        periodEnd: true,
        amount: true,
        tax: true,
        total: true,
        status: true,
        dueAt: true,
        paidAt: true,
        pdfUrl: true,
        currency: true,
        createdAt: true,
        subscription: {
          select: {
            plan: { select: { name: true } },
          },
        },
        // Join merchant via merchantId
      },
    });

    if (!invoice) {
      console.error(`[billing-invoice] Invoice not found: ${invoiceId}`);
      return;
    }

    if (invoice.pdfUrl) {
      // Already generated — nothing to do
      return;
    }

    // Fetch merchant + restaurant name (Merchant.businessName doesn't exist; use Restaurant.name)
    const merchant = await prisma.merchant.findUnique({
      where: { id: invoice.merchantId },
      select: {
        email: true,
        taxId: true,
        restaurant: { select: { name: true } },
      },
    });

    if (!merchant) {
      console.error(`[billing-invoice] Merchant not found: ${invoice.merchantId}`);
      return;
    }

    // 2. Build PDF data
    const invoiceData: BillingInvoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.createdAt,
      dueDate: invoice.dueAt,
      merchantName: merchant.restaurant?.name ?? merchant.email,
      merchantEmail: merchant.email,
      merchantTaxId: merchant.taxId ?? null,
      planName: invoice.subscription.plan.name,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      amount: invoice.amount,
      tax: invoice.tax,
      total: invoice.total,
      status: invoice.status,
      paidAt: invoice.paidAt,
      currency: invoice.currency,
    };

    // 3. Render PDF to buffer
    const pdfBuffer = await renderToBuffer(
      React.createElement(BillingInvoicePdf, { data: invoiceData })
    );

    // 4. Upload to Supabase Storage
    const supabase = getSupabaseAdmin();
    const storagePath = `billing/${invoice.merchantId}/${invoice.invoiceNumber}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error(
        `[billing-invoice] Supabase upload failed for ${invoiceId}:`,
        uploadError.message
      );
      return;
    }

    // 5. Create signed URL (24h)
    const { data: signedData, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL);

    if (signError || !signedData?.signedUrl) {
      console.error(
        `[billing-invoice] Failed to create signed URL for ${invoiceId}:`,
        signError?.message
      );
      return;
    }

    // 6. Store URL in MerchantBillingInvoice row
    await prisma.merchantBillingInvoice.update({
      where: { id: invoiceId },
      data: { pdfUrl: signedData.signedUrl },
    });

    console.log(
      `[billing-invoice] Generated PDF for invoice ${invoice.invoiceNumber}`
    );
  } catch (err) {
    // Non-fatal — PDF generation failure never affects the billing flow
    console.error(
      `[billing-invoice] generateAndStoreBillingInvoice failed for ${invoiceId}:`,
      err
    );
  }
}
