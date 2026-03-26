"use client";

/**
 * Onboarding wizard — Step 2: Menu Pertama (recommended, skippable)
 * Route: /merchant/onboarding/step-2
 *
 * Creates 1 MenuCategory + up to 5 MenuItems.
 * Shows a simplified menu preview panel on the right.
 */
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { WizardProgress } from "@/components/merchant/wizard-progress";

interface MenuItem {
  name: string;
  price: string;
}

export default function OnboardingStep2Page() {
  const router = useRouter();

  const [categoryName, setCategoryName] = useState("");
  const [items, setItems] = useState<MenuItem[]>([{ name: "", price: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function addItem() {
    if (items.length < 5) {
      setItems([...items, { name: "", price: "" }]);
    }
  }

  function removeItem(idx: number) {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== idx));
    }
  }

  function updateItem(idx: number, field: keyof MenuItem, value: string) {
    setItems(items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const validItems = items.filter((i) => i.name.trim() && i.price.trim());
    if (validItems.length === 0) {
      setError("Tambahkan minimal 1 item menu.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/merchant/onboarding/step/2", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryName: categoryName || "Menu Utama",
        items: validItems.map((i) => ({
          name: i.name.trim(),
          price: parseInt(i.price.replace(/\D/g, ""), 10) || 0,
        })),
      }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Terjadi kesalahan. Silakan coba lagi.");
      return;
    }

    router.push("/merchant/onboarding/step-3");
  }

  function handleSkip() {
    router.push("/merchant/onboarding/step-3");
  }

  // Preview items — only show filled rows
  const previewItems = items.filter((i) => i.name.trim());

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-10 px-4">
      {/* Progress */}
      <div className="w-full max-w-4xl mb-8">
        <WizardProgress currentStep={2} />
      </div>

      <div className="w-full max-w-4xl flex gap-6">
        {/* Form */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-stone-200 p-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-stone-900">
              Tambahkan Menu Pertama
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              Tambahkan minimal 3 item agar menu terlihat menarik. ⏱ ~2 menit
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Category name */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Nama Kategori
              </label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                placeholder="Menu Utama"
                disabled={loading}
              />
            </div>

            {/* Items */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Item Menu
              </label>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(idx, "name", e.target.value)}
                      className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                      placeholder={`Nama item ${idx + 1}`}
                      disabled={loading}
                    />
                    <div className="relative w-36">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={item.price}
                        onChange={(e) =>
                          updateItem(
                            idx,
                            "price",
                            e.target.value.replace(/\D/g, "")
                          )
                        }
                        className="w-full rounded-lg border border-stone-300 pl-8 pr-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                        placeholder="0"
                        disabled={loading}
                      />
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-stone-400 hover:text-red-500 text-sm p-1"
                        title="Hapus item"
                        disabled={loading}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {items.length < 5 && (
                <button
                  type="button"
                  onClick={addItem}
                  className="mt-2 text-sm text-orange-600 hover:text-orange-700 font-medium"
                  disabled={loading}
                >
                  + Tambah item
                </button>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between pt-2 gap-3">
              <button
                type="button"
                onClick={() => router.push("/merchant/onboarding/step-1")}
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

        {/* Live preview panel */}
        <div className="w-72 hidden lg:block">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5 sticky top-10">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">
              Preview Menu
            </p>
            <div className="rounded-lg bg-stone-50 p-4 min-h-32">
              {previewItems.length === 0 ? (
                <p className="text-xs text-stone-300 text-center mt-6">
                  Tambahkan item untuk melihat preview
                </p>
              ) : (
                <>
                  <p className="text-sm font-semibold text-stone-700 mb-2">
                    {categoryName || "Menu Utama"}
                  </p>
                  <div className="space-y-2">
                    {previewItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center text-sm"
                      >
                        <span className="text-stone-700 truncate mr-2">
                          {item.name}
                        </span>
                        <span className="text-stone-500 whitespace-nowrap text-xs">
                          Rp {parseInt(item.price || "0").toLocaleString("id-ID")}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <p className="text-xs text-stone-400 mt-3">
              Tampilan aktual di menu pelanggan bisa berbeda.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
