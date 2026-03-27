"use client";

/**
 * MenuListLayout — List layout renderer.
 *
 * Features:
 *   - Full-width search bar below the sticky category tabs
 *   - Horizontal scrollable category filter chips (hidden while searching)
 *   - When search is empty: items grouped into category sections (scroll-spy compatible)
 *   - When search is active: flat filtered result list
 *   - Category time-window filtering (WIB)
 */

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { isCategoryAvailable } from "@/lib/menu-time-window";
import { MenuListRow } from "./menu-list-row";
import type { MenuCategoryData } from "./menu-grid-layout";
import type { MenuItemData } from "./menu-item-card";

// ─── Props ───────────────────────────────────────────────────────────────────

interface MenuListLayoutProps {
  categories: MenuCategoryData[];
  isOrderingMode: boolean;
  cartQuantities: Map<string, number>;
  onOpenItem: (item: MenuItemData) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MenuListLayout({
  categories,
  isOrderingMode,
  cartQuantities,
  onOpenItem,
}: MenuListLayoutProps) {
  const [search, setSearch] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);

  // Filter categories by time window
  const visibleCategories = useMemo(
    () => categories.filter(isCategoryAvailable),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories]
  );

  // Flat item list with category metadata (for search results)
  const allItems = useMemo(
    () =>
      visibleCategories.flatMap((cat) =>
        cat.items.map((item) => ({ ...item, categoryId: cat.id, categoryName: cat.name }))
      ),
    [visibleCategories]
  );

  // Filtered items (search or category chip)
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) {
      return allItems.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.description?.toLowerCase().includes(q) ?? false)
      );
    }
    if (activeCategoryFilter) {
      return allItems.filter((item) => item.categoryId === activeCategoryFilter);
    }
    return null; // null = show category sections
  }, [allItems, search, activeCategoryFilter]);

  if (visibleCategories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <p className="text-stone-400 text-sm">Tidak ada menu yang tersedia saat ini.</p>
      </div>
    );
  }

  const isFiltering = filteredItems !== null;

  return (
    <div className="pb-24">
      {/* Search bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="search"
            placeholder="Cari menu..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActiveCategoryFilter(null);
            }}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-stone-200 bg-white text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[--color-primary] transition-colors"
          />
        </div>
      </div>

      {/* Category filter chips — hidden while searching */}
      {!search.trim() && (
        <div
          className="overflow-x-auto scrollbar-hide"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="flex gap-2 px-4 pb-3 min-w-max">
            <button
              type="button"
              onClick={() => setActiveCategoryFilter(null)}
              className={`h-8 px-4 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategoryFilter === null
                  ? "bg-[--color-primary] text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              Semua
            </button>
            {visibleCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  setActiveCategoryFilter(
                    cat.id === activeCategoryFilter ? null : cat.id
                  )
                }
                className={`h-8 px-4 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategoryFilter === cat.id
                    ? "bg-[--color-primary] text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Item list */}
      {isFiltering ? (
        /* Flat filtered list (search or category chip active) */
        filteredItems!.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <p className="text-stone-400 text-sm">Tidak ada menu yang ditemukan.</p>
          </div>
        ) : (
          <div>
            {filteredItems!.map((item) => (
              <MenuListRow
                key={item.id}
                item={item}
                isOrderingMode={isOrderingMode}
                cartQty={cartQuantities.get(item.id) ?? 0}
                onOpenItem={onOpenItem}
              />
            ))}
          </div>
        )
      ) : (
        /* Category sections (no filter active) */
        visibleCategories.map((cat) => (
          <section key={cat.id} id={`category-${cat.id}`} className="scroll-mt-28">
            <h2 className="text-base font-semibold text-stone-900 px-4 pt-6 pb-3">
              {cat.name}
            </h2>
            {cat.items.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-stone-400 italic">
                Belum ada item di kategori ini.
              </p>
            ) : (
              <div>
                {cat.items.map((item) => (
                  <MenuListRow
                    key={item.id}
                    item={item}
                    isOrderingMode={isOrderingMode}
                    cartQty={cartQuantities.get(item.id) ?? 0}
                    onOpenItem={onOpenItem}
                  />
                ))}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}
