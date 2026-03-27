"use client";

/**
 * ItemDetailModal — bottom sheet wrapper for item variant/add-on selection.
 *
 * - Slides up from bottom using Framer Motion (shadcn Sheet not available in apps/menu)
 * - Manages: selectedVariantId, selectedAddons, qty, specialRequest
 * - Pre-fills from existingEntry when re-opening an already-carted item
 * - Calculates lineTotal and calls onAddToCart on confirmation
 * - Footer button disabled for BY_WEIGHT items or when required variant not selected
 *
 * CartEntry is the unit passed to menu-home.tsx cart state.
 */

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { MenuItemData } from "./menu-item-card";
import { ItemDetailContent } from "./item-detail-content";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CartAddon = {
  id: string;
  name: string;
  priceDelta: number;
  qty: number;
};

export type CartEntry = {
  itemId: string;
  qty: number;
  variantId: string | null;
  variantName: string | null;
  variantPriceDelta: number;
  addons: CartAddon[];
  specialRequest: string;
  lineTotal: number;
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface ItemDetailModalProps {
  item: MenuItemData | null;
  isOpen: boolean;
  /** Pre-fills the modal when this item is already in the cart */
  existingEntry: CartEntry | null;
  isOrderingMode: boolean;
  onClose: () => void;
  onAddToCart: (entry: CartEntry) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ItemDetailModal({
  item,
  isOpen,
  existingEntry,
  isOrderingMode,
  onClose,
  onAddToCart,
}: ItemDetailModalProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Map<string, number>>(new Map());
  const [qty, setQty] = useState(1);
  const [specialRequest, setSpecialRequest] = useState("");

  // Initialise state each time the modal opens for a new item
  useEffect(() => {
    if (!item || !isOpen) return;

    if (existingEntry) {
      // Re-editing an item already in cart — restore prior selections
      setSelectedVariantId(existingEntry.variantId);
      setSelectedAddons(new Map(existingEntry.addons.map((a) => [a.id, a.qty])));
      setQty(existingEntry.qty);
      setSpecialRequest(existingEntry.specialRequest);
    } else {
      // Fresh open — apply defaults
      const defaultVariant = item.variants.find((v) => v.isDefault) ?? null;
      setSelectedVariantId(defaultVariant?.id ?? null);

      const defaultAddons = new Map<string, number>();
      for (const addon of item.addons) {
        if (addon.isDefault) defaultAddons.set(addon.id, 1);
      }
      setSelectedAddons(defaultAddons);
      setQty(1);
      setSpecialRequest("");
    }
  }, [item, isOpen, existingEntry]);

  // Lock body scroll while sheet is visible
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleAddonChange = useCallback((id: string, addonQty: number) => {
    setSelectedAddons((prev) => {
      const next = new Map(prev);
      if (addonQty === 0) {
        next.delete(id);
      } else {
        next.set(id, addonQty);
      }
      return next;
    });
  }, []);

  if (!item) return null;

  // ── Derived state ─────────────────────────────────────────────────────────

  const isByWeight = item.priceType === "BY_WEIGHT";
  const available = item.effectivelyAvailable && item.isAvailable;
  const hasRequiredVariant = item.variants.length === 0 || selectedVariantId !== null;
  const canAdd = !isByWeight && available && hasRequiredVariant;

  const basePrice = isByWeight
    ? (item.depositAmount ?? item.price)
    : item.price;
  const selectedVariant = item.variants.find((v) => v.id === selectedVariantId) ?? null;
  const variantDelta = selectedVariant?.priceDelta ?? 0;
  const addonTotal = Array.from(selectedAddons.entries()).reduce((sum, [id, aqty]) => {
    const addon = item.addons.find((a) => a.id === id);
    return sum + (addon?.priceDelta ?? 0) * aqty;
  }, 0);
  const lineTotal = (basePrice + variantDelta) * qty + addonTotal;

  // ── Footer button label ───────────────────────────────────────────────────

  function footerLabel(): string {
    if (isByWeight) return "⚖️ Timbang (hubungi staff)";
    if (!available) return "Tidak Tersedia";
    if (!hasRequiredVariant) return "Pilih ukuran terlebih dahulu";
    return `Tambahkan ke Pesanan — Rp ${lineTotal.toLocaleString("id-ID")}`;
  }

  // ── Add to cart ───────────────────────────────────────────────────────────

  function handleAddToCart() {
    if (!canAdd || !item) return;

    const addons: CartAddon[] = Array.from(selectedAddons.entries()).map(([id, aqty]) => {
      const addon = item.addons.find((a) => a.id === id)!;
      return { id, name: addon.name, priceDelta: addon.priceDelta, qty: aqty };
    });

    onAddToCart({
      itemId: item.id,
      qty,
      variantId: selectedVariantId,
      variantName: selectedVariant?.name ?? null,
      variantPriceDelta: variantDelta,
      addons,
      specialRequest,
      lineTotal,
    });
    onClose();
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Bottom sheet */}
          <motion.div
            key="modal-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[90vh] flex flex-col shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label={item.name}
          >
            {/* Drag handle + close button row */}
            <div className="flex items-center justify-center pt-3 pb-1 flex-shrink-0 relative">
              <div className="w-10 h-1 rounded-full bg-stone-200" />
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-2 p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 overscroll-contain">
              <ItemDetailContent
                item={item}
                selectedVariantId={selectedVariantId}
                onVariantChange={setSelectedVariantId}
                selectedAddons={selectedAddons}
                onAddonChange={handleAddonChange}
                qty={qty}
                onQtyChange={setQty}
                specialRequest={specialRequest}
                onSpecialRequestChange={setSpecialRequest}
              />
              {/* Bottom padding so content clears the fixed footer */}
              <div className="h-4" />
            </div>

            {/* Sticky footer */}
            {isOrderingMode && (
              <div className="flex-shrink-0 px-4 py-3 border-t border-stone-100 bg-white safe-area-pb">
                <button
                  type="button"
                  disabled={!canAdd}
                  onClick={handleAddToCart}
                  className="w-full h-12 bg-[--color-primary] text-white font-semibold rounded-[--border-radius] disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity text-sm"
                >
                  {footerLabel()}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
