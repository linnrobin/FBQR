"use client";

/**
 * MenuGridLayout — renders each menu category as a labelled section
 * with a 2–3 column grid of MenuItemCards.
 *
 * Also handles category time-window filtering (WIB, Asia/Jakarta).
 */

import { useMemo } from "react";
import { isCategoryAvailable } from "@/lib/menu-time-window";
import { MenuItemCard, type MenuItemData } from "./menu-item-card";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MenuCategoryData {
  id: string;
  name: string;
  availableFrom: string | null; // "HH:MM"
  availableTo: string | null;   // "HH:MM"
  items: MenuItemData[];
}

interface MenuGridLayoutProps {
  categories: MenuCategoryData[];
  isOrderingMode: boolean;
  cartQuantities: Map<string, number>;
  bestsellerIds?: Set<string>;
  onOpenItem: (item: MenuItemData) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MenuGridLayout({
  categories,
  isOrderingMode,
  cartQuantities,
  bestsellerIds,
  onOpenItem,
}: MenuGridLayoutProps) {
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
          {/* Category heading */}
          <h2 className="text-base font-semibold text-stone-900 px-4 pt-6 pb-3">
            {cat.name}
          </h2>

          {cat.items.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-stone-400 italic">
              Belum ada item di kategori ini.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-4">
              {cat.items.map((item) => (
                <MenuItemCard
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
