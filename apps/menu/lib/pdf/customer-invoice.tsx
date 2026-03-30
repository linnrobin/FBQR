/**
 * Customer invoice PDF template — rendered server-side via @react-pdf/renderer.
 *
 * Used by: lib/invoice.ts → generateAndStoreCustomerInvoice()
 * Output:  invoices/orders/{orderId}.pdf in Supabase Storage
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

export interface CustomerInvoiceData {
  invoiceNumber: string;
  createdAt: Date;
  restaurantName: string;
  restaurantAddress: string | null;
  branchName: string;
  items: {
    name: string;
    variantName: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  serviceChargeAmount: number;
  taxAmount: number;
  grandTotal: number;
  paymentMethod: string;
  paymentStatus: string;
  midtransTransactionId: string | null;
  currency: string;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1c1917",
    paddingTop: 40,
    paddingBottom: 40,
    paddingLeft: 48,
    paddingRight: 48,
  },
  header: {
    marginBottom: 24,
    borderBottom: "1pt solid #e7e5e4",
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#1c1917",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#78716c",
  },
  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  metaLeft: {
    flex: 1,
  },
  metaRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  metaLabel: {
    fontSize: 8,
    color: "#78716c",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1c1917",
  },
  metaValueNormal: {
    fontSize: 10,
    color: "#1c1917",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f4",
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 0,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottom: "0.5pt solid #e7e5e4",
  },
  colItem: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1.5, textAlign: "right" },
  colTotal: { flex: 1.5, textAlign: "right" },
  colHeaderText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#78716c",
    textTransform: "uppercase",
  },
  colText: {
    fontSize: 10,
    color: "#1c1917",
  },
  colVariantText: {
    fontSize: 8,
    color: "#78716c",
    marginTop: 2,
  },
  totalsSection: {
    marginTop: 12,
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    width: 200,
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
    width: 200,
    justifyContent: "space-between",
    paddingVertical: 4,
    borderTop: "1pt solid #1c1917",
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1c1917",
  },
  grandTotalValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1c1917",
  },
  paymentSection: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#f5f5f4",
    borderRadius: 4,
  },
  paymentLabel: {
    fontSize: 8,
    color: "#78716c",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  paymentValue: {
    fontSize: 10,
    color: "#1c1917",
  },
  footer: {
    marginTop: 32,
    borderTop: "0.5pt solid #e7e5e4",
    paddingTop: 12,
    textAlign: "center",
  },
  footerText: {
    fontSize: 8,
    color: "#a8a29e",
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

const METHOD_LABELS: Record<string, string> = {
  QRIS: "QRIS",
  VA: "Virtual Account",
  CARD: "Kartu",
  CASH: "Tunai",
  EWALLET: "E-Wallet",
};

const STATUS_LABELS: Record<string, string> = {
  SUCCESS: "Lunas",
  PENDING_CASH: "Bayar di Kasir",
  PENDING: "Menunggu Pembayaran",
};

// ─── PDF Component ────────────────────────────────────────────────────────────

export function CustomerInvoicePdf({ data }: { data: CustomerInvoiceData }) {
  return (
    <Document
      title={`Invoice ${data.invoiceNumber}`}
      author={data.restaurantName}
    >
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>{data.restaurantName}</Text>
          {data.restaurantAddress && (
            <Text style={s.subtitle}>{data.restaurantAddress}</Text>
          )}
          <Text style={[s.subtitle, { marginTop: 2 }]}>{data.branchName}</Text>
        </View>

        {/* Invoice meta */}
        <View style={s.meta}>
          <View style={s.metaLeft}>
            <Text style={s.metaLabel}>No. Invoice</Text>
            <Text style={s.metaValue}>{data.invoiceNumber}</Text>
          </View>
          <View style={s.metaRight}>
            <Text style={s.metaLabel}>Tanggal</Text>
            <Text style={s.metaValueNormal}>{fmtDate(data.createdAt)}</Text>
          </View>
        </View>

        {/* Items table */}
        <View style={s.tableHeader}>
          <View style={s.colItem}>
            <Text style={s.colHeaderText}>Item</Text>
          </View>
          <View style={s.colQty}>
            <Text style={s.colHeaderText}>Qty</Text>
          </View>
          <View style={s.colPrice}>
            <Text style={s.colHeaderText}>Harga</Text>
          </View>
          <View style={s.colTotal}>
            <Text style={s.colHeaderText}>Subtotal</Text>
          </View>
        </View>

        {data.items.map((item, i) => (
          <View key={i} style={s.tableRow}>
            <View style={s.colItem}>
              <Text style={s.colText}>{item.name}</Text>
              {item.variantName && (
                <Text style={s.colVariantText}>{item.variantName}</Text>
              )}
            </View>
            <View style={s.colQty}>
              <Text style={s.colText}>{item.quantity}</Text>
            </View>
            <View style={s.colPrice}>
              <Text style={s.colText}>{fmtIDR(item.unitPrice)}</Text>
            </View>
            <View style={s.colTotal}>
              <Text style={s.colText}>{fmtIDR(item.lineTotal)}</Text>
            </View>
          </View>
        ))}

        {/* Totals */}
        <View style={s.totalsSection}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotal</Text>
            <Text style={s.totalValue}>{fmtIDR(data.subtotal)}</Text>
          </View>
          {data.serviceChargeAmount > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Biaya Layanan</Text>
              <Text style={s.totalValue}>
                {fmtIDR(data.serviceChargeAmount)}
              </Text>
            </View>
          )}
          {data.taxAmount > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Pajak (PPN)</Text>
              <Text style={s.totalValue}>{fmtIDR(data.taxAmount)}</Text>
            </View>
          )}
          <View style={s.grandTotalRow}>
            <Text style={s.grandTotalLabel}>Total</Text>
            <Text style={s.grandTotalValue}>{fmtIDR(data.grandTotal)}</Text>
          </View>
        </View>

        {/* Payment info */}
        <View style={s.paymentSection}>
          <Text style={s.paymentLabel}>Pembayaran</Text>
          <Text style={s.paymentValue}>
            {METHOD_LABELS[data.paymentMethod] ?? data.paymentMethod}
            {" · "}
            {STATUS_LABELS[data.paymentStatus] ?? data.paymentStatus}
          </Text>
          {data.midtransTransactionId && (
            <Text style={[s.paymentValue, { color: "#78716c", marginTop: 2 }]}>
              Ref: {data.midtransTransactionId}
            </Text>
          )}
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            Dokumen ini diterbitkan secara elektronik dan sah tanpa tanda
            tangan.
          </Text>
          <Text style={[s.footerText, { marginTop: 2 }]}>
            Terima kasih telah menggunakan layanan kami.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
