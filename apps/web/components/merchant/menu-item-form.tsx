"use client";

/**
 * Menu item create/edit form.
 * Used by /merchant/menu/items/new and /merchant/menu/items/[itemId]/edit
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, AlertCircle, GripVertical } from "lucide-react";

const ALLERGENS = [
  { value: "nuts", label: "Kacang (Nuts)" },
  { value: "dairy", label: "Dairy" },
  { value: "gluten", label: "Gluten" },
  { value: "seafood", label: "Seafood" },
  { value: "eggs", label: "Eggs" },
  { value: "soy", label: "Soy" },
] as const;

type AllergenValue = (typeof ALLERGENS)[number]["value"];

interface VariantRow {
  id?: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
  sortOrder: number;
  _delete?: boolean;
}

interface AddonRow {
  id?: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
  maxQuantity: number | null;
  sortOrder: number;
  _delete?: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface Station {
  id: string;
  name: string;
}

interface ExistingItem {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  priceType: string;
  pricePerUnit: number | null;
  unitLabel: string | null;
  depositAmount: number | null;
  isAvailable: boolean;
  stockCount: number | null;
  autoResetAvailability: boolean;
  estimatedPrepTime: number | null;
  isHalal: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  allergens: string[];
  spiceLevel: number | null;
  kitchenStationOverride: string | null;
  displayOrder: number;
  variants: VariantRow[];
  addons: AddonRow[];
}

interface Props {
  restaurantId: string;
  categories: Category[];
  stations: Station[];
  item?: ExistingItem;
  defaultCategoryId?: string | undefined;
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-stone-700 mb-1">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${props.className ?? ""}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${props.className ?? ""}`}
    />
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors ${checked ? "bg-orange-500" : "bg-stone-300"}`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`}
        />
      </div>
      <span className="text-sm text-stone-700">{label}</span>
    </label>
  );
}

export function MenuItemForm({ categories, stations, item, defaultCategoryId }: Props) {
  const router = useRouter();
  const isEdit = !!item;

  // Core fields
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? "");
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(item?.price?.toString() ?? "0");
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? "");

  // Price type
  const [priceType, setPriceType] = useState<"FIXED" | "BY_WEIGHT">(
    (item?.priceType as "FIXED" | "BY_WEIGHT") ?? "FIXED"
  );
  const [pricePerUnit, setPricePerUnit] = useState(item?.pricePerUnit?.toString() ?? "");
  const [unitLabel, setUnitLabel] = useState(item?.unitLabel ?? "");
  const [depositAmount, setDepositAmount] = useState(item?.depositAmount?.toString() ?? "");

  // Allergens
  const [allergens, setAllergens] = useState<string[]>(item?.allergens ?? []);

  // Prep time
  const [estimatedPrepTime, setEstimatedPrepTime] = useState(item?.estimatedPrepTime?.toString() ?? "");

  // Dietary
  const [isHalal, setIsHalal] = useState(item?.isHalal ?? false);
  const [isVegetarian, setIsVegetarian] = useState(item?.isVegetarian ?? false);
  const [isVegan, setIsVegan] = useState(item?.isVegan ?? false);
  const [spiceLevel, setSpiceLevel] = useState<number>(item?.spiceLevel ?? 0);

  // Availability
  const [isAvailable, setIsAvailable] = useState(item?.isAvailable ?? true);
  const [autoResetAvailability, setAutoResetAvailability] = useState(item?.autoResetAvailability ?? false);
  const [stockCount, setStockCount] = useState(item?.stockCount?.toString() ?? "");

  // Station override
  const [kitchenStationOverride, setKitchenStationOverride] = useState(
    item?.kitchenStationOverride ?? ""
  );
  const [displayOrder, setDisplayOrder] = useState(item?.displayOrder?.toString() ?? "0");

  // Variants
  const [variants, setVariants] = useState<VariantRow[]>(
    item?.variants?.map((v) => ({ ...v, _delete: false })) ?? []
  );

  // Addons
  const [addons, setAddons] = useState<AddonRow[]>(
    item?.addons?.map((a) => ({ ...a, _delete: false })) ?? []
  );

  // Form state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleAllergen(value: string) {
    setAllergens((prev) =>
      prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value]
    );
  }

  function addVariant() {
    setVariants((prev) => [
      ...prev,
      { name: "", priceDelta: 0, isDefault: false, sortOrder: prev.length },
    ]);
  }

  function updateVariant(index: number, patch: Partial<VariantRow>) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function removeVariant(index: number) {
    setVariants((prev) => {
      const row = prev[index];
      if (!row) return prev;
      if (row.id) {
        return prev.map((v, i) => (i === index ? { ...v, _delete: true } : v));
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  function addAddon() {
    setAddons((prev) => [
      ...prev,
      { name: "", priceDelta: 0, isDefault: false, maxQuantity: null, sortOrder: prev.length },
    ]);
  }

  function updateAddon(index: number, patch: Partial<AddonRow>) {
    setAddons((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  function removeAddon(index: number) {
    setAddons((prev) => {
      const row = prev[index];
      if (!row) return prev;
      if (row.id) {
        return prev.map((a, i) => (i === index ? { ...a, _delete: true } : a));
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError("Nama item wajib diisi"); return; }
    if (!categoryId) { setError("Pilih kategori"); return; }
    const priceNum = parseInt(price, 10);
    if (isNaN(priceNum) || priceNum < 0) { setError("Harga tidak valid"); return; }
    if (autoResetAvailability && stockCount) {
      setError("Auto reset dan stok tidak bisa diaktifkan bersamaan");
      return;
    }
    if (priceType === "BY_WEIGHT" && (!pricePerUnit || !unitLabel)) {
      setError("Harga per satuan dan label satuan wajib diisi untuk item per berat");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        categoryId,
        name: name.trim(),
        description: description || null,
        price: priceNum,
        imageUrl: imageUrl || null,
        priceType,
        pricePerUnit: pricePerUnit ? parseInt(pricePerUnit, 10) : null,
        unitLabel: unitLabel || null,
        depositAmount: depositAmount ? parseInt(depositAmount, 10) : null,
        isAvailable,
        stockCount: stockCount ? parseInt(stockCount, 10) : null,
        autoResetAvailability,
        estimatedPrepTime: estimatedPrepTime ? parseInt(estimatedPrepTime, 10) : null,
        isHalal,
        isVegetarian,
        isVegan,
        allergens,
        spiceLevel: spiceLevel > 0 ? spiceLevel : null,
        kitchenStationOverride: kitchenStationOverride || null,
        displayOrder: parseInt(displayOrder, 10) || 0,
        variants: variants
          .filter((v) => !v._delete || v.id)
          .map((v) => ({
            ...(v.id ? { id: v.id } : {}),
            name: v.name,
            priceDelta: v.priceDelta,
            isDefault: v.isDefault,
            sortOrder: v.sortOrder,
            ...(v._delete ? { _delete: true } : {}),
          })),
        addons: addons
          .filter((a) => !a._delete || a.id)
          .map((a) => ({
            ...(a.id ? { id: a.id } : {}),
            name: a.name,
            priceDelta: a.priceDelta,
            isDefault: a.isDefault,
            maxQuantity: a.maxQuantity,
            sortOrder: a.sortOrder,
            ...(a._delete ? { _delete: true } : {}),
          })),
      };

      const url = isEdit ? `/api/merchant/menu/items/${item.id}` : "/api/merchant/menu/items";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Terjadi kesalahan saat menyimpan");
        return;
      }

      router.push(`/merchant/menu?categoryId=${categoryId}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const activeVariants = variants.filter((v) => !v._delete);
  const activeAddons = addons.filter((a) => !a._delete);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-stone-900">
          {isEdit ? "Edit Item Menu" : "Tambah Item Menu"}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {isEdit ? `Mengedit: ${item.name}` : "Buat item menu baru"}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-6">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Left Column ── */}
          <div className="space-y-5">
            {/* Nama */}
            <div>
              <FieldLabel required>Nama Item</FieldLabel>
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Nasi Goreng Spesial"
                maxLength={100}
              />
            </div>

            {/* Deskripsi */}
            <div>
              <FieldLabel>Deskripsi</FieldLabel>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Tampil di halaman detail item pelanggan"
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              />
            </div>

            {/* Harga */}
            <div>
              <FieldLabel required>Harga</FieldLabel>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm text-stone-500">Rp</span>
                <TextInput
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min={0}
                  step={1000}
                  className="pl-9"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Kategori */}
            <div>
              <FieldLabel required>Kategori</FieldLabel>
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </Select>
            </div>

            {/* Tipe Harga */}
            <div>
              <FieldLabel>Tipe Harga</FieldLabel>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={priceType === "FIXED"}
                    onChange={() => setPriceType("FIXED")}
                    className="accent-orange-500"
                  />
                  <span className="text-sm text-stone-700">Harga Tetap</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={priceType === "BY_WEIGHT"}
                    onChange={() => setPriceType("BY_WEIGHT")}
                    className="accent-orange-500"
                  />
                  <span className="text-sm text-stone-700">Per Berat</span>
                </label>
              </div>
              {priceType === "BY_WEIGHT" && (
                <div className="mt-3 grid grid-cols-2 gap-3 pl-0">
                  <div>
                    <FieldLabel required>Harga per Satuan</FieldLabel>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sm text-stone-500">Rp</span>
                      <TextInput
                        type="number"
                        value={pricePerUnit}
                        onChange={(e) => setPricePerUnit(e.target.value)}
                        min={0}
                        className="pl-9"
                        placeholder="50000"
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel required>Label Satuan</FieldLabel>
                    <TextInput
                      value={unitLabel}
                      onChange={(e) => setUnitLabel(e.target.value)}
                      placeholder="per 100g"
                      maxLength={50}
                    />
                  </div>
                  <div className="col-span-2">
                    <FieldLabel>Deposit</FieldLabel>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sm text-stone-500">Rp</span>
                      <TextInput
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        min={0}
                        className="pl-9"
                        placeholder="0"
                      />
                    </div>
                    <p className="text-xs text-stone-500 mt-1">Dibayar di muka saat checkout, dilunasi setelah ditimbang</p>
                  </div>
                </div>
              )}
            </div>

            {/* Allergens */}
            <div>
              <FieldLabel>Allergen</FieldLabel>
              <div className="grid grid-cols-3 gap-2">
                {ALLERGENS.map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allergens.includes(value)}
                      onChange={() => toggleAllergen(value)}
                      className="accent-orange-500 rounded"
                    />
                    <span className="text-sm text-stone-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Prep time */}
            <div>
              <FieldLabel>Isyarat Persiapan (menit)</FieldLabel>
              <TextInput
                type="number"
                value={estimatedPrepTime}
                onChange={(e) => setEstimatedPrepTime(e.target.value)}
                min={1}
                placeholder="Contoh: 15"
              />
              <p className="text-xs text-stone-500 mt-1">Tampil ke pelanggan sebagai &ldquo;~X menit&rdquo;</p>
            </div>

            {/* Dietary badges */}
            <div className="space-y-2">
              <FieldLabel>Badge Makanan</FieldLabel>
              <Toggle checked={isHalal} onChange={setIsHalal} label="Halal" />
              <Toggle checked={isVegetarian} onChange={setIsVegetarian} label="Vegetarian" />
              <Toggle checked={isVegan} onChange={setIsVegan} label="Vegan" />
            </div>

            {/* Spice level */}
            <div>
              <FieldLabel>Tingkat Kepedasan</FieldLabel>
              <div className="flex gap-3">
                {[
                  { value: 0, label: "Tidak Pedas" },
                  { value: 1, label: "Mild 🌶️" },
                  { value: 2, label: "Sedang 🌶️🌶️" },
                  { value: 3, label: "Pedas 🌶️🌶️🌶️" },
                ].map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={spiceLevel === value}
                      onChange={() => setSpiceLevel(value)}
                      className="accent-orange-500"
                    />
                    <span className="text-sm text-stone-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div className="space-y-3">
              <FieldLabel>Ketersediaan</FieldLabel>
              <Toggle checked={isAvailable} onChange={setIsAvailable} label="Tersedia" />
              <Toggle
                checked={autoResetAvailability}
                onChange={(v) => {
                  setAutoResetAvailability(v);
                  if (v) setStockCount(""); // clear stock if enabling auto reset
                }}
                label="Reset Otomatis Tengah Malam"
              />
              {autoResetAvailability && (
                <p className="text-xs text-stone-500 pl-12">Otomatis tersedia lagi setiap hari tengah malam</p>
              )}
              <div>
                <FieldLabel>Stok</FieldLabel>
                <TextInput
                  type="number"
                  value={stockCount}
                  onChange={(e) => setStockCount(e.target.value)}
                  min={0}
                  placeholder="Kosongkan = tidak terbatas"
                  disabled={autoResetAvailability}
                  className={autoResetAvailability ? "opacity-50 cursor-not-allowed" : ""}
                />
                {autoResetAvailability && (
                  <p className="text-xs text-amber-600 mt-1">Nonaktifkan Auto Reset untuk menggunakan stok</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Right Column ── */}
          <div className="space-y-5">
            {/* Image URL */}
            <div>
              <FieldLabel>Foto Item</FieldLabel>
              <TextInput
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
              />
              <p className="text-xs text-stone-500 mt-1">URL dari Supabase Storage. Maks 800×800px, JPG/PNG/WebP</p>
              {imageUrl && (
                <div className="mt-2 w-24 h-24 rounded-lg overflow-hidden bg-stone-100 border border-stone-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Kitchen station override */}
            {stations.length > 0 && (
              <div>
                <FieldLabel>Stasiun Dapur Override</FieldLabel>
                <Select
                  value={kitchenStationOverride}
                  onChange={(e) => setKitchenStationOverride(e.target.value)}
                >
                  <option value="">Gunakan Kategori</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
                <p className="text-xs text-stone-500 mt-1">Mengabaikan pengaturan stasiun di kategori</p>
              </div>
            )}

            {/* Display order */}
            <div>
              <FieldLabel>Urutan Tampil</FieldLabel>
              <TextInput
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                min={0}
              />
              <p className="text-xs text-stone-500 mt-1">Angka lebih kecil tampil lebih dulu</p>
            </div>

            {/* Variants */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <FieldLabel>Variasi</FieldLabel>
                <button
                  type="button"
                  onClick={addVariant}
                  className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Variasi
                </button>
              </div>
              {activeVariants.length === 0 ? (
                <p className="text-xs text-stone-400 italic">Belum ada variasi</p>
              ) : (
                <div className="space-y-2">
                  {variants.map((v, i) => {
                    if (v._delete) return null;
                    return (
                      <div key={i} className="flex items-center gap-2 p-2 bg-stone-50 rounded-lg border border-stone-200">
                        <GripVertical className="w-3.5 h-3.5 text-stone-300 shrink-0" />
                        <TextInput
                          value={v.name}
                          onChange={(e) => updateVariant(i, { name: e.target.value })}
                          placeholder="Nama variasi"
                          className="flex-1 text-xs py-1"
                        />
                        <div className="relative w-24 shrink-0">
                          <span className="absolute left-2 top-1 text-xs text-stone-400">Rp</span>
                          <TextInput
                            type="number"
                            value={v.priceDelta}
                            onChange={(e) => updateVariant(i, { priceDelta: parseInt(e.target.value) || 0 })}
                            className="pl-7 text-xs py-1"
                            placeholder="0"
                          />
                        </div>
                        <label className="flex items-center gap-1 shrink-0 text-xs text-stone-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={v.isDefault}
                            onChange={(e) => updateVariant(i, { isDefault: e.target.checked })}
                            className="accent-orange-500"
                          />
                          Default
                        </label>
                        <button
                          type="button"
                          onClick={() => removeVariant(i)}
                          className="p-1 text-stone-400 hover:text-red-500 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Addons */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <FieldLabel>Tambahan (Add-ons)</FieldLabel>
                <button
                  type="button"
                  onClick={addAddon}
                  className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Tambahan
                </button>
              </div>
              {activeAddons.length === 0 ? (
                <p className="text-xs text-stone-400 italic">Belum ada tambahan</p>
              ) : (
                <div className="space-y-2">
                  {addons.map((a, i) => {
                    if (a._delete) return null;
                    return (
                      <div key={i} className="flex items-center gap-2 p-2 bg-stone-50 rounded-lg border border-stone-200">
                        <GripVertical className="w-3.5 h-3.5 text-stone-300 shrink-0" />
                        <TextInput
                          value={a.name}
                          onChange={(e) => updateAddon(i, { name: e.target.value })}
                          placeholder="Nama tambahan"
                          className="flex-1 text-xs py-1"
                        />
                        <div className="relative w-20 shrink-0">
                          <span className="absolute left-2 top-1 text-xs text-stone-400">Rp</span>
                          <TextInput
                            type="number"
                            value={a.priceDelta}
                            onChange={(e) => updateAddon(i, { priceDelta: parseInt(e.target.value) || 0 })}
                            className="pl-7 text-xs py-1"
                            placeholder="0"
                          />
                        </div>
                        <div className="relative w-16 shrink-0">
                          <TextInput
                            type="number"
                            value={a.maxQuantity ?? ""}
                            onChange={(e) => updateAddon(i, { maxQuantity: e.target.value ? parseInt(e.target.value) : null })}
                            className="text-xs py-1"
                            placeholder="Maks"
                            min={1}
                          />
                        </div>
                        <label className="flex items-center gap-1 shrink-0 text-xs text-stone-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={a.isDefault}
                            onChange={(e) => updateAddon(i, { isDefault: e.target.checked })}
                            className="accent-orange-500"
                          />
                          Default
                        </label>
                        <button
                          type="button"
                          onClick={() => removeAddon(i)}
                          className="p-1 text-stone-400 hover:text-red-500 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit buttons */}
        <div className="flex gap-3 mt-8 pt-6 border-t border-stone-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 border border-stone-300 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
}
