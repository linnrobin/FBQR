"use client";

/**
 * MenuBundleLayout — Bundle layout renderer.
 *
 * Each item is displayed as a full-width card with:
 *   - 16:7 hero image
 *   - Name, description, dietary badges
 *   - Price display (with optional compare-at-price strikethrough + savings badge)
 *   - Full-width add-to-cart button pinned to the card bottom
 *
 * Categories are rendered as labelled sections (scroll-spy compatible).
 * Category time-window filtering (WIB) applied.
 */

import { useMemo } from "react";
import Image from "next/image";
import { isCategoryAvailable } from "@/lib/menu-time-window";
import type { MenuCategoryData } from "./menu-grid-layout";
import type { MenuItemData } from "./menu-item-card";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  return `Rp ${price.toLocaleString("id-ID")}`;
}

function formatDeposit(item: MenuItemData): string {
  const deposit = item.depositAmount ?? item.price;
  return `Rp ${deposit.toLocaleString("id-ID")} deposit`;
}

// ─── Bundle Card ─────────────────────────────────────────────────────────────

interface BundleCardProps {
  item: MenuItemData;
  isOrderingMode: boolean;
  cartQty: number;
  isBestseller?: boolean;
  onOpenItem: (item: MenuItemData) => void;
}

function BundleCard({ item, isOrderingMode, cartQty, isBestseller = false, onOpenItem }: BundleCardProps) {
  const available = item.effectivelyAvailable && item.isAvailable;
  const isByWeight = item.priceType === "BY_WEIGHT";
  const priceDisplay = isByWeight ? formatDeposit(item) : formatPrice(item.price);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenItem(item)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpenItem(item); }}
      className={`mx-4 rounded-xl overflow-hidden shadow-sm border border-stone-100 bg-white cursor-pointer hover:shadow-md active:scale-[0.99] transition-transform ${
        !available ? "opacity-60" : ""
      }`}
    >
      {/* Hero image — aspect 16:7 */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/7" }}>
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 640px"
          />
        ) : (
          <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-300 text-4xl">
            🍽️
          </div>
        )}
        {!available && (
          <div className="absolute inset-0 bg-stone-900/40 flex items-center justify-center">
            <span className="bg-white text-stone-800 text-sm font-semibold px-4 py-1.5 rounded-full">
              Habis
            </span>
          </div>
        )}
        {/* Bestseller badge */}
        {isBestseller && available && cartQty === 0 && (
          <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow leading-none">
            🔥 Terlaris
          </div>
        )}
        {/* Cart quantity badge */}
        {cartQty > 0 && available && (
          <div className="absolute top-2 right-2 bg-[--color-primary] text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
            {cartQty} di keranjang
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-stone-900 line-clamp-2 leading-snug">
              {item.name}
            </p>
            {item.description && (
              <p className="text-sm text-stone-500 line-clamp-2 mt-1 leading-relaxed">
                {item.description}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            <span className="text-lg font-bold text-[--color-primary] whitespace-nowrap">
              {priceDisplay}
            </span>
            {item.estimatedPrepTime && (
              <span className="text-xs text-stone-400">{item.estimatedPrepTime} mnt</span>
            )}
          </div>
        </div>

        {/* Dietary badges */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          {item.spiceLevel ? (
            <span className="text-sm">{"🌶️".repeat(Math.min(item.spiceLevel, 3))}</span>
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
              ⚠️ Alergen
            </span>
          )}
        </div>
      </div>

      {/* Add button — full width, pinned to card bottom; opens item detail modal */}
      {isOrderingMode && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenItem(item); }}
          className="w-full h-10 bg-[--color-primary] text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          {cartQty > 0
            ? `+ Tambah (${cartQty} di keranjang)`
            : isByWeight
            ? "⚖️ Lihat Detail"
            : "+ Tambah"}
        </button>
      )}
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

interface MenuBundleLayoutProps {
  categories: MenuCategoryData[];
  isOrderingMode: boolean;
  cartQuantities: Map<string, number>;
  bestsellerIds?: Set<string>;
  onOpenItem: (item: MenuItemData) => void;
}

export function MenuBundleLayout({
  categories,
  isOrderingMode,
  cartQuantities,
  bestsellerIds,
  onOpenItem,
}: MenuBundleLayoutProps) {
  const visibleCategories = useMemo(
    () => categories.filter(isCategoryAvailable),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories]
  );

  if (visibleCategories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <p className="text-stone-400 text-sm">Tidak ada menu yang tersedia saat ini.</p>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {visibleCategories.map((cat) => (
        <section key={cat.id} id={`category-${cat.id}`} className="scroll-mt-28">
          <h2 className="text-base font-semibold text-stone-900 px-4 pt-6 pb-3">
            {cat.name}
          </h2>
          {cat.items.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-stone-400 italic">
              Belum ada item di kategori ini.
            </p>
          ) : (
            <div className="space-y-4 pb-4">
              {cat.items.map((item) => (
                <BundleCard
                  key={item.id}
                  item={item}
                  isOrderingMode={isOrderingMode}
                  cartQty={cartQuantities.get(item.id) ?? 0}
                  isBestseller={bestsellerIds?.has(item.id) ?? false}
                  onOpenItem={onOpenItem}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
