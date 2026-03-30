"use client";

/**
 * Loyalty settings tab for /merchant/settings.
 *
 * Manages MerchantLoyaltyProgram: create or update a loyalty program,
 * toggle loyalty on/off in MerchantSettings.
 * Also manages LoyaltyTier: add/edit/delete tier levels with thresholds and multipliers.
 */
import { useState, useEffect } from "react";
import { Loader2, CheckCircle, Plus, Trash2, Pencil, X } from "lucide-react";

interface LoyaltyTier {
  id: string;
  name: string;
  threshold: number;
  multiplier: number | string;
  customTitle: string | null;
  badge: string | null;
}

interface LoyaltyProgram {
  id: string;
  name: string;
  idrPerPoint: number;
  redemptionRate: number | string;
  pointsCalculationBasis: "SUBTOTAL" | "TOTAL";
  isActive: boolean;
  tiers?: LoyaltyTier[];
}

interface Props {
  loyaltyEnabled: boolean;
  onLoyaltyEnabledChange: (v: boolean) => void;
}

const DEFAULT_TIERS = [
  { name: "Perak", threshold: 500, multiplier: 1.5, customTitle: null, badge: "🥈" },
  { name: "Emas", threshold: 2000, multiplier: 2.0, customTitle: null, badge: "🥇" },
  { name: "Platinum", threshold: 5000, multiplier: 3.0, customTitle: null, badge: "💎" },
];

export function SettingsLoyaltyTab({ loyaltyEnabled, onLoyaltyEnabledChange }: Props) {
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Program form state
  const [name, setName] = useState("");
  const [idrPerPoint, setIdrPerPoint] = useState("1000");
  const [redemptionRate, setRedemptionRate] = useState("100");
  const [basis, setBasis] = useState<"SUBTOTAL" | "TOTAL">("SUBTOTAL");

  // Tier form state
  const [tierModalOpen, setTierModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<LoyaltyTier | null>(null);
  const [tierName, setTierName] = useState("");
  const [tierThreshold, setTierThreshold] = useState("500");
  const [tierMultiplier, setTierMultiplier] = useState("1.5");
  const [tierTitle, setTierTitle] = useState("");
  const [tierBadge, setTierBadge] = useState("");
  const [tierSaving, setTierSaving] = useState(false);
  const [tierError, setTierError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/merchant/loyalty")
      .then((r) => r.json())
      .then((data) => {
        if (data.program) {
          setProgram(data.program);
          setName(data.program.name);
          setIdrPerPoint(String(data.program.idrPerPoint));
          setRedemptionRate(String(data.program.redemptionRate));
          setBasis(data.program.pointsCalculationBasis);
          setTiers(data.program.tiers ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);

    const payload = {
      name,
      idrPerPoint: parseInt(idrPerPoint, 10),
      redemptionRate: parseFloat(redemptionRate),
      pointsCalculationBasis: basis,
    };

    try {
      let res: Response;
      if (program) {
        res = await fetch(`/api/merchant/loyalty/${program.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/merchant/loyalty", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Gagal menyimpan");
        return;
      }

      const data = await res.json();
      setProgram(data.program);

      if (!loyaltyEnabled) {
        await fetch("/api/merchant/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ loyaltyEnabled: true }),
        });
        onLoyaltyEnabledChange(true);
      }

      setSaved(true);
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(enabled: boolean) {
    try {
      const res = await fetch("/api/merchant/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loyaltyEnabled: enabled }),
      });
      if (res.ok) {
        onLoyaltyEnabledChange(enabled);
      }
    } catch {
      // non-fatal
    }
  }

  function openAddTier() {
    setEditingTier(null);
    setTierName("");
    setTierThreshold("500");
    setTierMultiplier("1.5");
    setTierTitle("");
    setTierBadge("");
    setTierError(null);
    setTierModalOpen(true);
  }

  function openEditTier(tier: LoyaltyTier) {
    setEditingTier(tier);
    setTierName(tier.name);
    setTierThreshold(String(tier.threshold));
    setTierMultiplier(String(tier.multiplier));
    setTierTitle(tier.customTitle ?? "");
    setTierBadge(tier.badge ?? "");
    setTierError(null);
    setTierModalOpen(true);
  }

  async function handleSaveTier() {
    if (!program) return;
    setTierSaving(true);
    setTierError(null);

    const payload = {
      name: tierName.trim(),
      threshold: parseInt(tierThreshold, 10),
      multiplier: parseFloat(tierMultiplier),
      customTitle: tierTitle.trim() || null,
      badge: tierBadge.trim() || null,
    };

    try {
      let res: Response;
      if (editingTier) {
        res = await fetch(
          `/api/merchant/loyalty/${program.id}/tiers/${editingTier.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
      } else {
        res = await fetch(`/api/merchant/loyalty/${program.id}/tiers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setTierError(data.error ?? "Gagal menyimpan tier");
        return;
      }

      const data = await res.json();
      if (editingTier) {
        setTiers((prev) =>
          prev.map((t) => (t.id === editingTier.id ? data.tier : t))
        );
      } else {
        setTiers((prev) =>
          [...prev, data.tier].sort((a, b) => a.threshold - b.threshold)
        );
      }
      setTierModalOpen(false);
    } catch {
      setTierError("Koneksi gagal. Coba lagi.");
    } finally {
      setTierSaving(false);
    }
  }

  async function handleDeleteTier(tier: LoyaltyTier) {
    if (!program) return;
    if (!confirm(`Hapus tier "${tier.name}"?`)) return;

    try {
      const res = await fetch(
        `/api/merchant/loyalty/${program.id}/tiers/${tier.id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setTiers((prev) => prev.filter((t) => t.id !== tier.id));
      }
    } catch {
      // non-fatal
    }
  }

  async function handleAddDefaultTiers() {
    if (!program) return;
    for (const t of DEFAULT_TIERS) {
      try {
        const res = await fetch(`/api/merchant/loyalty/${program.id}/tiers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(t),
        });
        if (res.ok) {
          const data = await res.json();
          setTiers((prev) =>
            [...prev, data.tier].sort((a, b) => a.threshold - b.threshold)
          );
        }
      } catch {
        // non-fatal
      }
    }
  }

  const inputClass =
    "w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500";
  const labelClass = "block text-sm font-medium text-stone-700 mb-1";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-stone-500 mb-4">
        Buat program poin untuk pelanggan setia Anda. Pelanggan mendapatkan poin setiap pesanan
        dan bisa menukar poin untuk diskon.
      </p>

      {/* Enable toggle */}
      <div className="flex items-center justify-between py-4 border-b border-stone-100 mb-4">
        <div>
          <p className="text-sm font-medium text-stone-900">Program Loyalty</p>
          <p className="text-xs text-stone-500 mt-0.5">
            Aktifkan untuk menampilkan poin ke pelanggan di checkout
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={loyaltyEnabled}
          onClick={() => handleToggle(!loyaltyEnabled)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
            loyaltyEnabled ? "bg-orange-500" : "bg-stone-300"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              loyaltyEnabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Program form */}
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Nama Program</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setSaved(false); }}
            maxLength={100}
            placeholder="Contoh: Sakura Points"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>IDR per 1 Poin</label>
            <input
              type="number"
              value={idrPerPoint}
              onChange={(e) => { setIdrPerPoint(e.target.value); setSaved(false); }}
              min={1}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-stone-400">Setiap Rp {idrPerPoint || "–"} = 1 poin</p>
          </div>
          <div>
            <label className={labelClass}>Nilai Tukar Poin (IDR)</label>
            <input
              type="number"
              value={redemptionRate}
              onChange={(e) => { setRedemptionRate(e.target.value); setSaved(false); }}
              min={0.01}
              step={0.01}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-stone-400">1 poin = Rp {redemptionRate || "–"} diskon</p>
          </div>
        </div>

        <div>
          <label className={labelClass}>Dasar Perhitungan Poin</label>
          <div className="flex gap-3 mt-1">
            {(["SUBTOTAL", "TOTAL"] as const).map((v) => (
              <label
                key={v}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer text-sm ${
                  basis === v
                    ? "border-orange-500 bg-orange-50 text-orange-700 font-medium"
                    : "border-stone-200 text-stone-600 hover:border-stone-300"
                }`}
              >
                <input
                  type="radio"
                  className="sr-only"
                  checked={basis === v}
                  onChange={() => { setBasis(v); setSaved(false); }}
                />
                {v === "SUBTOTAL" ? "Subtotal (sebelum diskon)" : "Total (setelah diskon)"}
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-stone-400">
            SUBTOTAL mencegah pelanggan melakukan gaming dengan promo.
          </p>
        </div>
      </div>

      {/* Save bar */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-stone-100">
        <div className="text-sm">
          {error && <span className="text-red-600">{error}</span>}
          {saved && !error && (
            <span className="text-green-600 flex items-center gap-1">
              <CheckCircle size={14} /> Tersimpan
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim() || !idrPerPoint || !redemptionRate}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          {saving ? (
            <><Loader2 size={14} className="animate-spin" /> Menyimpan…</>
          ) : program ? (
            "Perbarui Program"
          ) : (
            "Buat Program"
          )}
        </button>
      </div>

      {/* Tier management — only shown when a program exists */}
      {program && (
        <div className="mt-8 border-t border-stone-100 pt-6">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">Level Tier</h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Pelanggan naik tier berdasarkan total poin kumulatif. Tier lebih tinggi mendapat
                pengali poin lebih besar.
              </p>
            </div>
            <button
              onClick={openAddTier}
              className="flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-700 border border-orange-200 hover:border-orange-300 rounded-lg px-3 py-1.5"
            >
              <Plus size={13} /> Tambah Tier
            </button>
          </div>

          {tiers.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-stone-200 p-6 text-center">
              <p className="text-sm text-stone-400 mb-3">
                Belum ada tier. Buat tier untuk program gamifikasi Anda.
              </p>
              <button
                onClick={handleAddDefaultTiers}
                className="text-xs font-medium text-orange-600 hover:underline"
              >
                Tambah tier default (Perak / Emas / Platinum)
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {tiers.map((tier) => (
                <div
                  key={tier.id}
                  className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-3 border border-stone-100"
                >
                  <div className="flex items-center gap-3">
                    {tier.badge && (
                      <span className="text-xl leading-none">{tier.badge}</span>
                    )}
                    <div>
                      <p className="text-sm font-medium text-stone-800">
                        {tier.name}
                        {tier.customTitle && (
                          <span className="ml-2 text-xs text-stone-400 font-normal">
                            &ldquo;{tier.customTitle}&rdquo;
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        ≥ {Number(tier.threshold).toLocaleString("id-ID")} poin
                        {" · "}
                        {Number(tier.multiplier)}× pengali
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditTier(tier)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteTier(tier)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Platform loyalty info */}
      <div className="mt-6 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
        <p className="text-xs font-medium text-orange-700 mb-0.5">🌐 FBQR Platform Points</p>
        <p className="text-xs text-orange-600">
          Pelanggan juga mendapatkan FBQR Platform Points yang berlaku di semua restoran FBQR.
          1 poin platform untuk setiap Rp 50.000 yang dibayarkan. Ini otomatis dan tidak dapat
          dikonfigurasi.
        </p>
      </div>

      {/* Tier modal */}
      {tierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl px-5 pt-5 pb-8 sm:pb-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-stone-900">
                {editingTier ? "Edit Tier" : "Tambah Tier Baru"}
              </h3>
              <button
                onClick={() => setTierModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Nama Tier</label>
                  <input
                    type="text"
                    value={tierName}
                    onChange={(e) => setTierName(e.target.value)}
                    placeholder="Contoh: Emas"
                    maxLength={80}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Ikon / Emoji</label>
                  <input
                    type="text"
                    value={tierBadge}
                    onChange={(e) => setTierBadge(e.target.value)}
                    placeholder="🥇"
                    maxLength={10}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Minimum Poin</label>
                  <input
                    type="number"
                    value={tierThreshold}
                    onChange={(e) => setTierThreshold(e.target.value)}
                    min={0}
                    className={inputClass}
                  />
                  <p className="mt-0.5 text-xs text-stone-400">Total poin kumulatif</p>
                </div>
                <div>
                  <label className={labelClass}>Pengali Poin</label>
                  <input
                    type="number"
                    value={tierMultiplier}
                    onChange={(e) => setTierMultiplier(e.target.value)}
                    min={0.1}
                    max={10}
                    step={0.1}
                    className={inputClass}
                  />
                  <p className="mt-0.5 text-xs text-stone-400">e.g. 2.0 = 2× poin</p>
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  Gelar Khusus{" "}
                  <span className="text-stone-400 font-normal">(opsional)</span>
                </label>
                <input
                  type="text"
                  value={tierTitle}
                  onChange={(e) => setTierTitle(e.target.value)}
                  placeholder='Contoh: "Ramen Shogun"'
                  maxLength={80}
                  className={inputClass}
                />
                <p className="mt-0.5 text-xs text-stone-400">
                  Gelar yang muncul di halaman akun pelanggan
                </p>
              </div>

              {tierError && (
                <p className="text-sm text-red-600">{tierError}</p>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setTierModalOpen(false)}
                className="flex-1 border border-stone-200 text-stone-600 rounded-xl py-2.5 text-sm font-medium hover:bg-stone-50"
              >
                Batal
              </button>
              <button
                onClick={handleSaveTier}
                disabled={tierSaving || !tierName.trim() || !tierThreshold || !tierMultiplier}
                className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium"
              >
                {tierSaving ? (
                  <><Loader2 size={14} className="animate-spin" /> Menyimpan…</>
                ) : editingTier ? (
                  "Perbarui"
                ) : (
                  "Tambah Tier"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
