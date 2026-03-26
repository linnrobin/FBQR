"use client";

/**
 * Onboarding wizard — Step 4: Pengaturan Pembayaran (recommended, skippable)
 * Route: /merchant/onboarding/step-4
 *
 * Sets MerchantSettings.paymentMode.
 * QRIS is always available. Optionally enable Cash ("Bayar di Kasir").
 */
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { WizardProgress } from "@/components/merchant/wizard-progress";

type PaymentMode = "PAY_FIRST" | "PAY_AT_CASHIER" | "BOTH";

const PAYMENT_OPTIONS: { value: PaymentMode; label: string; desc: string }[] = [
  {
    value: "PAY_FIRST",
    label: "QRIS / Transfer (bayar dulu)",
    desc: "Pelanggan bayar via QRIS atau transfer sebelum pesanan diproses. Direkomendasikan.",
  },
  {
    value: "PAY_AT_CASHIER",
    label: "Bayar di Kasir",
    desc: "Pelanggan bayar tunai/QRIS di kasir setelah makan. Pesanan langsung diproses tanpa pembayaran awal.",
  },
  {
    value: "BOTH",
    label: "Keduanya",
    desc: "Izinkan pelanggan memilih: bayar via QRIS atau bayar di kasir.",
  },
];

export default function OnboardingStep4Page() {
  const router = useRouter();

  const [paymentMode, setPaymentMode] = useState<PaymentMode>("PAY_FIRST");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/merchant/onboarding/step/4", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentMode }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Terjadi kesalahan. Silakan coba lagi.");
      return;
    }

    router.push("/merchant/onboarding/step-5");
  }

  function handleSkip() {
    router.push("/merchant/onboarding/step-5");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-10 px-4">
      {/* Progress */}
      <div className="w-full max-w-lg mb-8">
        <WizardProgress currentStep={4} />
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-white rounded-xl shadow-sm border border-stone-200 p-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-stone-900">Pengaturan Pembayaran</h1>
          <p className="text-sm text-stone-500 mt-1">
            Pilih cara pelanggan membayar pesanan mereka. ⏱ ~1 menit
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {PAYMENT_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                paymentMode === opt.value
                  ? "border-orange-500 bg-orange-50"
                  : "border-stone-200 hover:border-stone-300"
              }`}
            >
              <input
                type="radio"
                name="paymentMode"
                value={opt.value}
                checked={paymentMode === opt.value}
                onChange={() => setPaymentMode(opt.value)}
                className="mt-0.5 accent-orange-600"
                disabled={loading}
              />
              <div>
                <p className="text-sm font-medium text-stone-800">{opt.label}</p>
                <p className="text-xs text-stone-500 mt-0.5">{opt.desc}</p>
              </div>
            </label>
          ))}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between pt-2 gap-3">
            <button
              type="button"
              onClick={() => router.push("/merchant/onboarding/step-3")}
              className="px-4 py-2 text-sm font-medium text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
              disabled={loading}
            >
              ← Kembali
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSkip}
                className="px-4 py-2 text-sm font-medium text-stone-500 hover:text-stone-700 transition-colors"
                disabled={loading}
              >
                Lewati
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-orange-600 px-6 py-2 text-sm font-semibold text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Menyimpan…" : "Lanjut →"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
