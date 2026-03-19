"use client";

/**
 * FBQRSYS Platform Settings page.
 * Route: /fbqrsys/settings
 * Requires: settings:manage
 *
 * Reads/writes PlatformSettings singleton (id = 1).
 * Spec: docs/platform-owner.md § PlatformSettings Panel.
 */
import { useEffect, useState, type FormEvent } from "react";

interface PlatformSettings {
  supportEmail: string;
  supportWhatsapp: string;
  supportResponseMessage: string;
  platformName: string;
  platformTagline: string;
  platformLogoUrl: string | null;
  trialDurationDays: number;
  gracePeriodDays: number;
  ownerAlertEmail: string | null;
  ownerAlertWhatsapp: string | null;
  aiRecommendationsEnabled: boolean;
  tosUrl: string | null;
  privacyPolicyUrl: string | null;
  dpoEmail: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state mirrors settings
  const [form, setForm] = useState<Partial<PlatformSettings>>({});

  useEffect(() => {
    fetch("/api/fbqrsys/settings")
      .then((r) => r.json())
      .then((d) => {
        setSettings(d.settings);
        setForm(d.settings ?? {});
      })
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof PlatformSettings>(
    key: K,
    value: PlatformSettings[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const res = await fetch("/api/fbqrsys/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Gagal menyimpan pengaturan.");
      return;
    }

    const d = await res.json();
    setSettings(d.settings);
    setSavedAt(new Date());
  }

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-lg bg-stone-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="mb-8 text-3xl font-bold text-stone-900">Pengaturan Platform</h1>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Platform Identity */}
        <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-stone-900">Identitas Platform</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Nama Platform
              </label>
              <input
                type="text"
                value={form.platformName ?? ""}
                onChange={(e) => update("platformName", e.target.value)}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Tagline
              </label>
              <input
                type="text"
                value={form.platformTagline ?? ""}
                onChange={(e) => update("platformTagline", e.target.value)}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                URL Logo Platform
              </label>
              <input
                type="url"
                value={form.platformLogoUrl ?? ""}
                onChange={(e) =>
                  update("platformLogoUrl", e.target.value || null)
                }
                placeholder="https://..."
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>
        </section>

        {/* Support */}
        <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-stone-900">Dukungan Pelanggan</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Email Support
              </label>
              <input
                type="email"
                value={form.supportEmail ?? ""}
                onChange={(e) => update("supportEmail", e.target.value)}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                WhatsApp Support
              </label>
              <input
                type="text"
                value={form.supportWhatsapp ?? ""}
                onChange={(e) => update("supportWhatsapp", e.target.value)}
                placeholder="+6281234567890"
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Pesan Respons Otomatis
              </label>
              <input
                type="text"
                value={form.supportResponseMessage ?? ""}
                onChange={(e) =>
                  update("supportResponseMessage", e.target.value)
                }
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>
        </section>

        {/* Billing Defaults */}
        <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-stone-900">Pengaturan Tagihan Default</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Durasi Trial Default (hari)
              </label>
              <input
                type="number"
                min={1}
                max={90}
                value={form.trialDurationDays ?? 14}
                onChange={(e) =>
                  update("trialDurationDays", parseInt(e.target.value, 10))
                }
                className="w-32 rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Grace Period Default (hari)
              </label>
              <input
                type="number"
                min={0}
                max={30}
                value={form.gracePeriodDays ?? 7}
                onChange={(e) =>
                  update("gracePeriodDays", parseInt(e.target.value, 10))
                }
                className="w-32 rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
              <p className="mt-1 text-xs text-stone-400">
                Hari tambahan setelah gagal bayar sebelum akun ditangguhkan.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Email Alert Pemilik
              </label>
              <input
                type="email"
                value={form.ownerAlertEmail ?? ""}
                onChange={(e) =>
                  update("ownerAlertEmail", e.target.value || null)
                }
                placeholder="robin@fbqr.app"
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>
        </section>

        {/* Legal & Compliance */}
        <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-stone-900">Legal & Kepatuhan</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                URL Syarat & Ketentuan
              </label>
              <input
                type="url"
                value={form.tosUrl ?? ""}
                onChange={(e) => update("tosUrl", e.target.value || null)}
                placeholder="https://fbqr.app/tos"
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                URL Kebijakan Privasi
              </label>
              <input
                type="url"
                value={form.privacyPolicyUrl ?? ""}
                onChange={(e) =>
                  update("privacyPolicyUrl", e.target.value || null)
                }
                placeholder="https://fbqr.app/privacy"
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Email Data Protection Officer (DPO)
              </label>
              <input
                type="email"
                value={form.dpoEmail ?? ""}
                onChange={(e) => update("dpoEmail", e.target.value || null)}
                placeholder="dpo@fbqr.app"
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
              <p className="mt-1 text-xs text-stone-400">
                Wajib diisi untuk kepatuhan UU PDP Indonesia.
              </p>
            </div>
          </div>
        </section>

        {/* Feature Flags */}
        <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-stone-900">Feature Flags</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.aiRecommendationsEnabled ?? false}
                onChange={(e) =>
                  update("aiRecommendationsEnabled", e.target.checked)
                }
                className="rounded border-stone-300 text-orange-600"
              />
              <div>
                <span className="text-sm font-medium text-stone-700">
                  AI Recommendations
                </span>
                <p className="text-xs text-stone-400">
                  Aktifkan rekomendasi menu bertenaga AI untuk semua merchant.
                </p>
              </div>
            </label>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Save */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-orange-600 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Menyimpan..." : "Simpan Pengaturan"}
          </button>
          {savedAt && (
            <span className="text-sm text-green-600">
              Tersimpan pada{" "}
              {savedAt.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
