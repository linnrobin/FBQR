"use client";

/**
 * MenuListRow — single item row for the List layout.
 * Anatomy: [56×56 image] | name + description + dietary badges | price + add button
 */

import Image from "next/image";
import type { MenuItemData } from "./menu-item-card";
import { Plus } from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(item: MenuItemData): string {
  if (item.priceType === "BY_WEIGHT") {
    const deposit = item.depositAmount ?? item.price;
    return `Rp ${deposit.toLocaleString("id-ID")} deposit`;
  }
  return `Rp ${item.price.toLocaleString("id-ID")}`;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface MenuListRowProps {
  item: MenuItemData;
  isOrderingMode: boolean;
  cartQty: number;
  onOpenItem: (item: MenuItemData) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MenuListRow({ item, isOrderingMode, cartQty, onOpenItem }: MenuListRowProps) {
  const available = item.effectivelyAvailable && item.isAvailable;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenItem(item)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpenItem(item); }}
      className={`flex items-center gap-3 px-4 py-3 border-b border-stone-100 cursor-pointer hover:bg-stone-50 active:bg-stone-100 transition-colors ${
        !available ? "opacity-60" : ""
      }`}
    >
      {/* Image 56×56 */}
      <div className="relative w-14 h-14 rounded-md overflow-hidden flex-shrink-0 bg-stone-100">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover"
            sizes="56px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300 text-lg">
            🍽️
          </div>
        )}
        {!available && (
          <div className="absolute inset-0 bg-stone-200/70 flex items-center justify-center">
            <span className="text-[10px] text-stone-500 font-semibold">Habis</span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-stone-900 line-clamp-1">{item.name}</p>
        {item.description && (
          <p className="text-xs text-stone-500 line-clamp-2 mt-0.5 leading-relaxed">
            {item.description}
          </p>
        )}
        {/* Dietary badges row */}
        <div className="flex items-center flex-wrap gap-1 mt-1">
          {item.spiceLevel ? (
            <span className="text-xs">{"🌶️".repeat(Math.min(item.spiceLevel, 3))}</span>
          ) : null}
          {item.isHalal && (
            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
              Halal
            </span>
          )}
          {item.isVegan && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
              Vegan
            </span>
          )}
          {!item.isVegan && item.isVegetarian && (
            <span className="text-xs bg-lime-100 text-lime-700 px-1.5 py-0.5 rounded-full font-medium">
              Veg
            </span>
          )}
          {item.allergens.length > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
              ⚠️ Alergen
            </span>
          )}
        </div>
      </div>

      {/* Price + Add button */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className="text-sm font-medium text-[--color-primary] whitespace-nowrap">
          {formatPrice(item)}
        </span>
        {isOrderingMode && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenItem(item); }}
            className="h-8 w-8 bg-[--color-primary] text-white rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
            aria-label={`Tambah ${item.name}`}
          >
            {cartQty > 0 ? (
              <span className="text-xs font-bold">{cartQty}</span>
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
