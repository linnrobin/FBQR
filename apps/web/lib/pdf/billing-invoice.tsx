/**
 * Merchant billing invoice PDF template — rendered server-side via @react-pdf/renderer.
 *
 * Used by: lib/billing-invoice.ts → generateAndStoreBillingInvoice()
 * Output:  invoices/billing/{merchantId}/{invoiceNumber}.pdf in Supabase Storage
 *
 * Spec: docs/platform-owner.md § MerchantBillingInvoice PDF
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import React from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BillingInvoiceData {
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  merchantName: string;
  merchantEmail: string;
  merchantTaxId: string | null;
  planName: string;
  periodStart: Date;
  periodEnd: Date;
  amount: number;
  tax: number;
  total: number;
  status: string;
  paidAt: Date | null;
  currency: string;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1c1917",
    paddingTop: 48,
    paddingBottom: 48,
    paddingLeft: 56,
    paddingRight: 56,
  },
  brand: {
    marginBottom: 28,
  },
  brandName: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#0c0a09",
    marginBottom: 2,
  },
  brandTagline: {
    fontSize: 9,
    color: "#a8a29e",
  },
  divider: {
    borderBottom: "1pt solid #e7e5e4",
    marginBottom: 20,
  },
  invoiceTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#1c1917",
    marginBottom: 16,
  },
  metaGrid: {
    flexDirection: "row",
    marginBottom: 24,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 8,
    color: "#78716c",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 10,
    color: "#1c1917",
  },
  metaValueBold: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1c1917",
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#78716c",
    textTransform: "uppercase",
    marginBottom: 8,
    borderBottom: "0.5pt solid #e7e5e4",
    paddingBottom: 4,
  },
  lineItem: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottom: "0.5pt solid #f5f5f4",
  },
  lineItemDesc: {
    flex: 3,
  },
  lineItemAmt: {
    flex: 1,
    textAlign: "right",
  },
  lineItemText: {
    fontSize: 10,
    color: "#1c1917",
  },
  lineItemSubtext: {
    fontSize: 8,
    color: "#78716c",
    marginTop: 2,
  },
  totalsSection: {
    marginTop: 16,
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    width: 220,
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalLabel: {
    fontSize: 10,
    color: "#78716c",
  },
  totalValue: {
    fontSize: 10,
    color: "#1c1917",
  },
  grandTotalRow: {
    flexDirection: "row",
    width: 220,
    justifyContent: "space-between",
    paddingVertical: 5,
    borderTop: "1.5pt solid #1c1917",
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1c1917",
  },
  grandTotalValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1c1917",
  },
  statusBadge: {
    marginTop: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#f0fdf4",
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  statusBadgePending: {
    backgroundColor: "#fefce8",
  },
  statusBadgeOverdue: {
    backgroundColor: "#fef2f2",
  },
  statusText: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#166534",
  },
  statusTextPending: {
    color: "#854d0e",
  },
  statusTextOverdue: {
    color: "#991b1b",
  },
  footer: {
    marginTop: "auto",
    borderTop: "0.5pt solid #e7e5e4",
    paddingTop: 14,
  },
  footerText: {
    fontSize: 8,
    color: "#a8a29e",
    textAlign: "center",
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtIDR(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function fmtPeriod(start: Date, end: Date): string {
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}

// ─── PDF Component ────────────────────────────────────────────────────────────

export function BillingInvoicePdf({ data }: { data: BillingInvoiceData }) {
  const isPaid = data.status === "PAID";
  const isOverdue = data.status === "OVERDUE";

  return (
    <Document
      title={`FBQR Invoice ${data.invoiceNumber}`}
      author="FBQR Platform"
    >
      <Page size="A4" style={s.page}>
        {/* Brand header */}
        <View style={s.brand}>
          <Text style={s.brandName}>FBQR</Text>
          <Text style={s.brandTagline}>Platform Invoice</Text>
        </View>

        <View style={s.divider} />

        <Text style={s.invoiceTitle}>Invoice</Text>

        {/* Invoice meta grid */}
        <View style={s.metaGrid}>
          <View style={s.metaCol}>
            <Text style={s.metaLabel}>No. Invoice</Text>
            <Text style={s.metaValueBold}>{data.invoiceNumber}</Text>
          </View>
          <View style={s.metaCol}>
            <Text style={s.metaLabel}>Tanggal Terbit</Text>
            <Text style={s.metaValue}>{fmtDate(data.issueDate)}</Text>
          </View>
          <View style={s.metaCol}>
            <Text style={s.metaLabel}>Jatuh Tempo</Text>
            <Text style={s.metaValue}>{fmtDate(data.dueDate)}</Text>
          </View>
        </View>

        {/* Billed to */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Ditagihkan Kepada</Text>
          <Text style={s.metaValueBold}>{data.merchantName}</Text>
          <Text style={s.metaValue}>{data.merchantEmail}</Text>
          {data.merchantTaxId && (
            <Text style={s.metaValue}>NPWP: {data.merchantTaxId}</Text>
          )}
        </View>

        {/* Line items */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Rincian</Text>
          <View style={s.lineItem}>
            <View style={s.lineItemDesc}>
              <Text style={s.lineItemText}>
                Langganan FBQR {data.planName}
              </Text>
              <Text style={s.lineItemSubtext}>
                Periode: {fmtPeriod(data.periodStart, data.periodEnd)}
              </Text>
            </View>
            <View style={s.lineItemAmt}>
              <Text style={s.lineItemText}>{fmtIDR(data.amount)}</Text>
            </View>
          </View>
        </View>

        {/* Totals */}
        <View style={s.totalsSection}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotal</Text>
            <Text style={s.totalValue}>{fmtIDR(data.amount)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>PPN (11%)</Text>
            <Text style={s.totalValue}>{fmtIDR(data.tax)}</Text>
          </View>
          <View style={s.grandTotalRow}>
            <Text style={s.grandTotalLabel}>Total</Text>
            <Text style={s.grandTotalValue}>{fmtIDR(data.total)}</Text>
          </View>
        </View>

        {/* Payment status badge */}
        <View
          style={[
            s.statusBadge,
            isOverdue ? s.statusBadgeOverdue : !isPaid ? s.statusBadgePending : {},
          ]}
        >
          <Text
            style={[
              s.statusText,
              isOverdue
                ? s.statusTextOverdue
                : !isPaid
                ? s.statusTextPending
                : {},
            ]}
          >
            {isPaid
              ? `✓ Lunas pada ${fmtDate(data.paidAt!)}`
              : isOverdue
              ? "Melewati Jatuh Tempo"
              : "Menunggu Pembayaran"}
          </Text>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            Dokumen ini diterbitkan secara elektronik oleh FBQR Platform.
          </Text>
          <Text style={[s.footerText, { marginTop: 2 }]}>
            Hubungi support@fbqr.app untuk pertanyaan terkait tagihan ini.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
