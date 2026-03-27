"use client";

/**
 * MenuSpotlightLayout — Spotlight layout renderer.
 *
 * All items from all categories are flattened into a single swipeable carousel.
 * No category tabs — this layout replaces them with a full-page hero card per item.
 *
 * Navigation:
 *   - Swipe left/right via Framer Motion drag="x"
 *   - Arrow buttons on desktop
 *   - Pagination indicator: "3 / 12"
 *
 * Card anatomy (per spec):
 *   - Full-width hero image (aspect 4:3)
 *   - Display-size item name (36px bold)
 *   - Price (H2, --color-primary)
 *   - Description (text-sm, 4-line clamp)
 *   - Dietary badges + allergens
 *   - Full-width "Tambahkan ke Pesanan" button
 */

import { useState, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isCategoryAvailable } from "@/lib/menu-time-window";
import type { MenuCategoryData } from "./menu-grid-layout";
import type { MenuItemData } from "./menu-item-card";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(item: MenuItemData): string {
  if (item.priceType === "BY_WEIGHT") {
    const deposit = item.depositAmount ?? item.price;
    return `Rp ${deposit.toLocaleString("id-ID")} deposit`;
  }
  return `Rp ${item.price.toLocaleString("id-ID")}`;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface MenuSpotlightLayoutProps {
  categories: MenuCategoryData[];
  isOrderingMode: boolean;
  cartQuantities: Map<string, number>;
  onAddItem: (itemId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MenuSpotlightLayout({
  categories,
  isOrderingMode,
  cartQuantities,
  onAddItem,
}: MenuSpotlightLayoutProps) {
  // Flatten all available-window categories into a single item list
  const items: MenuItemData[] = useMemo(
    () => categories.filter(isCategoryAvailable).flatMap((cat) => cat.items),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  // 1 = going forward (next), -1 = going backward (prev)
  const [direction, setDirection] = useState<1 | -1>(1);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <p className="text-stone-400 text-sm">Tidak ada menu yang tersedia saat ini.</p>
      </div>
    );
  }

  const item = items[currentIndex]!;
  const available = item.effectivelyAvailable && item.isAvailable;
  const isByWeight = item.priceType === "BY_WEIGHT";
  const cartQty = cartQuantities.get(item.id) ?? 0;

  function goNext() {
    if (currentIndex < items.length - 1) {
      setDirection(1);
      setCurrentIndex((i) => i + 1);
    }
  }

  function goPrev() {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((i) => i - 1);
    }
  }

  function handleDragEnd(
    _event: unknown,
    info: { offset: { x: number }; velocity: { x: number } }
  ) {
    // Threshold: 60px offset or 300px/s velocity
    if (info.offset.x < -60 || info.velocity.x < -300) {
      goNext();
    } else if (info.offset.x > 60 || info.velocity.x > 300) {
      goPrev();
    }
  }

  return (
    <div className="pb-24 overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: direction * 80 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -direction * 80 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={handleDragEnd}
          className="cursor-grab active:cursor-grabbing select-none"
        >
          {/* Hero image — aspect 4:3 */}
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4/3" }}>
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.name}
                fill
                className="object-cover pointer-events-none"
                sizes="100vw"
                priority
              />
            ) : (
              <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-300 text-6xl">
                🍽️
              </div>
            )}
            {!available && (
              <div className="absolute inset-0 bg-stone-900/50 flex items-center justify-center">
                <span className="bg-white text-stone-800 text-base font-semibold px-5 py-2 rounded-full">
                  Habis
                </span>
              </div>
            )}
          </div>

          {/* Item detail */}
          <div className="px-5 pt-5 pb-4">
            {/* Display-size name (36px / text-4xl font-bold per spec) */}
            <h1 className="text-4xl font-bold text-stone-900 leading-tight line-clamp-2">
              {item.name}
            </h1>

            {/* Price — H2 size, primary color */}
            <p className="text-2xl font-semibold text-[--color-primary] mt-2">
              {formatPrice(item)}
            </p>

            {/* Description — 4-line clamp */}
            {item.description && (
              <p className="text-sm text-stone-600 mt-3 line-clamp-4 leading-relaxed">
                {item.description}
              </p>
            )}

            {/* Dietary badges + allergens */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {item.spiceLevel ? (
                <span className="text-base">{"🌶️".repeat(Math.min(item.spiceLevel, 3))}</span>
              ) : null}
              {item.isHalal && (
                <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                  Halal ✓
                </span>
              )}
              {item.isVegan && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
                  Vegan 🌱
                </span>
              )}
              {!item.isVegan && item.isVegetarian && (
                <span className="text-xs bg-lime-100 text-lime-700 px-2.5 py-1 rounded-full font-medium">
                  Vegetarian 🌿
                </span>
              )}
              {item.allergens.length > 0 && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">
                  ⚠️ Mengandung Alergen
                </span>
              )}
            </div>

            {/* Add to order button — full width */}
            {isOrderingMode && (
              <button
                type="button"
                disabled={!available || isByWeight}
                onClick={() => onAddItem(item.id)}
                title={isByWeight ? "Item ini ditimbang oleh staff" : undefined}
                className="mt-5 w-full h-12 bg-[--color-primary] text-white text-base font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.97] transition-all"
              >
                {isByWeight
                  ? "⚖️ Timbang (hubungi staff)"
                  : cartQty > 0
                  ? `+ Tambahkan ke Pesanan (${cartQty} di keranjang)`
                  : "+ Tambahkan ke Pesanan"}
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation + pagination indicator */}
      <div className="flex items-center justify-center gap-4 mt-2">
        <button
          type="button"
          onClick={goPrev}
          disabled={currentIndex === 0}
          aria-label="Menu sebelumnya"
          className="p-2 rounded-full text-stone-400 hover:text-stone-700 disabled:opacity-20 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <span className="text-sm text-stone-400 min-w-[48px] text-center tabular-nums">
          {currentIndex + 1} / {items.length}
        </span>

        <button
          type="button"
          onClick={goNext}
          disabled={currentIndex === items.length - 1}
          aria-label="Menu berikutnya"
          className="p-2 rounded-full text-stone-400 hover:text-stone-700 disabled:opacity-20 transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
