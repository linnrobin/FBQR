"use client";

/**
 * MenuItemCard — single item tile for the Grid layout.
 * Handles: image, dietary badges, spice level, price, availability, [+ Tambah] button.
 */

import Image from "next/image";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MenuItemVariant {
  id: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
  sortOrder: number;
}

export interface MenuItemAddon {
  id: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
  maxQuantity: number | null;
  sortOrder: number;
}

export interface MenuItemData {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  priceType: string;
  depositAmount: number | null;
  isAvailable: boolean;
  stockCount: number | null;
  isHalal: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  allergens: string[];
  spiceLevel: number | null;
  estimatedPrepTime: number | null;
  /** Effective availability after BranchMenuOverride. */
  effectivelyAvailable: boolean;
  variants: MenuItemVariant[];
  addons: MenuItemAddon[];
}

interface MenuItemCardProps {
  item: MenuItemData;
  /** isOrderingMode=false → hide add button (shareable browse-only mode) */
  isOrderingMode: boolean;
  cartQty: number;
  /** Opens the item detail modal for variant/add-on selection */
  onOpenItem: (item: MenuItemData) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(item: MenuItemData): string {
  if (item.priceType === "BY_WEIGHT") {
    const deposit = item.depositAmount ?? item.price;
    return `Rp ${deposit.toLocaleString("id-ID")} deposit`;
  }
  return `Rp ${item.price.toLocaleString("id-ID")}`;
}

function SpiceBadge({ level }: { level: number }) {
  if (level <= 0) return null;
  const chilis = "🌶️".repeat(Math.min(level, 3));
  return <span className="text-xs">{chilis}</span>;
}

function DietaryBadges({ item }: { item: MenuItemData }) {
  const badges: React.ReactNode[] = [];
  if (item.isHalal)
    badges.push(
      <span key="halal" className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
        Halal ✓
      </span>
    );
  if (item.isVegan)
    badges.push(
      <span key="vegan" className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
        Vegan 🌱
      </span>
    );
  else if (item.isVegetarian)
    badges.push(
      <span key="veg" className="text-xs bg-lime-100 text-lime-700 px-1.5 py-0.5 rounded-full font-medium">
        Vegetarian 🌿
      </span>
    );
  if (item.allergens.length > 0)
    badges.push(
      <span key="allergen" className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
        ⚠️ Alergen
      </span>
    );
  return badges.length > 0 ? (
    <div className="flex flex-wrap gap-1 mt-1.5">{badges}</div>
  ) : null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MenuItemCard({
  item,
  isOrderingMode,
  cartQty,
  onOpenItem,
}: MenuItemCardProps) {
  const available = item.effectivelyAvailable && item.isAvailable;
  const isByWeight = item.priceType === "BY_WEIGHT";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenItem(item)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpenItem(item); }}
      className={`bg-white rounded-[--border-radius] shadow-sm overflow-hidden flex flex-col transition-opacity cursor-pointer hover:shadow-md active:scale-[0.98] transition-transform ${
        available ? "" : "opacity-60"
      }`}
    >
      {/* Image */}
      <div className="relative aspect-square bg-stone-100">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300 text-3xl">
            🍽️
          </div>
        )}
        {!available && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-stone-200 text-stone-500 text-xs font-semibold px-3 py-1 rounded-full">
              Habis
            </span>
          </div>
        )}
        {/* Bestseller badge — placeholder for Step 23 AI integration */}
        {cartQty > 0 && available && (
          <div className="absolute top-0 right-0 bg-[--color-primary] text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-bl-[--border-radius-sm]">
            {cartQty}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1 gap-1">
        <p className="text-sm font-semibold text-stone-900 line-clamp-2 leading-tight">
          {item.name}
        </p>

        {item.spiceLevel ? <SpiceBadge level={item.spiceLevel} /> : null}

        <div className="flex items-center gap-1 mt-auto pt-1">
          <span className="text-sm font-semibold text-[--color-primary] flex-1">
            {formatPrice(item)}
          </span>
          {item.estimatedPrepTime && (
            <span className="text-xs text-stone-400">{item.estimatedPrepTime}m</span>
          )}
        </div>

        <DietaryBadges item={item} />

        {/* Add button — opens item detail modal */}
        {isOrderingMode && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenItem(item); }}
            className="mt-2 w-full h-8 bg-[--color-primary] hover:opacity-90 text-white text-sm font-semibold rounded-[--border-radius-sm] transition-opacity"
          >
            {cartQty > 0 ? `+ Tambah (${cartQty})` : isByWeight ? "⚖️ Lihat Detail" : "+ Tambah"}
          </button>
        )}
      </div>
    </div>
  );
}
