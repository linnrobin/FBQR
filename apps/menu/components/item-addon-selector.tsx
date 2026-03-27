"use client";

/**
 * ItemAddonSelector — multi-select checkbox chip list for optional add-ons.
 * Used inside the item detail modal (bottom sheet).
 *
 * - When maxQuantity = null or 1: simple toggle (checked/unchecked)
 * - When maxQuantity > 1: shows [−] [qty] [+] controls when selected
 */

import type { MenuItemAddon } from "./menu-item-card";

// ─── Props ───────────────────────────────────────────────────────────────────

interface ItemAddonSelectorProps {
  addons: MenuItemAddon[];
  /** addonId → qty; key absent or 0 = not selected */
  selectedMap: Map<string, number>;
  onChange: (id: string, qty: number) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDelta(delta: number): string {
  if (delta === 0) return "Gratis";
  const abs = `Rp ${Math.abs(delta).toLocaleString("id-ID")}`;
  return delta > 0 ? `+${abs}` : `-${abs}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ItemAddonSelector({
  addons,
  selectedMap,
  onChange,
}: ItemAddonSelectorProps) {
  if (addons.length === 0) return null;

  return (
    <div>
      <p className="text-sm font-semibold text-stone-900 mb-2">
        Tambahan{" "}
        <span className="text-xs text-stone-400 font-normal">(Opsional)</span>
      </p>
      <div className="space-y-2">
        {addons.map((addon) => {
          const qty = selectedMap.get(addon.id) ?? 0;
          const isSelected = qty > 0;
          const maxQty = addon.maxQuantity ?? 1;

          return (
            <div
              key={addon.id}
              onClick={() => {
                if (maxQty === 1) {
                  onChange(addon.id, isSelected ? 0 : 1);
                } else if (!isSelected) {
                  // First click selects with qty=1
                  onChange(addon.id, 1);
                }
              }}
              className={`flex items-center gap-3 p-3 rounded-[--border-radius] border cursor-pointer transition-colors ${
                isSelected
                  ? "border-[--color-primary] bg-[--color-primary]/5"
                  : "border-stone-200 bg-white hover:border-stone-300"
              }`}
            >
              {/* Checkbox */}
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                  isSelected
                    ? "bg-[--color-primary] border-[--color-primary]"
                    : "border-stone-300 bg-white"
                }`}
              >
                {isSelected && (
                  <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>

              {/* Name + price */}
              <div className="flex-1 min-w-0">
                <span className="text-sm text-stone-800">{addon.name}</span>
                <span className="ml-2 text-xs text-stone-500">
                  {formatDelta(addon.priceDelta)}
                </span>
              </div>

              {/* Qty controls (only shown when maxQuantity > 1 and selected) */}
              {maxQty > 1 && isSelected && (
                <div
                  className="flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onChange(addon.id, Math.max(0, qty - 1))}
                    className="w-7 h-7 rounded-full border border-stone-200 flex items-center justify-center text-stone-600 hover:border-stone-400 text-base leading-none"
                    aria-label="Kurangi"
                  >
                    −
                  </button>
                  <span className="text-sm font-medium w-5 text-center text-stone-900">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => onChange(addon.id, Math.min(maxQty, qty + 1))}
                    className="w-7 h-7 rounded-full border border-stone-200 flex items-center justify-center text-stone-600 hover:border-stone-400 text-base leading-none"
                    aria-label="Tambah"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
