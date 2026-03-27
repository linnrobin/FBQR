"use client";

/**
 * ItemDetailContent — scrollable body of the item detail bottom sheet.
 *
 * Renders all 11 spec sections:
 *   1. Full-width 16:9 image (gradient placeholder if absent)
 *   2. Item name (H2)
 *   3. Price (with BY_WEIGHT deposit note)
 *   4. Dietary + allergen badges row
 *   5. Estimated prep time
 *   6. Description (full text, no clamp)
 *   7. Variants section (if any)
 *   8. Add-ons section (if any)
 *   9. Allergen warning box (if any allergens set)
 *  10. Special Request textarea
 *  11. Quantity selector [−] [n] [+]
 */

import Image from "next/image";
import type { MenuItemData } from "./menu-item-card";
import { ItemVariantSelector } from "./item-variant-selector";
import { ItemAddonSelector } from "./item-addon-selector";

// ─── Props ───────────────────────────────────────────────────────────────────

interface ItemDetailContentProps {
  item: MenuItemData;
  selectedVariantId: string | null;
  onVariantChange: (id: string) => void;
  selectedAddons: Map<string, number>;
  onAddonChange: (id: string, qty: number) => void;
  qty: number;
  onQtyChange: (qty: number) => void;
  specialRequest: string;
  onSpecialRequestChange: (value: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ItemDetailContent({
  item,
  selectedVariantId,
  onVariantChange,
  selectedAddons,
  onAddonChange,
  qty,
  onQtyChange,
  specialRequest,
  onSpecialRequestChange,
}: ItemDetailContentProps) {
  const isByWeight = item.priceType === "BY_WEIGHT";

  return (
    <div>
      {/* ── 1. Image ── */}
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: "16/9" }}
      >
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white/60 text-5xl"
            style={{ background: "var(--color-primary, #16a34a)" }}
          >
            🍽️
          </div>
        )}
      </div>

      {/* ── Content padding ── */}
      <div className="px-5 pt-4 pb-4">
        {/* ── 2. Name ── */}
        <h2 className="text-xl font-bold text-stone-900 leading-tight">
          {item.name}
        </h2>

        {/* ── 3. Price ── */}
        {isByWeight ? (
          <div className="mt-1.5">
            <p className="text-base font-semibold text-[--color-primary]">
              Deposit Rp{" "}
              {(item.depositAmount ?? item.price).toLocaleString("id-ID")}
            </p>
            <p className="text-xs text-stone-400 mt-0.5">
              (harga akhir ditentukan setelah ditimbang)
            </p>
          </div>
        ) : (
          <p className="text-base font-semibold text-[--color-primary] mt-1.5">
            Rp {item.price.toLocaleString("id-ID")}
          </p>
        )}

        {/* ── 4. Dietary + spice badges row ── */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          {item.spiceLevel ? (
            <span className="text-sm">
              {"🌶️".repeat(Math.min(item.spiceLevel, 3))}
            </span>
          ) : null}
          {item.isHalal && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              Halal ✓
            </span>
          )}
          {item.isVegan && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
              Vegan 🌱
            </span>
          )}
          {!item.isVegan && item.isVegetarian && (
            <span className="text-xs bg-lime-100 text-lime-700 px-2 py-0.5 rounded-full font-medium">
              Vegetarian 🌿
            </span>
          )}
          {item.allergens.length > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              ⚠️ Mengandung Alergen
            </span>
          )}
        </div>

        {/* ── 5. Estimated prep time ── */}
        {item.estimatedPrepTime && (
          <p className="text-xs text-stone-500 mt-2">
            ⏱ ~{item.estimatedPrepTime} menit
          </p>
        )}

        {/* ── 6. Description ── */}
        {item.description && (
          <p className="text-sm text-stone-600 leading-relaxed mt-3">
            {item.description}
          </p>
        )}

        {/* ── 7. Variants ── */}
        {item.variants.length > 0 && (
          <div className="mt-5 border-t border-stone-100 pt-4">
            <ItemVariantSelector
              variants={item.variants}
              selectedId={selectedVariantId}
              onChange={onVariantChange}
            />
          </div>
        )}

        {/* ── 8. Add-ons ── */}
        {item.addons.length > 0 && (
          <div className="mt-5 border-t border-stone-100 pt-4">
            <ItemAddonSelector
              addons={item.addons}
              selectedMap={selectedAddons}
              onChange={onAddonChange}
            />
          </div>
        )}

        {/* ── 9. Allergen warning box ── */}
        {item.allergens.length > 0 && (
          <div className="mt-5 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            <p className="text-xs text-amber-800 leading-relaxed">
              ⚠️{" "}
              <span className="font-medium">Mengandung alergen:</span>{" "}
              {item.allergens.join(", ")}
            </p>
          </div>
        )}

        {/* ── 10. Special Request ── */}
        <div className="mt-5">
          <textarea
            value={specialRequest}
            onChange={(e) => onSpecialRequestChange(e.target.value)}
            placeholder="Catatan khusus... (contoh: tidak pedas, tanpa bawang)"
            maxLength={200}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-stone-200 rounded-[--border-radius] text-stone-800 placeholder:text-stone-400 resize-none focus:outline-none focus:border-[--color-primary] transition-colors bg-white"
          />
          {specialRequest.length > 160 && (
            <p className="text-right text-xs text-stone-400 mt-0.5">
              {specialRequest.length}/200
            </p>
          )}
        </div>

        {/* ── 11. Quantity selector ── */}
        <div className="mt-5 flex items-center justify-center gap-5">
          <button
            type="button"
            onClick={() => onQtyChange(Math.max(1, qty - 1))}
            disabled={qty <= 1}
            className="w-10 h-10 rounded-full border-2 border-stone-200 flex items-center justify-center text-stone-700 text-xl hover:border-stone-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Kurangi jumlah"
          >
            −
          </button>
          <span className="text-lg font-bold text-stone-900 w-8 text-center">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => onQtyChange(qty + 1)}
            className="w-10 h-10 rounded-full border-2 border-stone-200 flex items-center justify-center text-stone-700 text-xl hover:border-stone-400 transition-colors"
            aria-label="Tambah jumlah"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
