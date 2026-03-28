"use client";

/**
 * Loyalty settings tab for /merchant/settings.
 *
 * Manages MerchantLoyaltyProgram: create or update a loyalty program,
 * toggle loyalty on/off in MerchantSettings.
 */
import { useState, useEffect } from "react";
import { Loader2, CheckCircle } from "lucide-react";

interface LoyaltyProgram {
  id: string;
  name: string;
  idrPerPoint: number;
  redemptionRate: number | string;
  pointsCalculationBasis: "SUBTOTAL" | "TOTAL";
  isActive: boolean;
}

interface Props {
  loyaltyEnabled: boolean;
  onLoyaltyEnabledChange: (v: boolean) => void;
}

export function SettingsLoyaltyTab({ loyaltyEnabled, onLoyaltyEnabledChange }: Props) {
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [idrPerPoint, setIdrPerPoint] = useState("1000");
  const [redemptionRate, setRedemptionRate] = useState("100");
  const [basis, setBasis] = useState<"SUBTOTAL" | "TOTAL">("SUBTOTAL");

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

      // Also enable loyalty in settings
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
    </div>
  );
}
