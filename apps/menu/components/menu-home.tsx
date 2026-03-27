"use client";

/**
 * MenuHome — top-level orchestrator for the customer menu experience.
 *
 * Manages:
 *   - Cart state (CartEntry per item: qty, variant, add-ons, special request, line total)
 *   - Item detail modal state (open item, opens bottom sheet)
 *   - Active category tab (driven by scroll-spy via IntersectionObserver)
 *   - Ordering-paused banner
 *   - Browse-only mode banner (shareable URL)
 *   - Layout switching: GRID | LIST | BUNDLE | SPOTLIGHT
 *
 * Renders: Header → [CategoryTabs] → Layout → ItemDetailModal → Bottom CartBar / BrowseBanner
 * Note: Spotlight layout omits CategoryTabs (all items in one carousel).
 */

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import { MenuCategoryTabs } from "./menu-category-tabs";
import { MenuGridLayout, type MenuCategoryData } from "./menu-grid-layout";
import { MenuListLayout } from "./menu-list-layout";
import { MenuBundleLayout } from "./menu-bundle-layout";
import { MenuSpotlightLayout } from "./menu-spotlight-layout";
import { ItemDetailModal, type CartEntry } from "./item-detail-modal";
import type { MenuItemData } from "./menu-item-card";

// ─── Types ───────────────────────────────────────────────────────────────────

export type MenuLayout = "GRID" | "LIST" | "BUNDLE" | "SPOTLIGHT";

// Re-export CartEntry so callers (Step 15+) can import it from here
export type { CartEntry };

interface MenuHomeProps {
  restaurantName: string;
  logoUrl: string | null;
  /** isOrderingMode=false → browse-only, no cart, no ordering */
  isOrderingMode: boolean;
  orderingPaused: boolean;
  orderingPausedMessage: string | null;
  categories: MenuCategoryData[];
  /** Restaurant's configured layout (defaults to GRID if not set) */
  menuLayout?: MenuLayout | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MenuHome({
  restaurantName,
  logoUrl,
  isOrderingMode,
  orderingPaused,
  orderingPausedMessage,
  categories,
  menuLayout,
}: MenuHomeProps) {
  const layout: MenuLayout = menuLayout ?? "GRID";
  const isSpotlight = layout === "SPOTLIGHT";

  // ── Cart: itemId → CartEntry ──────────────────────────────────────────────
  const [cartItems, setCartItems] = useState<Map<string, CartEntry>>(new Map());

  // ── Item detail modal state ───────────────────────────────────────────────
  const [openItem, setOpenItem] = useState<MenuItemData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // ── Category scroll-spy ───────────────────────────────────────────────────
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    categories[0]?.id ?? null
  );

  // ── Derived cart values ───────────────────────────────────────────────────

  /** itemId → qty for layout badge display */
  const cartQuantities: Map<string, number> = new Map(
    Array.from(cartItems.entries()).map(([id, entry]) => [id, entry.qty])
  );

  const cartItemCount = Array.from(cartItems.values()).reduce(
    (sum, e) => sum + e.qty,
    0
  );
  const cartTotal = Array.from(cartItems.values()).reduce(
    (sum, e) => sum + e.lineTotal,
    0
  );

  // ── Cart handlers ─────────────────────────────────────────────────────────

  /** Open the item detail modal for an item (from any layout) */
  const handleOpenItem = useCallback((item: MenuItemData) => {
    setOpenItem(item);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    // Keep openItem until animation completes to avoid flash of empty modal
    setTimeout(() => setOpenItem(null), 300);
  }, []);

  /** Called by ItemDetailModal when the user confirms "Tambahkan ke Pesanan" */
  const handleAddToCart = useCallback((entry: CartEntry) => {
    setCartItems((prev) => {
      const next = new Map(prev);
      next.set(entry.itemId, entry);
      return next;
    });
  }, []);

  // ── Scroll-spy via IntersectionObserver ──────────────────────────────────

  useEffect(() => {
    if (categories.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace("category-", "");
            setActiveCategoryId(id);
            break;
          }
        }
      },
      {
        rootMargin: "-112px 0px -60% 0px", // header + tab bar offset
        threshold: 0,
      }
    );

    for (const cat of categories) {
      const el = document.getElementById(`category-${cat.id}`);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [categories]);

  // ─── Render ─────────────────────────────────────────────────────────────

  const tabCategories = categories.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="min-h-screen bg-stone-50" style={{ fontFamily: "var(--font-family, sans-serif)" }}>
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-stone-100 shadow-sm flex items-center px-4 gap-3">
        {logoUrl ? (
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[--border-radius-sm]">
            <Image src={logoUrl} alt={restaurantName} fill className="object-cover" sizes="40px" />
          </div>
        ) : (
          <div className="h-10 w-10 shrink-0 rounded-[--border-radius-sm] bg-[--color-secondary] flex items-center justify-center text-lg font-bold text-[--color-primary]">
            {restaurantName.charAt(0)}
          </div>
        )}
        <span className="flex-1 text-base font-semibold text-[--color-primary] truncate">
          {restaurantName}
        </span>
        {isOrderingMode && (
          <button
            type="button"
            className="relative p-2 text-stone-600 hover:text-[--color-primary] transition-colors"
            aria-label="Keranjang"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartItemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-[--color-primary] text-white text-[10px] font-bold flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </button>
        )}
      </header>

      {/* ── Ordering Paused Banner ── */}
      {isOrderingMode && orderingPaused && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-sm text-amber-800 text-center">
          {orderingPausedMessage || "Pemesanan sementara ditunda oleh restoran. Silakan tunggu."}
        </div>
      )}

      {/* ── Category Tabs — hidden in Spotlight (all items in one carousel) ── */}
      {!isSpotlight && (
        <MenuCategoryTabs
          categories={tabCategories}
          activeCategoryId={activeCategoryId}
          onTabClick={setActiveCategoryId}
        />
      )}

      {/* ── Layout ── */}
      <main>
        {layout === "LIST" && (
          <MenuListLayout
            categories={categories}
            isOrderingMode={isOrderingMode && !orderingPaused}
            cartQuantities={cartQuantities}
            onOpenItem={handleOpenItem}
          />
        )}
        {layout === "BUNDLE" && (
          <MenuBundleLayout
            categories={categories}
            isOrderingMode={isOrderingMode && !orderingPaused}
            cartQuantities={cartQuantities}
            onOpenItem={handleOpenItem}
          />
        )}
        {layout === "SPOTLIGHT" && (
          <MenuSpotlightLayout
            categories={categories}
            isOrderingMode={isOrderingMode && !orderingPaused}
            cartQuantities={cartQuantities}
            onOpenItem={handleOpenItem}
          />
        )}
        {(layout === "GRID" || !["LIST", "BUNDLE", "SPOTLIGHT"].includes(layout)) && (
          <MenuGridLayout
            categories={categories}
            isOrderingMode={isOrderingMode && !orderingPaused}
            cartQuantities={cartQuantities}
            onOpenItem={handleOpenItem}
          />
        )}
      </main>

      {/* ── Item Detail Modal (bottom sheet) ── */}
      <ItemDetailModal
        item={openItem}
        isOpen={modalOpen}
        existingEntry={openItem ? (cartItems.get(openItem.id) ?? null) : null}
        isOrderingMode={isOrderingMode && !orderingPaused}
        onClose={handleCloseModal}
        onAddToCart={handleAddToCart}
      />

      {/* ── Bottom Bar ── */}
      {isOrderingMode && cartItemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 h-14 bg-[--color-primary] flex items-center px-4 gap-3 shadow-lg">
          <div className="flex items-center gap-2 text-white flex-1">
            <ShoppingCart className="h-5 w-5 shrink-0" />
            <span className="text-sm font-semibold">
              {cartItemCount} item
            </span>
          </div>
          <span className="text-white text-sm font-bold">
            Rp {cartTotal.toLocaleString("id-ID")}
          </span>
          <span className="text-white text-sm font-medium opacity-90">
            Lihat Keranjang →
          </span>
        </div>
      )}

      {/* ── Browse-only Banner (shareable menu) ── */}
      {!isOrderingMode && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-stone-800 text-white text-sm text-center py-3 px-4 shadow-lg">
          📱 Pindai QR di meja untuk memesan
        </div>
      )}
    </div>
  );
}
