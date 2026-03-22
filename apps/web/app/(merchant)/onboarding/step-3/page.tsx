"use client";

/**
 * Onboarding wizard — Step 3: Buat Meja & QR Code (REQUIRED)
 * Route: /merchant/onboarding/step-3
 *
 * Creates the first Table and generates a QR code.
 * Displays the QR code immediately — this is the "aha" activation moment.
 */
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { WizardProgress } from "@/components/merchant/wizard-progress";

export default function OnboardingStep3Page() {
  const router = useRouter();

  const [tableName, setTableName] = useState("Meja 1");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrResult, setQrResult] = useState<{
    qrDataUrl: string;
    qrUrl: string;
    tableName: string;
  } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/merchant/onboarding/step/3", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableName }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Terjadi kesalahan. Silakan coba lagi.");
      return;
    }

    setQrResult({
      qrDataUrl: data.qrDataUrl,
      qrUrl: data.qrUrl,
      tableName,
    });
  }

  function handleContinue() {
    router.push("/merchant/onboarding/step-4");
  }

  // After QR is generated — show the activation screen
  if (qrResult) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-start py-10 px-4">
        <div className="w-full max-w-lg mb-8">
          <WizardProgress currentStep={3} />
        </div>

        <div className="w-full max-w-lg bg-white rounded-xl shadow-sm border border-stone-200 p-8 text-center">
          <div className="mb-4">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-stone-900">
              {qrResult.tableName} berhasil dibuat!
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              Scan QR code ini sekarang untuk melihat menu Anda di ponsel!
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center my-6">
            <div className="p-4 bg-white border-2 border-stone-200 rounded-xl inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrResult.qrDataUrl}
                alt={`QR code untuk ${qrResult.tableName}`}
                width={200}
                height={200}
                className="block"
              />
            </div>
          </div>

          <p className="text-xs text-stone-400 mb-1">URL menu:</p>
          <p className="text-xs font-mono text-stone-500 break-all bg-stone-50 rounded px-3 py-2 mb-6">
            {qrResult.qrUrl}
          </p>

          <button
            onClick={handleContinue}
            className="w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
          >
            Lanjut ke Pengaturan Pembayaran →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-10 px-4">
      {/* Progress */}
      <div className="w-full max-w-lg mb-8">
        <WizardProgress currentStep={3} />
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-white rounded-xl shadow-sm border border-stone-200 p-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-stone-900">Buat Meja & QR Code</h1>
          <p className="text-sm text-stone-500 mt-1">
            Buat meja pertama dan scan QR-nya langsung dari ponsel Anda! ⏱ ~1 menit
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="tableName"
              className="block text-sm font-medium text-stone-700 mb-1"
            >
              Nama / Nomor Meja <span className="text-red-500">*</span>
            </label>
            <input
              id="tableName"
              type="text"
              required
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
              placeholder="Meja 1, Meja VIP, Teras A…"
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between pt-2 gap-3">
            <button
              type="button"
              onClick={() => router.push("/merchant/onboarding/step-2")}
              className="px-4 py-2 text-sm font-medium text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
              disabled={loading}
            >
              ← Kembali
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Membuat QR Code…" : "Buat Meja & QR Code"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
