"use client";

/**
 * Waiter-Assisted Order Panel.
 * Opened from the floor map when staff taps "Pesan" on a table.
 *
 * Flow:
 *   1. Browse categories + items (same data as apps/menu)
 *   2. Add items to cart (variant/addon picker if needed)
 *   3. Tap [Kirim ke Dapur] → POST /api/merchant/orders
 *
 * Permission required: orders:manage (enforced by the API route).
 * BY_WEIGHT items are shown disabled (API would reject them anyway).
 */
import { useState } from "react";
import { X, Plus, Minus, ShoppingBag, Loader2, AlertCircle, CheckCircle, ChevronLeft } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Variant {
  id: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
}

interface Addon {
  id: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
  maxQuantity: number | null;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  priceType: string;
  imageUrl: string | null;
  isAvailable: boolean;
  variants: Variant[];
  addons: Addon[];
}

interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

interface CartItem {
  key: string; // menuItemId + variantId + addonIds joined
  menuItemId: string;
  name: string;
  unitPrice: number;
  variantId: string | null;
  variantName: string | null;
  addonIds: string[];
  addonNames: string[];
  addonDelta: number;
  quantity: number;
}

interface OrderPanelProps {
  tableId: string;
  tableName: string;
  branchId: string;
  categories: MenuCategory[];
  onClose: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (price: number) => `Rp ${price.toLocaleString("id-ID")}`;

function cartKey(menuItemId: string, variantId: string | null, addonIds: string[]): string {
  return [menuItemId, variantId ?? "", ...[...addonIds].sort()].join("|");
}

// ── Variant / Addon picker modal ───────────────────────────────────────────────

function ItemPickerModal({
  item,
  onConfirm,
  onCancel,
}: {
  item: MenuItem;
  onConfirm: (variantId: string | null, addonIds: string[]) => void;
  onCancel: () => void;
}) {
  const defaultVariant = item.variants.find((v) => v.isDefault) ?? item.variants[0] ?? null;
  const defaultAddons = item.addons.filter((a) => a.isDefault).map((a) => a.id);

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    defaultVariant?.id ?? null
  );
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>(defaultAddons);

  function toggleAddon(addonId: string) {
    setSelectedAddonIds((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  }

  const selectedVariant = item.variants.find((v) => v.id === selectedVariantId);
  const selectedAddons = item.addons.filter((a) => selectedAddonIds.includes(a.id));
  const addonDelta = selectedAddons.reduce((s, a) => s + a.priceDelta, 0);
  const totalUnit = item.price + (selectedVariant?.priceDelta ?? 0) + addonDelta;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 flex-shrink-0">
          <div>
            <p className="font-semibold text-stone-900 text-sm">{item.name}</p>
            <p className="text-xs text-stone-500">{fmt(item.price)}</p>
          </div>
          <button onClick={onCancel} className="text-stone-400 hover:text-stone-600">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {item.variants.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-stone-700 uppercase tracking-wide mb-2">
                Pilih Varian
              </p>
              <div className="space-y-1.5">
                {item.variants.map((v) => (
                  <label
                    key={v.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer ${
                      selectedVariantId === v.id
                        ? "border-orange-400 bg-orange-50"
                        : "border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="variant"
                        checked={selectedVariantId === v.id}
                        onChange={() => setSelectedVariantId(v.id)}
                        className="accent-orange-500"
                      />
                      <span className="text-sm text-stone-800">{v.name}</span>
                    </div>
                    {v.priceDelta !== 0 && (
                      <span className="text-xs text-stone-500">
                        {v.priceDelta > 0 ? "+" : ""}{fmt(v.priceDelta)}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {item.addons.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-stone-700 uppercase tracking-wide mb-2">
                Tambahan
              </p>
              <div className="space-y-1.5">
                {item.addons.map((a) => (
                  <label
                    key={a.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer ${
                      selectedAddonIds.includes(a.id)
                        ? "border-orange-400 bg-orange-50"
                        : "border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedAddonIds.includes(a.id)}
                        onChange={() => toggleAddon(a.id)}
                        className="accent-orange-500"
                      />
                      <span className="text-sm text-stone-800">{a.name}</span>
                    </div>
                    {a.priceDelta !== 0 && (
                      <span className="text-xs text-stone-500">
                        +{fmt(a.priceDelta)}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-stone-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-stone-600">Total per item</span>
            <span className="font-semibold text-stone-900">{fmt(totalUnit)}</span>
          </div>
          <button
            onClick={() => onConfirm(selectedVariantId, selectedAddonIds)}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2.5 text-sm font-medium"
          >
            Tambah ke Pesanan
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Order panel ────────────────────────────────────────────────────────────────

export function OrderPanel({
  tableId,
  tableName,
  branchId,
  categories,
  onClose,
}: OrderPanelProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    categories[0]?.id ?? ""
  );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pickerItem, setPickerItem] = useState<MenuItem | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const activeCategory = categories.find((c) => c.id === activeCategoryId);
  const subtotal = cart.reduce(
    (s, ci) => s + (ci.unitPrice + ci.addonDelta) * ci.quantity,
    0
  );
  const totalItems = cart.reduce((s, ci) => s + ci.quantity, 0);

  function addToCart(
    item: MenuItem,
    variantId: string | null,
    addonIds: string[]
  ) {
    const variant = item.variants.find((v) => v.id === variantId) ?? null;
    const selectedAddons = item.addons.filter((a) => addonIds.includes(a.id));
    const addonDelta = selectedAddons.reduce((s, a) => s + a.priceDelta, 0);
    const key = cartKey(item.id, variantId, addonIds);

    setCart((prev) => {
      const existing = prev.find((ci) => ci.key === key);
      if (existing) {
        return prev.map((ci) =>
          ci.key === key ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [
        ...prev,
        {
          key,
          menuItemId: item.id,
          name: item.name,
          unitPrice: item.price + (variant?.priceDelta ?? 0),
          variantId,
          variantName: variant?.name ?? null,
          addonIds,
          addonNames: selectedAddons.map((a) => a.name),
          addonDelta,
          quantity: 1,
        },
      ];
    });
    setPickerItem(null);
  }

  function handleItemClick(item: MenuItem) {
    if (item.priceType === "BY_WEIGHT") return;
    if (item.variants.length > 0 || item.addons.length > 0) {
      setPickerItem(item);
    } else {
      addToCart(item, null, []);
    }
  }

  function changeQty(key: string, delta: number) {
    setCart((prev) =>
      prev
        .map((ci) => (ci.key === key ? { ...ci, quantity: ci.quantity + delta } : ci))
        .filter((ci) => ci.quantity > 0)
    );
  }

  async function submitOrder() {
    if (cart.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const body = {
        tableId,
        branchId,
        items: cart.map((ci) => ({
          menuItemId: ci.menuItemId,
          quantity: ci.quantity,
          variantId: ci.variantId ?? null,
          addonIds: ci.addonIds,
        })),
        customerNote: note.trim() || null,
      };
      const res = await fetch("/api/merchant/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setSubmitError(data.error ?? "Gagal mengirim pesanan");
        return;
      }
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success screen ──
  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-8 text-center">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
          <h3 className="font-semibold text-stone-900 text-lg mb-2">Pesanan Dikirim!</h3>
          <p className="text-sm text-stone-500 mb-6">
            Pesanan untuk <strong>{tableName}</strong> sudah masuk ke dapur.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2.5 text-sm font-medium"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  // ── Main panel (full-screen overlay, two-column) ──
  return (
    <>
      <div className="fixed inset-0 z-50 bg-stone-50 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-stone-200 flex-shrink-0">
          <button onClick={onClose} className="text-stone-500 hover:text-stone-700">
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-stone-900 truncate">
              Pesan untuk {tableName}
            </p>
            <p className="text-xs text-stone-500">Waiter-assisted order</p>
          </div>
          {totalItems > 0 && (
            <span className="bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </div>

        <div className="flex-1 flex min-h-0">
          {/* ── Left: category tabs + item grid ── */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Category tabs */}
            <div className="flex gap-1.5 px-3 py-2 bg-white border-b border-stone-100 overflow-x-auto flex-shrink-0">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeCategoryId === cat.id
                      ? "bg-orange-500 text-white"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-3">
              {!activeCategory || activeCategory.items.length === 0 ? (
                <p className="text-center text-stone-400 text-sm py-8">
                  Tidak ada item di kategori ini
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {activeCategory.items.map((item) => {
                    const byWeight = item.priceType === "BY_WEIGHT";
                    const inCart = cart.find((ci) => ci.menuItemId === item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        disabled={byWeight || !item.isAvailable}
                        className={`text-left rounded-xl border p-3 transition-colors ${
                          byWeight || !item.isAvailable
                            ? "bg-stone-50 border-stone-100 opacity-50 cursor-not-allowed"
                            : inCart
                            ? "bg-orange-50 border-orange-300"
                            : "bg-white border-stone-200 hover:border-orange-300"
                        }`}
                      >
                        <p className="font-medium text-stone-900 text-xs leading-tight mb-1 line-clamp-2">
                          {item.name}
                        </p>
                        <p className="text-xs text-stone-500">{fmt(item.price)}</p>
                        {byWeight && (
                          <p className="text-[10px] text-amber-600 mt-0.5">Per kg</p>
                        )}
                        {inCart && (
                          <span className="inline-block mt-1 bg-orange-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                            {cart.filter((ci) => ci.menuItemId === item.id).reduce((s, ci) => s + ci.quantity, 0)}×
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Right: cart (hidden on mobile if empty) ── */}
          <div className="w-72 flex-shrink-0 bg-white border-l border-stone-200 flex flex-col hidden sm:flex">
            <div className="px-4 py-3 border-b border-stone-100 flex-shrink-0">
              <p className="font-semibold text-stone-900 flex items-center gap-2">
                <ShoppingBag size={16} />
                Pesanan
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-stone-400 py-8">
                  <ShoppingBag size={32} className="mb-2 opacity-30" />
                  <p className="text-xs">Belum ada item</p>
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {cart.map((ci) => (
                    <div key={ci.key} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-900 truncate">
                            {ci.name}
                          </p>
                          {ci.variantName && (
                            <p className="text-xs text-stone-500">{ci.variantName}</p>
                          )}
                          {ci.addonNames.length > 0 && (
                            <p className="text-xs text-stone-400 truncate">
                              +{ci.addonNames.join(", ")}
                            </p>
                          )}
                          <p className="text-xs text-stone-600 mt-0.5">
                            {fmt((ci.unitPrice + ci.addonDelta) * ci.quantity)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => changeQty(ci.key, -1)}
                            className="w-6 h-6 rounded-full border border-stone-300 flex items-center justify-center text-stone-600 hover:bg-stone-50"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="w-5 text-center text-sm font-medium">
                            {ci.quantity}
                          </span>
                          <button
                            onClick={() => changeQty(ci.key, 1)}
                            className="w-6 h-6 rounded-full border border-stone-300 flex items-center justify-center text-stone-600 hover:bg-stone-50"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart footer */}
            <div className="px-4 py-4 border-t border-stone-200 flex-shrink-0 space-y-3">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Catatan untuk dapur (opsional)…"
                rows={2}
                maxLength={200}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              {submitError && (
                <div className="flex items-center gap-1.5 text-xs text-red-600">
                  <AlertCircle size={13} /> {submitError}
                </div>
              )}
              <button
                onClick={submitOrder}
                disabled={cart.length === 0 || submitting}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><Loader2 size={15} className="animate-spin" /> Mengirim…</>
                ) : (
                  "Kirim ke Dapur"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile cart bar (shown at bottom on small screens) */}
        {cart.length > 0 && (
          <div className="sm:hidden flex-shrink-0 bg-white border-t border-stone-200 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-stone-700">
                {totalItems} item · {fmt(subtotal)}
              </span>
            </div>
            {submitError && (
              <p className="text-xs text-red-600 mb-2 flex items-center gap-1">
                <AlertCircle size={12} /> {submitError}
              </p>
            )}
            <button
              onClick={submitOrder}
              disabled={submitting}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><Loader2 size={15} className="animate-spin" /> Mengirim…</>
              ) : (
                "Kirim ke Dapur"
              )}
            </button>
          </div>
        )}
      </div>

      {pickerItem && (
        <ItemPickerModal
          item={pickerItem}
          onConfirm={(variantId, addonIds) => addToCart(pickerItem, variantId, addonIds)}
          onCancel={() => setPickerItem(null)}
        />
      )}
    </>
  );
}
