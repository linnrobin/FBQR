"use client";

/**
 * Onboarding wizard — Step 1: Info Restoran (REQUIRED)
 * Route: /merchant/onboarding/step-1
 *
 * Collects: Restaurant name, cuisine type, logo URL, branch address.
 * Saves via PATCH /api/merchant/onboarding/step/1 then navigates to step 2.
 */
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { WizardProgress } from "@/components/merchant/wizard-progress";

export default function OnboardingStep1Page() {
  const router = useRouter();

  const [restaurantName, setRestaurantName] = useState("");
  const [cuisineType, setCuisineType] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/merchant/onboarding/step/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantName, cuisineType, logoUrl, branchAddress }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Terjadi kesalahan. Silakan coba lagi.");
      return;
    }

    router.push("/merchant/onboarding/step-2");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-10 px-4">
      {/* Progress */}
      <div className="w-full max-w-lg mb-8">
        <WizardProgress currentStep={1} />
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-white rounded-xl shadow-sm border border-stone-200 p-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-stone-900">Info Restoran Anda</h1>
          <p className="text-sm text-stone-500 mt-1">
            Isi informasi dasar restoran Anda. Bisa diubah kapan saja. ⏱ ~2 menit
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="restaurantName"
              className="block text-sm font-medium text-stone-700 mb-1"
            >
              Nama Restoran <span className="text-red-500">*</span>
            </label>
            <input
              id="restaurantName"
              type="text"
              required
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
              placeholder="Warung Makan Bu Siti"
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="cuisineType"
              className="block text-sm font-medium text-stone-700 mb-1"
            >
              Jenis Masakan
            </label>
            <input
              id="cuisineType"
              type="text"
              value={cuisineType}
              onChange={(e) => setCuisineType(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
              placeholder="Masakan Jawa, Seafood, Western…"
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="branchAddress"
              className="block text-sm font-medium text-stone-700 mb-1"
            >
              Alamat <span className="text-red-500">*</span>
            </label>
            <input
              id="branchAddress"
              type="text"
              required
              value={branchAddress}
              onChange={(e) => setBranchAddress(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
              placeholder="Jl. Sudirman No. 12, Jakarta Pusat"
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="logoUrl"
              className="block text-sm font-medium text-stone-700 mb-1"
            >
              URL Logo{" "}
              <span className="text-stone-400 font-normal">(opsional)</span>
            </label>
            <input
              id="logoUrl"
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
              placeholder="https://example.com/logo.png"
              disabled={loading}
            />
            <p className="text-xs text-stone-400 mt-1">
              Upload logo bisa dilakukan di halaman Branding nanti.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Menyimpan…" : "Lanjut →"}
            </button>
          </div>
        </form>
      </div>

      {/* FBQR branding */}
      <p className="text-xs text-stone-400 mt-6">
        Butuh bantuan?{" "}
        <a href="mailto:support@fbqr.app" className="text-orange-600 hover:underline">
          Hubungi support
        </a>
      </p>
    </div>
  );
}
