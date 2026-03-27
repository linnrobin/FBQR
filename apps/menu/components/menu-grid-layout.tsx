"use client";

/**
 * MenuGridLayout — renders each menu category as a labelled section
 * with a 2–3 column grid of MenuItemCards.
 *
 * Also handles category time-window filtering (WIB, Asia/Jakarta).
 */

import { useMemo } from "react";
import { toZonedTime } from "date-fns-tz";
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
  onAddItem: (itemId: string) => void;
}

// ─── Time Window Helpers ──────────────────────────────────────────────────────

function nowWibMinutes(): number {
  const wib = toZonedTime(new Date(), "Asia/Jakarta");
  return wib.getHours() * 60 + wib.getMinutes();
}

function parseHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Returns true if a category is available at the current WIB time.
 * Handles overnight ranges (e.g. 22:00–02:00).
 */
function isCategoryAvailable(cat: MenuCategoryData): boolean {
  if (!cat.availableFrom || !cat.availableTo) return true; // no window = always available
  const now = nowWibMinutes();
  const from = parseHHMM(cat.availableFrom);
  const to = parseHHMM(cat.availableTo);
  if (from <= to) {
    return now >= from && now < to;
  }
  // Overnight: available from `from` until midnight + from midnight until `to`
  return now >= from || now < to;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MenuGridLayout({
  categories,
  isOrderingMode,
  cartQuantities,
  onAddItem,
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
                  onAdd={onAddItem}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
