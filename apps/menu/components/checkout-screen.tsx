"use client";

/**
 * CheckoutScreen — pre-invoice client component for the checkout page.
 *
 * Reads cart from localStorage, computes pre-invoice, shows payment method
 * selector, handles order submission and Midtrans redirect.
 *
 * Also handles:
 *   - Privacy consent check (UU PDP)
 *   - PAY_AT_CASHIER confirmation
 *   - Patungan (split payment) setup
 */

import { useState, useEffect } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import type { CartEntry } from "./item-detail-modal";
import type { TaxSettings } from "./cart-sheet";
import { PaymentMethodSelector, type PaymentMethodOption } from "./payment-method-selector";
import { PatunganSetupModal } from "./patungan-setup-modal";
import { PatunganHostScreen } from "./patungan-host-screen";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CheckoutSettings {
  paymentMode: "PAY_FIRST" | "PAY_AT_CASHIER";
  taxSettings: TaxSettings;
  restaurantId: string;
  tableId: string;
}

interface CheckoutScreenProps {
  settings: CheckoutSettings;
  restaurantName: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function computeSummary(
  items: CartEntry[],
  s: TaxSettings
): { subtotal: number; serviceChargeAmount: number; taxAmount: number; grandTotal: number } {
  const subtotal = items.reduce((sum, e) => sum + e.lineTotal, 0);
  let serviceChargeAmount = 0;
  let taxAmount = 0;
  let grandTotal = subtotal;

  if (s.pricesIncludeTax) {
    taxAmount = Math.round((subtotal * s.taxRate) / (1 + s.taxRate));
    grandTotal = subtotal;
  } else {
    serviceChargeAmount = Math.round(subtotal * s.serviceChargeRate);
    const taxBase = s.taxOnServiceCharge ? subtotal + serviceChargeAmount : subtotal;
    taxAmount = Math.round(taxBase * s.taxRate);
    grandTotal = subtotal + serviceChargeAmount + taxAmount;
  }

  if (s.roundingRule === "ROUND_50") grandTotal = Math.round(grandTotal / 50) * 50;
  if (s.roundingRule === "ROUND_100") grandTotal = Math.round(grandTotal / 100) * 100;

  return { subtotal, serviceChargeAmount, taxAmount, grandTotal };
}

// ─── Privacy Consent Bottom Sheet ─────────────────────────────────────────────

function PrivacyConsentSheet({
  onAccept,
  onDecline,
}: {
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
      <div className="bg-white rounded-t-2xl w-full max-h-[80vh] overflow-y-auto p-6 space-y-4">
        <h3 className="text-base font-bold text-stone-900">
          Persetujuan Penggunaan Data
        </h3>
        <p className="text-sm text-stone-600 leading-relaxed">
          Sebelum melanjutkan, kami perlu persetujuanmu untuk memproses data pribadi
          sesuai{" "}
          <strong>UU No. 27/2022 tentang Perlindungan Data Pribadi (UU PDP)</strong>.
        </p>
        <p className="text-sm text-stone-600 leading-relaxed">
          Data yang dikumpulkan (nama meja, pesanan, waktu transaksi) akan digunakan
          hanya untuk memproses pesananmu dan tidak akan dijual kepada pihak ketiga.
        </p>
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={onAccept}
            className="w-full h-12 bg-[--color-primary] text-white font-semibold rounded-[--border-radius] text-sm hover:opacity-90 transition-opacity"
          >
            Saya Setuju — Lanjutkan
          </button>
          <button
            type="button"
            onClick={onDecline}
            className="w-full h-10 text-stone-500 text-sm hover:text-stone-700"
          >
            Batalkan
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CheckoutScreen({ settings, restaurantName }: CheckoutScreenProps) {
  const router = useRouter();
  const { paymentMode, taxSettings, restaurantId, tableId } = settings;

  const [cartItems, setCartItems] = useState<CartEntry[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodOption>("QRIS");
  const [customerNote, setCustomerNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  const [showPatungan, setShowPatungan] = useState(false);
  const [patunganId, setPatunganId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [patunganLoading, setPatunganLoading] = useState(false);
  const [payAtCashierPending, setPayAtCashierPending] = useState(false);

  // Load cart from localStorage
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("fbqr_cart");
      if (raw) {
        setCartItems(JSON.parse(raw) as CartEntry[]);
      }
    } catch {
      // empty cart
    }
  }, []);

  const summary = computeSummary(cartItems, taxSettings);

  const checkConsentAndProceed = (action: () => void) => {
    const consent = localStorage.getItem("fbqr_consent");
    if (consent === "1") {
      action();
    } else {
      setShowConsent(true);
      // Store the pending action
      (window as Window & { _pendingCheckoutAction?: () => void })._pendingCheckoutAction = action;
    }
  };

  const handleConsentAccept = () => {
    localStorage.setItem("fbqr_consent", "1");
    setShowConsent(false);
    const pending = (window as Window & { _pendingCheckoutAction?: () => void })._pendingCheckoutAction;
    if (pending) {
      pending();
      delete (window as Window & { _pendingCheckoutAction?: () => void })._pendingCheckoutAction;
    }
  };

  const submitOrder = async () => {
    if (cartItems.length === 0) return;
    setSubmitting(true);
    setError(null);

    try {
      const idempotencyKey = crypto.randomUUID();
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          tableId,
          items: cartItems,
          paymentMethod,
          idempotencyKey,
          customerNote: customerNote.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Terjadi kesalahan.");
        return;
      }

      const { orderId: newOrderId, redirectUrl, paymentMode: mode } = data as {
        orderId: string;
        redirectUrl?: string;
        paymentMode: string;
      };

      // Clear cart
      sessionStorage.removeItem("fbqr_cart");

      if (mode === "PAY_AT_CASHIER") {
        setOrderId(newOrderId);
        setPayAtCashierPending(true);
        return;
      }

      // PAY_FIRST: redirect to Midtrans
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    } catch {
      setError("Terjadi kesalahan jaringan. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePatunganOrder = async (params: {
    splitMode: "EQUAL" | "MANUAL";
    totalParts: number;
    amountPerPart?: number;
  }) => {
    setPatunganLoading(true);
    setError(null);

    try {
      // First create the order
      const idempotencyKey = crypto.randomUUID();
      const orderRes = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          tableId,
          items: cartItems,
          paymentMethod: "QRIS",
          idempotencyKey,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        setError((orderData as { error?: string }).error ?? "Gagal membuat pesanan.");
        return;
      }

      const newOrderId = (orderData as { orderId: string }).orderId;
      sessionStorage.removeItem("fbqr_cart");

      // Then create PatunganSession
      const patRes = await fetch("/api/patungan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: newOrderId,
          splitMode: params.splitMode,
          totalParts: params.totalParts,
          amountPerPart: params.amountPerPart,
          restaurantId,
        }),
      });

      const patData = await patRes.json();
      if (!patRes.ok) {
        setError((patData as { error?: string }).error ?? "Gagal membuat Patungan.");
        return;
      }

      setOrderId(newOrderId);
      setPatunganId((patData as { patunganId: string }).patunganId);
      setShowPatungan(false);
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setPatunganLoading(false);
    }
  };

  // PAY_AT_CASHIER pending state
  if (payAtCashierPending && orderId) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-4">⏳</div>
          <h2 className="text-lg font-bold text-amber-900 mb-2">
            Menunggu konfirmasi kasir
          </h2>
          <p className="text-sm text-amber-700 leading-relaxed mb-4">
            Pesanan Anda sedang menunggu dikonfirmasi oleh kasir. Silakan
            tunjukkan layar ini ke kasir.
          </p>
          <p className="text-xs text-amber-600 bg-amber-100 rounded-lg px-3 py-2">
            Order ID: {orderId.slice(0, 8).toUpperCase()}
          </p>
        </div>
      </div>
    );
  }

  // Patungan host screen
  if (patunganId && orderId) {
    return (
      <div className="min-h-screen bg-stone-50">
        <header className="sticky top-0 z-30 h-14 bg-white border-b border-stone-100 flex items-center px-4 gap-3">
          <div className="text-base font-semibold text-stone-900 flex items-center gap-2">
            <span className="text-[--color-primary]">👥</span>
            Patungan — {restaurantName}
          </div>
        </header>
        <PatunganHostScreen
          patunganId={patunganId}
          restaurantId={restaurantId}
          tableId={tableId}
          onAllPaid={(confirmedOrderId) =>
            router.push(`/${restaurantId}/${tableId}/order/${confirmedOrderId}?status=finish`)
          }
          onCancelled={() => {
            setPatunganId(null);
            setOrderId(null);
            router.push(`/${restaurantId}/${tableId}`);
          }}
        />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4 text-center">
        <p className="text-stone-500 text-sm mb-4">Keranjang kosong.</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-[--color-primary] text-sm underline"
        >
          Kembali ke menu
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Privacy consent overlay */}
      {showConsent && (
        <PrivacyConsentSheet
          onAccept={handleConsentAccept}
          onDecline={() => setShowConsent(false)}
        />
      )}

      {/* Patungan setup modal */}
      <PatunganSetupModal
        isOpen={showPatungan}
        onClose={() => setShowPatungan(false)}
        grandTotal={summary.grandTotal}
        onCreatePatungan={handlePatunganOrder}
        isLoading={patunganLoading}
      />

      <div className="min-h-screen bg-stone-50 pb-32">
        {/* Back button */}
        <header className="sticky top-0 z-30 h-14 bg-white border-b border-stone-100 flex items-center px-4 gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-stone-500 hover:text-stone-800"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm">Kembali</span>
          </button>
          <span className="text-sm font-semibold text-stone-900 flex-1 text-center pr-12">
            Konfirmasi Pesanan
          </span>
        </header>

        <div className="max-w-lg mx-auto px-4 py-4 space-y-5">
          {/* Section 1: Order Summary */}
          <section className="bg-white rounded-xl shadow-sm border border-stone-100 p-4">
            <h3 className="text-sm font-semibold text-stone-700 mb-3">
              Ringkasan Pesanan
            </h3>

            {/* Item list (read-only) */}
            <div className="space-y-2 mb-4">
              {cartItems.map((entry) => (
                <div key={entry.itemId} className="flex justify-between gap-2">
                  <span className="text-sm text-stone-700 flex-1 line-clamp-2">
                    {entry.qty}× {entry.itemName}
                    {entry.variantName ? ` (${entry.variantName})` : ""}
                  </span>
                  <span className="text-sm font-medium text-stone-900 shrink-0">
                    {fmt(entry.lineTotal)}
                  </span>
                </div>
              ))}
            </div>

            {/* Divider + breakdown */}
            <div className="border-t border-stone-100 pt-3 space-y-2">
              <div className="flex justify-between text-sm text-stone-500">
                <span>Subtotal</span>
                <span>{fmt(summary.subtotal)}</span>
              </div>
              {summary.serviceChargeAmount > 0 && (
                <div className="flex justify-between text-sm text-stone-500">
                  <span>{taxSettings.serviceChargeLabel}</span>
                  <span>{fmt(summary.serviceChargeAmount)}</span>
                </div>
              )}
              {summary.taxAmount > 0 && (
                <div className="flex justify-between text-sm text-stone-500">
                  <span>
                    {taxSettings.taxLabel}
                    {taxSettings.pricesIncludeTax ? " (sudah termasuk)" : ""}
                  </span>
                  <span>{fmt(summary.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-1 border-t border-stone-100">
                <span>Grand Total</span>
                <span className="text-[--color-primary] text-lg">
                  {fmt(summary.grandTotal)}
                </span>
              </div>
            </div>
          </section>

          {/* Section 2: Payment method (PAY_FIRST only) */}
          {paymentMode === "PAY_FIRST" && (
            <section className="bg-white rounded-xl shadow-sm border border-stone-100 p-4">
              <h3 className="text-sm font-semibold text-stone-700 mb-3">
                Cara Bayar
              </h3>
              <PaymentMethodSelector
                selected={paymentMethod}
                onChange={setPaymentMethod}
              />
            </section>
          )}

          {/* Section 3: Customer note */}
          <section className="bg-white rounded-xl shadow-sm border border-stone-100 p-4">
            <h3 className="text-sm font-semibold text-stone-700 mb-2">
              Catatan (opsional)
            </h3>
            <textarea
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value.slice(0, 200))}
              placeholder="Catatan untuk dapur... (tidak pedas, dll.)"
              rows={3}
              className="w-full text-sm border border-stone-200 rounded-[--border-radius] px-3 py-2 resize-none focus:outline-none focus:border-[--color-primary]"
            />
            <p className="text-xs text-stone-400 text-right mt-1">
              {customerNote.length}/200
            </p>
          </section>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm text-red-700 text-center">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-stone-100 px-4 py-4 space-y-2">
        {/* Primary CTA */}
        <button
          type="button"
          onClick={() =>
            checkConsentAndProceed(submitOrder)
          }
          disabled={submitting || cartItems.length === 0}
          className="w-full h-12 bg-[--color-primary] text-white font-semibold rounded-[--border-radius] text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <Lock className="h-4 w-4" />
          {submitting
            ? "Memproses..."
            : paymentMode === "PAY_AT_CASHIER"
            ? `Kirim Pesanan — Bayar di Kasir`
            : `Bayar Sekarang — ${fmt(summary.grandTotal)}`}
        </button>

        {/* Patungan CTA (PAY_FIRST only) */}
        {paymentMode === "PAY_FIRST" && (
          <button
            type="button"
            onClick={() =>
              checkConsentAndProceed(() => setShowPatungan(true))
            }
            disabled={submitting || cartItems.length === 0}
            className="w-full h-10 border border-[--color-primary] text-[--color-primary] rounded-[--border-radius] text-sm font-medium hover:bg-[--color-primary]/5 disabled:opacity-50 transition-colors"
          >
            👥 Bayar Patungan
          </button>
        )}
      </div>
    </>
  );
}
