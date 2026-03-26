"use client";

/**
 * Kitchen / POS staff PIN login page.
 *
 * Flow:
 *   1. Staff enters the restaurantId (preconfigured on the device via URL param
 *      `?restaurantId=xxx`, or typed manually for initial device setup).
 *   2. Staff enters their 4–6 digit PIN on the numpad.
 *   3. POST /api/auth/pin — on success sets fbqr_staff_session cookie.
 *   4. Redirect to /kitchen/display (or callbackUrl).
 *
 * Step 10 will add device-setup QR codes so restaurantId is pre-filled
 * automatically; this page provides the fallback manual flow.
 */
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const PIN_MAX_LENGTH = 6;

export default function KitchenLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [restaurantId, setRestaurantId] = useState(
    searchParams.get("restaurantId") ?? ""
  );
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"restaurant" | "pin">(
    searchParams.get("restaurantId") ? "pin" : "restaurant"
  );

  // Auto-submit when PIN reaches max length and all digits are entered
  useEffect(() => {
    if (pin.length === PIN_MAX_LENGTH) {
      void handlePinSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  function appendDigit(digit: string) {
    if (loading) return;
    if (pin.length < PIN_MAX_LENGTH) {
      setPin((p) => p + digit);
      setError(null);
    }
  }

  function backspace() {
    setPin((p) => p.slice(0, -1));
    setError(null);
  }

  async function handlePinSubmit() {
    if (!restaurantId || pin.length < 4) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId, pin }),
    });

    setLoading(false);

    if (!res.ok) {
      setPin("");
      setError("PIN salah. Coba lagi.");
      return;
    }

    const callbackUrl = searchParams.get("callbackUrl") ?? "/kitchen/display";
    router.push(callbackUrl);
  }

  // ── Step 1: Enter restaurant ID ───────────────────────────────────────────
  if (step === "restaurant") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white">FBQR</h1>
            <p className="text-sm text-gray-400 mt-1">Kitchen Display</p>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-8">
            <h2 className="text-lg font-semibold text-white mb-2">
              Setup Perangkat
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              Masukkan ID restoran untuk menghubungkan perangkat ini.
            </p>

            <div className="space-y-4">
              <input
                type="text"
                value={restaurantId}
                onChange={(e) => setRestaurantId(e.target.value.trim())}
                className="w-full rounded-lg bg-gray-700 border border-gray-600 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="ID Restoran (UUID)"
                autoComplete="off"
                spellCheck={false}
              />

              <button
                onClick={() => {
                  if (restaurantId) setStep("pin");
                }}
                disabled={!restaurantId}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Lanjutkan
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: PIN entry numpad ──────────────────────────────────────────────
  const dots = Array.from({ length: PIN_MAX_LENGTH }, (_, i) => i < pin.length);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">FBQR</h1>
          <p className="text-sm text-gray-400 mt-1">Kitchen Display</p>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-8">
          <h2 className="text-lg font-semibold text-white text-center mb-6">
            Masukkan PIN
          </h2>

          {/* PIN dots */}
          <div className="flex justify-center gap-3 mb-6">
            {dots.map((filled, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-colors ${
                  filled ? "bg-blue-500" : "bg-gray-600"
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="text-center text-sm text-red-400 mb-4">{error}</p>
          )}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button
                key={d}
                onClick={() => appendDigit(d)}
                disabled={loading}
                className="aspect-square rounded-xl bg-gray-700 text-white text-xl font-semibold hover:bg-gray-600 active:bg-gray-500 disabled:opacity-40 transition-colors"
              >
                {d}
              </button>
            ))}

            {/* Bottom row: back | 0 | delete */}
            <button
              onClick={() => {
                setPin("");
                setStep("restaurant");
              }}
              disabled={loading}
              className="aspect-square rounded-xl bg-gray-700 text-gray-400 text-xs font-medium hover:bg-gray-600 disabled:opacity-40 transition-colors"
            >
              Kembali
            </button>

            <button
              onClick={() => appendDigit("0")}
              disabled={loading}
              className="aspect-square rounded-xl bg-gray-700 text-white text-xl font-semibold hover:bg-gray-600 active:bg-gray-500 disabled:opacity-40 transition-colors"
            >
              0
            </button>

            <button
              onClick={backspace}
              disabled={loading || pin.length === 0}
              aria-label="Hapus digit terakhir"
              className="aspect-square rounded-xl bg-gray-700 text-gray-400 text-xl hover:bg-gray-600 disabled:opacity-40 transition-colors flex items-center justify-center"
            >
              ⌫
            </button>
          </div>

          {loading && (
            <p className="text-center text-sm text-gray-400 mt-4">
              Memverifikasi…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
