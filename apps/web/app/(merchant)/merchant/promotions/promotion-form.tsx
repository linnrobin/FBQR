"use client";

/**
 * PromotionForm — Create/Edit form for a single Promotion.
 * Used as a full-page component at /merchant/promotions/new and
 * /merchant/promotions/[promotionId]/edit.
 *
 * Submits to:
 *   POST   /api/merchant/promotions          — create
 *   PATCH  /api/merchant/promotions/[id]     — edit
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT" | "BOGO" | "FREE_ITEM";
export type PromotionScope = "ALL_ITEMS" | "SPECIFIC_CATEGORIES" | "SPECIFIC_ITEMS";

export interface PromotionCategory {
  id: string;
  name: string;
}

export interface PromotionMenuItem {
  id: string;
  name: string;
  category: string;
}

export interface PromotionFormValues {
  name: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  maximumDiscountAmount: number | null;
  minimumOrderValue: number | null;
  applicableTo: PromotionScope;
  applicableItemIds: string[];
  code: string;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  validFrom: string;
  validTo: string;
  isActive: boolean;
}

interface PromotionFormProps {
  promotionId?: string;
  initial?: Partial<PromotionFormValues>;
  categories: PromotionCategory[];
  menuItems: PromotionMenuItem[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtIDR(n: number | null): string {
  if (n === null || n === 0) return "";
  return n.toLocaleString("id-ID");
}

function parseIDR(s: string): number | null {
  const n = parseInt(s.replace(/\D/g, ""), 10);
  return isNaN(n) ? null : n;
}

const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  PERCENTAGE: "Persentase Diskon",
  FIXED_AMOUNT: "Potongan Harga",
  BOGO: "Beli 1 Gratis 1 (BOGO)",
  FREE_ITEM: "Item Gratis",
};

const SCOPE_LABELS: Record<PromotionScope, string> = {
  ALL_ITEMS: "Semua Item",
  SPECIFIC_CATEGORIES: "Kategori Tertentu",
  SPECIFIC_ITEMS: "Item Tertentu",
};

const DEFAULTS: PromotionFormValues = {
  name: "",
  description: "",
  discountType: "PERCENTAGE",
  discountValue: 0,
  maximumDiscountAmount: null,
  minimumOrderValue: null,
  applicableTo: "ALL_ITEMS",
  applicableItemIds: [],
  code: "",
  usageLimit: null,
  perCustomerLimit: null,
  validFrom: "",
  validTo: "",
  isActive: true,
};

// ─── Small Primitives ─────────────────────────────────────────────────────────

function FieldRow({
  label,
  htmlFor,
  helper,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  helper?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-gray-700"
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {helper && <p className="text-xs text-gray-500">{helper}</p>}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
          checked ? "bg-blue-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

// ─── Multi-Select Category Checkboxes ────────────────────────────────────────

function CategoryPicker({
  categories,
  selected,
  onChange,
}: {
  categories: PromotionCategory[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(
      selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
      {categories.length === 0 && (
        <p className="px-4 py-3 text-sm text-gray-400">Belum ada kategori</p>
      )}
      {categories.map((cat) => (
        <label key={cat.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={selected.includes(cat.id)}
            onChange={() => toggle(cat.id)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">{cat.name}</span>
        </label>
      ))}
    </div>
  );
}

// ─── Multi-Select Item Search ─────────────────────────────────────────────────

function ItemPicker({
  items,
  selected,
  onChange,
}: {
  items: PromotionMenuItem[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = query
    ? items.filter(
        (it) =>
          it.name.toLowerCase().includes(query.toLowerCase()) ||
          it.category.toLowerCase().includes(query.toLowerCase())
      )
    : items;

  function toggle(id: string) {
    onChange(
      selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cari item menu..."
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="border border-gray-200 rounded-lg max-h-52 overflow-y-auto divide-y divide-gray-100">
        {filtered.length === 0 && (
          <p className="px-4 py-3 text-sm text-gray-400">Tidak ada hasil</p>
        )}
        {filtered.map((item) => (
          <label key={item.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={() => toggle(item.id)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm text-gray-700">{item.name}</span>
              <span className="ml-2 text-xs text-gray-400">{item.category}</span>
            </div>
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-gray-500">{selected.length} item dipilih</p>
      )}
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export function PromotionForm({
  promotionId,
  initial,
  categories,
  menuItems,
}: PromotionFormProps) {
  const router = useRouter();
  const isEdit = !!promotionId;

  const [f, setF] = useState<PromotionFormValues>({ ...DEFAULTS, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function upd<K extends keyof PromotionFormValues>(k: K, v: PromotionFormValues[K]) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  const showDiscountValue = f.discountType === "PERCENTAGE" || f.discountType === "FIXED_AMOUNT";
  const showMaxDiscount = f.discountType === "PERCENTAGE";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = {
      name: f.name,
      description: f.description || null,
      discountType: f.discountType,
      discountValue: f.discountValue,
      maximumDiscountAmount: f.maximumDiscountAmount,
      minimumOrderValue: f.minimumOrderValue,
      applicableTo: f.applicableTo,
      applicableItemIds: f.applicableTo === "ALL_ITEMS" ? [] : f.applicableItemIds,
      code: f.code.trim() || null,
      usageLimit: f.usageLimit,
      perCustomerLimit: f.perCustomerLimit,
      validFrom: f.validFrom || null,
      validTo: f.validTo || null,
      isActive: f.isActive,
    };

    const url = isEdit
      ? `/api/merchant/promotions/${promotionId}`
      : "/api/merchant/promotions";
    const method = isEdit ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setError("Kode promo sudah digunakan. Gunakan kode yang berbeda.");
        } else {
          setError(data.error ?? "Gagal menyimpan promosi");
        }
        return;
      }

      router.push("/merchant/promotions");
      router.refresh();
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Name */}
      <FieldRow label="Nama Promosi" htmlFor="promo-name" required>
        <input
          id="promo-name"
          type="text"
          value={f.name}
          onChange={(e) => upd("name", e.target.value)}
          maxLength={100}
          required
          placeholder="contoh: Diskon Akhir Tahun"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </FieldRow>

      {/* Description */}
      <FieldRow label="Deskripsi" htmlFor="promo-desc">
        <textarea
          id="promo-desc"
          value={f.description}
          onChange={(e) => upd("description", e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Deskripsi singkat yang terlihat oleh pelanggan"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </FieldRow>

      {/* Discount Type */}
      <FieldRow label="Tipe" htmlFor="promo-type" required>
        <select
          id="promo-type"
          value={f.discountType}
          onChange={(e) => upd("discountType", e.target.value as DiscountType)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {(Object.keys(DISCOUNT_TYPE_LABELS) as DiscountType[]).map((t) => (
            <option key={t} value={t}>
              {DISCOUNT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </FieldRow>

      {/* Discount Value */}
      {showDiscountValue && (
        <FieldRow
          label="Nilai Diskon"
          htmlFor="promo-value"
          required
        >
          <div className="relative">
            {f.discountType === "FIXED_AMOUNT" && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">Rp</span>
            )}
            <input
              id="promo-value"
              type="number"
              value={f.discountValue === 0 ? "" : f.discountValue}
              onChange={(e) => upd("discountValue", parseInt(e.target.value) || 0)}
              min={0}
              max={f.discountType === "PERCENTAGE" ? 100 : undefined}
              required
              className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                f.discountType === "FIXED_AMOUNT" ? "pl-8" : ""
              } ${f.discountType === "PERCENTAGE" ? "pr-8" : ""}`}
            />
            {f.discountType === "PERCENTAGE" && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">%</span>
            )}
          </div>
        </FieldRow>
      )}

      {/* Maximum Discount (PERCENTAGE only) */}
      {showMaxDiscount && (
        <FieldRow
          label="Diskon Maksimal"
          htmlFor="promo-maxdiscount"
          helper="Batas maksimal potongan harga"
        >
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">Rp</span>
            <input
              id="promo-maxdiscount"
              type="text"
              value={fmtIDR(f.maximumDiscountAmount)}
              onChange={(e) => upd("maximumDiscountAmount", parseIDR(e.target.value))}
              placeholder="Tidak terbatas"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </FieldRow>
      )}

      {/* Minimum Order */}
      <FieldRow
        label="Minimum Pesanan"
        htmlFor="promo-minorder"
        helper="Minimum total belanja untuk menggunakan promo ini"
      >
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">Rp</span>
          <input
            id="promo-minorder"
            type="text"
            value={fmtIDR(f.minimumOrderValue)}
            onChange={(e) => upd("minimumOrderValue", parseIDR(e.target.value))}
            placeholder="Tidak ada minimum"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </FieldRow>

      {/* Applicable To */}
      <FieldRow label="Berlaku Untuk" required>
        <div className="flex flex-col gap-2">
          {(Object.keys(SCOPE_LABELS) as PromotionScope[]).map((scope) => (
            <label key={scope} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="applicableTo"
                value={scope}
                checked={f.applicableTo === scope}
                onChange={() => {
                  upd("applicableTo", scope);
                  upd("applicableItemIds", []);
                }}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{SCOPE_LABELS[scope]}</span>
            </label>
          ))}
        </div>

        {f.applicableTo === "SPECIFIC_CATEGORIES" && (
          <div className="mt-3">
            <CategoryPicker
              categories={categories}
              selected={f.applicableItemIds}
              onChange={(ids) => upd("applicableItemIds", ids)}
            />
          </div>
        )}

        {f.applicableTo === "SPECIFIC_ITEMS" && (
          <div className="mt-3">
            <ItemPicker
              items={menuItems}
              selected={f.applicableItemIds}
              onChange={(ids) => upd("applicableItemIds", ids)}
            />
          </div>
        )}
      </FieldRow>

      {/* Promo Code */}
      <FieldRow
        label="Kode Promo"
        htmlFor="promo-code"
        helper="Kosongkan untuk promo otomatis (tanpa kode)"
      >
        <input
          id="promo-code"
          type="text"
          value={f.code}
          onChange={(e) => upd("code", e.target.value.toUpperCase())}
          maxLength={50}
          placeholder="contoh: PROMO10"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
        />
      </FieldRow>

      {/* Usage Limit */}
      <FieldRow
        label="Batas Penggunaan"
        htmlFor="promo-usagelimit"
        helper="Kosongkan = tidak terbatas"
      >
        <input
          id="promo-usagelimit"
          type="number"
          value={f.usageLimit ?? ""}
          onChange={(e) => upd("usageLimit", e.target.value ? parseInt(e.target.value) : null)}
          min={1}
          placeholder="Tidak terbatas"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </FieldRow>

      {/* Per Customer Limit */}
      <FieldRow
        label="Batas per Pelanggan"
        htmlFor="promo-perlimit"
        helper="Hanya berlaku untuk pelanggan terdaftar"
      >
        <input
          id="promo-perlimit"
          type="number"
          value={f.perCustomerLimit ?? ""}
          onChange={(e) => upd("perCustomerLimit", e.target.value ? parseInt(e.target.value) : null)}
          min={1}
          placeholder="Tidak terbatas"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </FieldRow>

      {/* Valid From / To */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldRow label="Berlaku Dari" htmlFor="promo-validfrom">
          <input
            id="promo-validfrom"
            type="datetime-local"
            value={f.validFrom}
            onChange={(e) => upd("validFrom", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </FieldRow>
        <FieldRow label="Berlaku Hingga" htmlFor="promo-validto">
          <input
            id="promo-validto"
            type="datetime-local"
            value={f.validTo}
            onChange={(e) => upd("validTo", e.target.value)}
            min={f.validFrom || undefined}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </FieldRow>
      </div>

      {/* Active */}
      <Toggle
        checked={f.isActive}
        onChange={(v) => upd("isActive", v)}
        label="Promosi aktif"
      />

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || !f.name.trim()}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Menyimpan..." : "Simpan Promosi"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/merchant/promotions")}
          className="px-5 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
