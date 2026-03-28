"use client";

/**
 * OrderStatusDisplay — items list, payment summary, and READY banner.
 *
 * Does not manage any async state — all data is passed as props.
 * Renders:
 *   - Items ordered (with BY_WEIGHT badge)
 *   - Payment summary (grand total, method, status badge)
 *   - READY banner (pulse, when status = READY)
 *   - Invoice download link (when CONFIRMED or beyond)
 *   - Customer note (if set)
 */

import { Download, Scale } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrderItemSummary {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  variantPriceDelta: number;
  addonPriceTotal: number;
  lineTotal: number;
  variantSnapshot: { id: string; name: string } | null;
  addonSnapshot: { id: string; name: string; priceDelta: number; qty: number }[] | null;
  specialRequest: string | null;
  needsWeighing: boolean;
  weightValue: number | null;
}

export interface PaymentSummary {
  id: string;
  amount: number;
  method: string;
  paymentType: string;
  status: string;
  provider: string | null;
  midtransTransactionId: string | null;
}

type OrderStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED" | "EXPIRED";

interface OrderStatusDisplayProps {
  status: OrderStatus;
  subtotal: number;
  taxAmount: number;
  serviceChargeAmount: number;
  grandTotal: number;
  items: OrderItemSummary[];
  payments: PaymentSummary[];
  invoice: { id: string; pdfUrl: string | null } | null;
  customerNote: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

const METHOD_LABELS: Record<string, string> = {
  QRIS: "QRIS",
  VA: "Virtual Account",
  CARD: "Kartu",
  CASH: "Tunai",
  EWALLET: "E-Wallet",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  SUCCESS: "bg-green-100 text-green-700",
  PENDING: "bg-amber-100 text-amber-700",
  PENDING_CASH: "bg-amber-100 text-amber-700",
  FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-stone-100 text-stone-600",
  EXPIRED: "bg-stone-100 text-stone-600",
  REFUNDED: "bg-blue-100 text-blue-700",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  SUCCESS: "Lunas",
  PENDING: "Menunggu Pembayaran",
  PENDING_CASH: "Bayar di Kasir",
  FAILED: "Gagal",
  CANCELLED: "Dibatalkan",
  EXPIRED: "Kedaluwarsa",
  REFUNDED: "Dikembalikan",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ItemRow({ item }: { item: OrderItemSummary }) {
  const variantText = item.variantSnapshot
    ? (item.variantSnapshot as { name: string }).name
    : null;
  const addonText =
    item.addonSnapshot && (item.addonSnapshot as { name: string }[]).length > 0
      ? (item.addonSnapshot as { name: string }[]).map((a) => a.name).join(", ")
      : null;

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-stone-100 last:border-0">
      <div className="h-8 w-8 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-stone-600">
        {item.quantity}×
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-stone-900">{item.name}</span>
          {item.needsWeighing && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
              <Scale className="h-3 w-3" />
              Timbang
              {item.weightValue != null
                ? ` (${Number(item.weightValue).toFixed(2)} kg)`
                : " — menunggu"}
            </span>
          )}
        </div>
        {variantText && (
          <p className="text-xs text-stone-500 mt-0.5">{variantText}</p>
        )}
        {addonText && (
          <p className="text-xs text-stone-500 mt-0.5">+ {addonText}</p>
        )}
        {item.specialRequest && (
          <p className="text-xs text-stone-400 italic mt-0.5">
            &ldquo;{item.specialRequest}&rdquo;
          </p>
        )}
      </div>
      <span className="text-sm font-semibold text-stone-800 flex-shrink-0">
        {fmt(item.lineTotal)}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OrderStatusDisplay({
  status,
  subtotal,
  taxAmount,
  serviceChargeAmount,
  grandTotal,
  items,
  payments,
  invoice,
  customerNote,
}: OrderStatusDisplayProps) {
  const primaryPayment = payments.find((p) => p.paymentType === "FULL") ?? payments[0];
  const isConfirmed = ["CONFIRMED", "PREPARING", "READY", "COMPLETED"].includes(status);

  return (
    <div className="space-y-4">
      {/* READY banner */}
      {status === "READY" && (
        <div className="bg-green-100 border border-green-300 rounded-xl px-4 py-4 animate-pulse">
          <p className="text-base font-bold text-green-800">🎉 Pesanan Siap!</p>
          <p className="text-sm text-green-700 mt-1">
            Pelayan akan segera mengantarkan pesanan Anda.
          </p>
        </div>
      )}

      {/* Items ordered */}
      <div className="bg-white rounded-xl border border-stone-100 px-4 py-1">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide py-2 border-b border-stone-100">
          Pesanan
        </p>
        {items.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
        {customerNote && (
          <div className="py-2 border-t border-stone-100 mt-1">
            <p className="text-xs text-stone-500">
              <span className="font-medium">Catatan:</span> {customerNote}
            </p>
          </div>
        )}
      </div>

      {/* Payment summary */}
      <div className="bg-white rounded-xl border border-stone-100 px-4 py-3">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">
          Ringkasan Pembayaran
        </p>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-stone-600">
            <span>Subtotal</span>
            <span>{fmt(subtotal)}</span>
          </div>
          {serviceChargeAmount > 0 && (
            <div className="flex justify-between text-stone-600">
              <span>Biaya layanan</span>
              <span>{fmt(serviceChargeAmount)}</span>
            </div>
          )}
          {taxAmount > 0 && (
            <div className="flex justify-between text-stone-600">
              <span>Pajak</span>
              <span>{fmt(taxAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-stone-900 text-base border-t border-stone-100 pt-2 mt-1">
            <span>Total</span>
            <span className="text-[--color-primary]">{fmt(grandTotal)}</span>
          </div>
        </div>

        {primaryPayment && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
            <span className="text-xs text-stone-500">
              {METHOD_LABELS[primaryPayment.method] ?? primaryPayment.method}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                PAYMENT_STATUS_COLORS[primaryPayment.status] ?? "bg-stone-100 text-stone-600"
              }`}
            >
              {PAYMENT_STATUS_LABELS[primaryPayment.status] ?? primaryPayment.status}
            </span>
          </div>
        )}
      </div>

      {/* Invoice download */}
      {isConfirmed && invoice && (
        <div className="bg-white rounded-xl border border-stone-100 px-4 py-3">
          {invoice.pdfUrl ? (
            <a
              href={invoice.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-[--color-primary] hover:opacity-80"
            >
              <Download className="h-4 w-4" />
              Unduh Invoice PDF
            </a>
          ) : (
            <p className="text-sm text-stone-400 flex items-center gap-2">
              <Download className="h-4 w-4" />
              Generating invoice...
            </p>
          )}
        </div>
      )}
      {isConfirmed && !invoice && (
        <div className="bg-white rounded-xl border border-stone-100 px-4 py-3">
          <p className="text-sm text-stone-400 flex items-center gap-2">
            <Download className="h-4 w-4" />
            Invoice sedang diproses...
          </p>
        </div>
      )}
    </div>
  );
}
