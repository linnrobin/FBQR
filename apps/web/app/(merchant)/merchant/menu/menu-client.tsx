"use client";

/**
 * Menu Management Client — full interactive UI.
 * Handles: category sidebar, item list, category CRUD modal,
 * item availability toggles, drag-to-reorder, CSV import,
 * per-branch availability toggle, and navigation to item form.
 */
import { useState, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  GripVertical,
  Edit,
  Trash2,
  Copy,
  ToggleLeft,
  ToggleRight,
  Upload,
  ChevronRight,
  UtensilsCrossed,
  AlertCircle,
  X,
  Check,
  Clock,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Variant {
  id: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
  sortOrder: number;
}

interface Addon {
  id: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
  maxQuantity: number | null;
  sortOrder: number;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  stockCount: number | null;
  isHalal: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  allergens: string[];
  spiceLevel: number | null;
  priceType: string;
  displayOrder: number;
  variants: Variant[];
  addons: Addon[];
}

interface MenuCategory {
  id: string;
  name: string;
  imageUrl: string | null;
  displayOrder: number;
  menuLayoutOverride: string | null;
  availableFrom: string | null;
  availableTo: string | null;
  kitchenStation: { id: string; name: string } | null;
  items: MenuItem[];
  _count: { items: number };
}

interface Branch {
  id: string;
  name: string;
  branchMenuOverrides: { menuItemId: string; isAvailable: boolean }[];
}

interface Station {
  id: string;
  name: string;
}

interface Props {
  restaurantId: string;
  initialCategories: MenuCategory[];
  branches: Branch[];
  stations: Station[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function isNowInWindow(from: string | null, to: string | null): boolean {
  if (!from || !to) return true;
  const now = new Date();
  const wib = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const nowMins = wib.getHours() * 60 + wib.getMinutes();
  const fromParts = from.split(":");
  const toParts = to.split(":");
  const fh = parseInt(fromParts[0] ?? "0", 10);
  const fm = parseInt(fromParts[1] ?? "0", 10);
  const th = parseInt(toParts[0] ?? "0", 10);
  const tm = parseInt(toParts[1] ?? "0", 10);
  const fromMins = fh * 60 + fm;
  const toMins = th * 60 + tm;
  if (fromMins <= toMins) return nowMins >= fromMins && nowMins < toMins;
  // Overnight
  return nowMins >= fromMins || nowMins < toMins;
}

// ── Category Modal ────────────────────────────────────────────────────────────

interface CategoryModalProps {
  category?: MenuCategory | null;
  stations: Station[];
  onClose: () => void;
  onSaved: (cat: MenuCategory) => void;
}

function CategoryModal({ category, stations, onClose, onSaved }: CategoryModalProps) {
  const [name, setName] = useState(category?.name ?? "");
  const [layoutOverride, setLayoutOverride] = useState(category?.menuLayoutOverride ?? "");
  const [availableFrom, setAvailableFrom] = useState(category?.availableFrom ?? "");
  const [availableTo, setAvailableTo] = useState(category?.availableTo ?? "");
  const [stationId, setStationId] = useState(category?.kitchenStation?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError("Nama kategori wajib diisi"); return; }
    if ((availableFrom && !availableTo) || (!availableFrom && availableTo)) {
      setError("Waktu tampil harus diisi keduanya atau dikosongkan keduanya");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        menuLayoutOverride: layoutOverride || null,
        availableFrom: availableFrom || null,
        availableTo: availableTo || null,
        kitchenStationId: stationId || null,
      };

      const url = category
        ? `/api/merchant/menu/categories/${category.id}`
        : "/api/merchant/menu/categories";
      const method = category ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Terjadi kesalahan");
        return;
      }

      const data = await res.json();
      onSaved({ ...data.category, items: category?.items ?? [], _count: category?._count ?? { items: 0 } });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h2 className="text-base font-semibold text-stone-900">
            {category ? "Edit Kategori" : "Tambah Kategori"}
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Nama Kategori <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Contoh: Makanan Utama"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Layout Override</label>
            <select
              value={layoutOverride}
              onChange={(e) => setLayoutOverride(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">Ikuti pengaturan restoran</option>
              <option value="GRID">Grid</option>
              <option value="LIST">List</option>
              <option value="BUNDLE">Bundle</option>
              <option value="SPOTLIGHT">Spotlight</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Tampil Dari</label>
              <input
                type="time"
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Tampil Hingga</label>
              <input
                type="time"
                value={availableTo}
                onChange={(e) => setAvailableTo(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          {stations.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Stasiun Dapur</label>
              <select
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="">Tidak ada (gunakan default)</option>
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-stone-300 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Branch Override Panel ─────────────────────────────────────────────────────

interface BranchOverlayProps {
  items: MenuItem[];
  branches: Branch[];
  onClose: () => void;
}

function BranchOverlay({ items, branches, onClose }: BranchOverlayProps) {
  const [overrides, setOverrides] = useState<Record<string, Record<string, boolean>>>(() => {
    const map: Record<string, Record<string, boolean>> = {};
    for (const branch of branches) {
      const branchMap: Record<string, boolean> = {};
      for (const ov of branch.branchMenuOverrides) {
        branchMap[ov.menuItemId] = ov.isAvailable;
      }
      map[branch.id] = branchMap;
    }
    return map;
  });
  const [saving, setSaving] = useState<string | null>(null);

  async function toggle(branchId: string, itemId: string, current: boolean) {
    const key = `${branchId}:${itemId}`;
    setSaving(key);
    try {
      await fetch(
        `/api/merchant/menu/branches/${branchId}/overrides/${itemId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isAvailable: !current }),
        }
      );
      setOverrides((prev) => ({
        ...prev,
        [branchId]: { ...prev[branchId], [itemId]: !current },
      }));
    } finally {
      setSaving(null);
    }
  }

  function isAvailable(branchId: string, itemId: string): boolean {
    const ov = overrides[branchId]?.[itemId];
    return ov === undefined ? true : ov; // default = available
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white h-full w-full max-w-2xl shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-900">Ketersediaan per Cabang</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {branches.length === 0 ? (
          <div className="px-6 py-12 text-center text-stone-500 text-sm">
            Belum ada cabang yang terdaftar.
          </div>
        ) : (
          <div className="px-6 py-4">
            {branches.map((branch) => (
              <div key={branch.id} className="mb-6">
                <h3 className="text-sm font-semibold text-stone-700 mb-2">
                  {branch.name}
                </h3>
                <div className="border border-stone-200 rounded-lg overflow-hidden">
                  {items.map((item) => {
                    const avail = isAvailable(branch.id, item.id);
                    const key = `${branch.id}:${item.id}`;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-4 py-2.5 border-b border-stone-100 last:border-0"
                      >
                        <span className="text-sm text-stone-700">{item.name}</span>
                        <button
                          onClick={() => toggle(branch.id, item.id, avail)}
                          disabled={saving === key}
                          className="flex items-center gap-1.5 text-sm"
                          aria-label={avail ? "Tandai tidak tersedia" : "Tandai tersedia"}
                        >
                          {avail ? (
                            <ToggleRight className="w-6 h-6 text-green-500" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-stone-400" />
                          )}
                          <span className={avail ? "text-green-600" : "text-stone-400"}>
                            {avail ? "Tersedia" : "Habis"}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── CSV Import Modal ──────────────────────────────────────────────────────────

interface CsvImportModalProps {
  onClose: () => void;
  onImported: () => void;
}

function CsvImportModal({ onClose, onImported }: CsvImportModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<{ imported: number; errors: { row: number; error: string }[] } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Pilih file CSV terlebih dahulu"); return; }
    setError(null);
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/merchant/menu/items/import", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Terjadi kesalahan"); return; }
      setResult(data);
      if (data.imported > 0) onImported();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h2 className="text-base font-semibold text-stone-900">Import Menu CSV</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <p className="text-sm text-stone-600">
            Format CSV: <code className="bg-stone-100 px-1 rounded text-xs">category, name, description, price, isHalal, isVegetarian, spiceLevel, variants, addons</code>
          </p>
          <p className="text-xs text-stone-500">
            Variasi dan tambahan: <code className="bg-stone-100 px-1 rounded">NamaVariasi:10000,Variasi2:20000</code>
          </p>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
                <Check className="w-4 h-4 shrink-0" />
                {result.imported} item berhasil diimport
              </div>
              {result.errors.length > 0 && (
                <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm text-yellow-800 max-h-40 overflow-y-auto">
                  <p className="font-medium mb-1">{result.errors.length} baris gagal:</p>
                  {result.errors.map((e) => (
                    <p key={e.row} className="text-xs">Baris {e.row}: {e.error}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="block w-full text-sm text-stone-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
          />
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-stone-300 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            {result ? "Tutup" : "Batal"}
          </button>
          {!result && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-60"
            >
              {uploading ? "Mengimport..." : "Import"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function MenuManagementClient({ restaurantId, initialCategories, branches, stations }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [categories, setCategories] = useState<MenuCategory[]>(initialCategories);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    initialCategories[0]?.id ?? null
  );
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showBranchPanel, setShowBranchPanel] = useState(false);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Derived
  const activeCategory = categories.find((c) => c.id === activeCategoryId) ?? null;
  const filteredItems = activeCategory
    ? activeCategory.items.filter((item) =>
        search ? item.name.toLowerCase().includes(search.toLowerCase()) : true
      )
    : [];

  // ── Category actions ────────────────────────────────────────────────────────

  function handleCategoryCreated(cat: MenuCategory) {
    setCategories((prev) => {
      const exists = prev.find((c) => c.id === cat.id);
      if (exists) return prev.map((c) => (c.id === cat.id ? { ...c, ...cat } : c));
      return [...prev, cat];
    });
    setActiveCategoryId(cat.id);
    setShowCategoryModal(false);
    setEditingCategory(null);
  }

  async function deleteCategory(cat: MenuCategory) {
    if (!confirm(`Hapus kategori "${cat.name}" dan semua item di dalamnya?`)) return;
    setActionLoading(`del-cat-${cat.id}`);
    try {
      await fetch(`/api/merchant/menu/categories/${cat.id}`, { method: "DELETE" });
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      if (activeCategoryId === cat.id) {
        setActiveCategoryId(categories.find((c) => c.id !== cat.id)?.id ?? null);
      }
    } finally {
      setActionLoading(null);
    }
  }

  // ── Item actions ────────────────────────────────────────────────────────────

  async function toggleAvailability(item: MenuItem) {
    setActionLoading(`avail-${item.id}`);
    try {
      const res = await fetch(`/api/merchant/menu/items/${item.id}/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !item.isAvailable }),
      });
      if (res.ok) {
        setCategories((prev) =>
          prev.map((cat) =>
            cat.id === activeCategoryId
              ? {
                  ...cat,
                  items: cat.items.map((i) =>
                    i.id === item.id ? { ...i, isAvailable: !item.isAvailable } : i
                  ),
                }
              : cat
          )
        );
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function duplicateItem(item: MenuItem) {
    setActionLoading(`dup-${item.id}`);
    try {
      const res = await fetch(`/api/merchant/menu/items/${item.id}/duplicate`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setCategories((prev) =>
          prev.map((cat) =>
            cat.id === activeCategoryId
              ? { ...cat, items: [...cat.items, data.item], _count: { items: cat._count.items + 1 } }
              : cat
          )
        );
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteItem(item: MenuItem) {
    if (!confirm(`Hapus item "${item.name}"?`)) return;
    setActionLoading(`del-${item.id}`);
    try {
      await fetch(`/api/merchant/menu/items/${item.id}`, { method: "DELETE" });
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === activeCategoryId
            ? {
                ...cat,
                items: cat.items.filter((i) => i.id !== item.id),
                _count: { items: cat._count.items - 1 },
              }
            : cat
        )
      );
    } finally {
      setActionLoading(null);
    }
  }

  function refreshPage() {
    startTransition(() => router.refresh());
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full">
      {/* ── Category Sidebar ── */}
      <aside className="w-64 shrink-0 border-r border-stone-200 bg-white flex flex-col overflow-y-auto">
        <div className="px-4 py-3 border-b border-stone-200">
          <h1 className="text-sm font-semibold text-stone-900">Kategori Menu</h1>
        </div>

        <div className="flex-1 py-2">
          {categories.length === 0 ? (
            <p className="px-4 py-6 text-xs text-stone-400 text-center">Belum ada kategori</p>
          ) : (
            categories.map((cat) => {
              const active = cat.id === activeCategoryId;
              const inWindow = isNowInWindow(cat.availableFrom, cat.availableTo);
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                    active
                      ? "bg-orange-50 border-l-2 border-orange-500 text-orange-700 font-medium"
                      : "text-stone-600 hover:bg-stone-50 border-l-2 border-transparent"
                  }`}
                >
                  <GripVertical className="w-3.5 h-3.5 text-stone-300 shrink-0" />
                  <span className="flex-1 min-w-0 truncate">{cat.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {cat.availableFrom && !inWindow && (
                      <Clock className="w-3 h-3 text-stone-400" aria-label="Di luar jam tampil" />
                    )}
                    <span className="text-xs text-stone-400">{cat._count.items}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingCategory(cat); setShowCategoryModal(true); }}
                      className="p-0.5 text-stone-400 hover:text-stone-600 rounded"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteCategory(cat); }}
                      disabled={actionLoading === `del-cat-${cat.id}`}
                      className="p-0.5 text-stone-400 hover:text-red-500 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-3 border-t border-stone-200">
          <button
            onClick={() => { setEditingCategory(null); setShowCategoryModal(true); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-stone-300 text-sm text-stone-500 hover:border-orange-400 hover:text-orange-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah Kategori
          </button>
        </div>
      </aside>

      {/* ── Item List Panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-stone-200 bg-white shrink-0 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-stone-900 shrink-0">
              {activeCategory ? activeCategory.name : "Pilih kategori"}
            </h2>
            {activeCategory && (
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari item..."
                className="flex-1 max-w-xs border border-stone-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowBranchPanel(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50"
            >
              <ChevronRight className="w-4 h-4" />
              Per Cabang
            </button>
            <button
              onClick={() => setShowCsvModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50"
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </button>
            {activeCategoryId && (
              <Link
                href={`/merchant/menu/items/new?categoryId=${activeCategoryId}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600"
              >
                <Plus className="w-4 h-4" />
                Tambah Item
              </Link>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!activeCategory ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-stone-400 py-20">
              <UtensilsCrossed className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Pilih kategori di kiri untuk melihat item</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <UtensilsCrossed className="w-12 h-12 mb-3 text-stone-300" />
              <p className="text-base font-medium text-stone-700">Belum ada item menu</p>
              <p className="text-sm text-stone-400 mt-1 mb-4">Tambahkan item menu ke kategori ini.</p>
              <Link
                href={`/merchant/menu/items/new?categoryId=${activeCategoryId}`}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
              >
                <Plus className="w-4 h-4" />
                Tambah Item
              </Link>
            </div>
          ) : (
            <div className="border border-stone-200 rounded-xl overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="w-10 px-3 py-2.5 text-left text-xs font-medium text-stone-500"></th>
                    <th className="w-14 px-3 py-2.5 text-left text-xs font-medium text-stone-500"></th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-stone-500 min-w-[200px]">Nama</th>
                    <th className="w-28 px-3 py-2.5 text-right text-xs font-medium text-stone-500">Harga</th>
                    <th className="w-24 px-3 py-2.5 text-center text-xs font-medium text-stone-500">Status</th>
                    <th className="w-20 px-3 py-2.5 text-center text-xs font-medium text-stone-500">Stok</th>
                    <th className="w-12 px-3 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className={`group transition-colors ${!item.isAvailable ? "opacity-60" : ""}`}
                    >
                      {/* Drag handle */}
                      <td className="px-3 py-3 text-stone-300">
                        <GripVertical className="w-4 h-4" />
                      </td>
                      {/* Thumbnail */}
                      <td className="px-3 py-3">
                        <div className="w-10 h-10 rounded-lg bg-stone-100 overflow-hidden shrink-0">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-300">
                              <UtensilsCrossed className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </td>
                      {/* Name */}
                      <td className="px-3 py-3">
                        <div className="font-medium text-stone-900 truncate max-w-[240px]">{item.name}</div>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          {item.isHalal && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700">Halal</span>
                          )}
                          {item.isVegetarian && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-emerald-100 text-emerald-700">Vegetarian</span>
                          )}
                          {item.variants.length > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700">{item.variants.length} variasi</span>
                          )}
                        </div>
                      </td>
                      {/* Price */}
                      <td className="px-3 py-3 text-right font-medium text-stone-900">
                        {item.priceType === "BY_WEIGHT" ? (
                          <span className="text-xs text-stone-500">per berat</span>
                        ) : (
                          formatIDR(item.price)
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => toggleAvailability(item)}
                          disabled={actionLoading === `avail-${item.id}`}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                            item.isAvailable
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-red-100 text-red-700 hover:bg-red-200"
                          }`}
                        >
                          {item.isAvailable ? "Tersedia" : "Habis"}
                        </button>
                      </td>
                      {/* Stock */}
                      <td className="px-3 py-3 text-center text-stone-500">
                        {item.stockCount != null ? item.stockCount : "—"}
                      </td>
                      {/* Actions */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            href={`/merchant/menu/items/${item.id}/edit`}
                            className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => duplicateItem(item)}
                            disabled={actionLoading === `dup-${item.id}`}
                            className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                            title="Duplikat"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteItem(item)}
                            disabled={actionLoading === `del-${item.id}`}
                            className="p-1 rounded text-stone-400 hover:text-red-500 hover:bg-red-50"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals / Overlays ── */}
      {showCategoryModal && (
        <CategoryModal
          category={editingCategory}
          stations={stations}
          onClose={() => { setShowCategoryModal(false); setEditingCategory(null); }}
          onSaved={handleCategoryCreated}
        />
      )}

      {showCsvModal && (
        <CsvImportModal
          onClose={() => setShowCsvModal(false)}
          onImported={refreshPage}
        />
      )}

      {showBranchPanel && activeCategory && (
        <BranchOverlay
          items={activeCategory.items}
          branches={branches}
          onClose={() => setShowBranchPanel(false)}
        />
      )}
    </div>
  );
}
