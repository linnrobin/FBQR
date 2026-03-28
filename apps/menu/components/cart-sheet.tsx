"use client";

/**
 * CartSheet — bottom sheet showing cart items, order summary, and checkout CTAs.
 *
 * Triggered by tapping the sticky bottom cart bar.
 * Uses Framer Motion for slide-up animation.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag, Minus, Plus, Trash2, Star } from "lucide-react";
import Image from "next/image";
import type { CartEntry } from "./item-detail-modal";
import type { MenuItemData } from "./menu-item-card";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TaxSettings {
  taxRate: number;
  taxLabel: string;
  serviceChargeRate: number;
  serviceChargeLabel: string;
  taxOnServiceCharge: boolean;
  pricesIncludeTax: boolean;
  roundingRule: "NONE" | "ROUND_50" | "ROUND_100";
}

interface CartSheetProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: Map<string, CartEntry>;
  taxSettings: TaxSettings;
  paymentMode: "PAY_FIRST" | "PAY_AT_CASHIER";
  onUpdateQty: (itemId: string, newQty: number) => void;
  onRemoveItem: (itemId: string) => void;
  onProceed: () => void;
  /** Item IDs for upsell section (bestsellers not in cart) */
  upsellIds?: string[];
  /** Item IDs frequently ordered together with current cart */
  togetherIds?: string[];
  /** All available menu items (for looking up upsell/together item data) */
  allItems?: MenuItemData[];
  /** Opens item detail modal for upsell/together item tap */
  onOpenItem?: (item: MenuItemData) => void;
  /** Whether the merchant has loyalty enabled (passes restaurantId for balance fetch) */
  loyaltyEnabled?: boolean;
  restaurantId?: string | undefined;
}

// ─── Financials computation ───────────────────────────────────────────────────

function computeOrderSummary(
  cartItems: Map<string, CartEntry>,
  s: TaxSettings
): {
  subtotal: number;
  serviceChargeAmount: number;
  taxAmount: number;
  grandTotal: number;
} {
  const subtotal = Array.from(cartItems.values()).reduce(
    (sum, e) => sum + e.lineTotal,
    0
  );

  let serviceChargeAmount = 0;
  let taxAmount = 0;
  let grandTotal = subtotal;

  if (s.pricesIncludeTax) {
    taxAmount = Math.round((subtotal * s.taxRate) / (1 + s.taxRate));
    grandTotal = subtotal;
  } else {
    serviceChargeAmount = Math.round(subtotal * s.serviceChargeRate);
    const taxBase = s.taxOnServiceCharge
      ? subtotal + serviceChargeAmount
      : subtotal;
    taxAmount = Math.round(taxBase * s.taxRate);
    grandTotal = subtotal + serviceChargeAmount + taxAmount;
  }

  if (s.roundingRule === "ROUND_50") {
    grandTotal = Math.round(grandTotal / 50) * 50;
  } else if (s.roundingRule === "ROUND_100") {
    grandTotal = Math.round(grandTotal / 100) * 100;
  }

  return { subtotal, serviceChargeAmount, taxAmount, grandTotal };
}

function fmt(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

// ─── Cart item row ────────────────────────────────────────────────────────────

function CartItemRow({
  entry,
  onUpdateQty,
  onRemove,
}: {
  entry: CartEntry;
  onUpdateQty: (newQty: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-stone-100 last:border-b-0">
      {/* Image */}
      {entry.imageUrl ? (
        <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-stone-100">
          <Image
            src={entry.imageUrl}
            alt={entry.itemName}
            fill
            className="object-cover"
            sizes="48px"
          />
        </div>
      ) : (
        <div className="h-12 w-12 shrink-0 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400 text-xs font-medium">
          🍽️
        </div>
      )}

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-900 leading-tight line-clamp-1">
          {entry.itemName}
        </p>
        {entry.variantName && (
          <p className="text-xs text-stone-500 mt-0.5">{entry.variantName}</p>
        )}
        {entry.addons.length > 0 && (
          <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">
            +{entry.addons.map((a) => `${a.name}${a.qty > 1 ? ` ×${a.qty}` : ""}`).join(", ")}
          </p>
        )}
        <p className="text-sm font-semibold text-[--color-primary] mt-1">
          {fmt(entry.lineTotal)}
        </p>
      </div>

      {/* Qty controls + remove */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-stone-400 hover:text-red-500 transition-colors"
          aria-label="Hapus"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onUpdateQty(Math.max(0, entry.qty - 1))}
            className="h-7 w-7 rounded-full border border-stone-300 flex items-center justify-center text-stone-600 hover:border-[--color-primary] hover:text-[--color-primary] transition-colors"
            aria-label="Kurang"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="w-5 text-center text-sm font-semibold text-stone-900">
            {entry.qty}
          </span>
          <button
            type="button"
            onClick={() => onUpdateQty(entry.qty + 1)}
            className="h-7 w-7 rounded-full border border-stone-300 flex items-center justify-center text-stone-600 hover:border-[--color-primary] hover:text-[--color-primary] transition-colors"
            aria-label="Tambah"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AI suggestion chip ────────────────────────────────────────────────────────

function SuggestionChip({
  item,
  onAdd,
}: {
  item: MenuItemData;
  onAdd: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="flex items-center gap-2 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-left hover:border-[--color-primary] hover:bg-orange-50 transition-colors active:scale-[0.98]"
    >
      {item.imageUrl ? (
        <div className="relative w-9 h-9 rounded-md overflow-hidden shrink-0 bg-stone-100">
          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="36px" />
        </div>
      ) : (
        <div className="w-9 h-9 rounded-md bg-stone-100 shrink-0 flex items-center justify-center text-lg">
          🍽️
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-stone-900 line-clamp-1">{item.name}</p>
        <p className="text-xs text-[--color-primary] font-medium">
          + Rp {item.price.toLocaleString("id-ID")}
        </p>
      </div>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CartSheet({
  isOpen,
  onClose,
  cartItems,
  taxSettings,
  paymentMode,
  onUpdateQty,
  onRemoveItem,
  onProceed,
  upsellIds = [],
  togetherIds = [],
  allItems = [],
  onOpenItem,
  loyaltyEnabled = false,
  restaurantId = "",
}: CartSheetProps) {
  const entries = Array.from(cartItems.values());
  const summary = computeOrderSummary(cartItems, taxSettings);

  // Build lookup maps for AI suggestions
  const itemMap = new Map(allItems.map((i) => [i.id, i]));
  const cartSet = new Set(cartItems.keys());

  const togetherItems = togetherIds
    .map((id) => itemMap.get(id))
    .filter((i): i is MenuItemData => !!i && !cartSet.has(i.id) && i.effectivelyAvailable && i.isAvailable)
    .slice(0, 4);

  const upsellItems = upsellIds
    .map((id) => itemMap.get(id))
    .filter((i): i is MenuItemData => !!i && !cartSet.has(i.id) && i.effectivelyAvailable && i.isAvailable)
    .slice(0, 4);

  // Loyalty balance (fetched when sheet opens + loyalty enabled)
  const [loyaltyPoints, setLoyaltyPoints] = useState<{
    balance: number;
    idrValue: number;
    programName: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen || !loyaltyEnabled || !restaurantId) return;
    fetch(`/api/customer/me?restaurantId=${encodeURIComponent(restaurantId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: {
        customer: { emailVerified: boolean };
        loyaltyBalance: {
          balance: number;
          program: { name: string; redemptionRate: string };
        } | null;
      } | null) => {
        if (
          data?.customer?.emailVerified &&
          data.loyaltyBalance &&
          data.loyaltyBalance.balance > 0
        ) {
          setLoyaltyPoints({
            balance: data.loyaltyBalance.balance,
            idrValue: Math.floor(
              data.loyaltyBalance.balance *
                Number(data.loyaltyBalance.program.redemptionRate)
            ),
            programName: data.loyaltyBalance.program.name,
          });
        }
      })
      .catch(() => {/* non-fatal */});
  }, [isOpen, loyaltyEnabled, restaurantId]);

  // Scroll-lock body when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const ctaLabel =
    paymentMode === "PAY_AT_CASHIER"
      ? "Pesan & Bayar di Kasir"
      : "Lanjut ke Pembayaran";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl flex flex-col"
            style={{ maxHeight: "85vh" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-stone-300" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 shrink-0 border-b border-stone-100">
              <h3 className="text-base font-semibold text-stone-900">
                Keranjang Anda
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-stone-400 hover:text-stone-700"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4">
              {entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ShoppingBag className="h-12 w-12 text-stone-200 mb-4" />
                  <p className="text-sm text-stone-500">Keranjang kosong</p>
                </div>
              ) : (
                <>
                  {/* Item list */}
                  <div className="py-2">
                    {entries.map((entry) => (
                      <CartItemRow
                        key={entry.itemId}
                        entry={entry}
                        onUpdateQty={(qty) => onUpdateQty(entry.itemId, qty)}
                        onRemove={() => onRemoveItem(entry.itemId)}
                      />
                    ))}
                  </div>

                  {/* Order summary */}
                  <div className="py-3 border-t border-stone-200 space-y-2">
                    <div className="flex justify-between text-sm text-stone-600">
                      <span>Subtotal</span>
                      <span>{fmt(summary.subtotal)}</span>
                    </div>
                    {summary.serviceChargeAmount > 0 && (
                      <div className="flex justify-between text-sm text-stone-600">
                        <span>{taxSettings.serviceChargeLabel}</span>
                        <span>{fmt(summary.serviceChargeAmount)}</span>
                      </div>
                    )}
                    {summary.taxAmount > 0 && (
                      <div className="flex justify-between text-sm text-stone-600">
                        <span>
                          {taxSettings.taxLabel}{" "}
                          {taxSettings.pricesIncludeTax ? "(sudah termasuk)" : ""}
                        </span>
                        <span>{fmt(summary.taxAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold text-stone-900 pt-1 border-t border-stone-200">
                      <span>Total</span>
                      <span className="text-[--color-primary]">
                        {fmt(summary.grandTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Section 6: Loyalty points balance */}
                  {loyaltyPoints && (
                    <div className="flex items-center gap-2.5 py-2.5 px-3 bg-amber-50 rounded-lg">
                      <Star className="h-4 w-4 text-amber-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-amber-900 truncate">
                          {loyaltyPoints.programName}
                        </p>
                        <p className="text-xs text-amber-700">
                          <span className="font-semibold">
                            {loyaltyPoints.balance.toLocaleString("id-ID")} pts
                          </span>
                          {" = "}
                          <span>Rp {loyaltyPoints.idrValue.toLocaleString("id-ID")}</span>
                          {" · "}
                          <span className="text-[--color-primary]">Tukar saat checkout</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* "Sering dipesan bersama" — frequently ordered together */}
                  {togetherItems.length > 0 && onOpenItem && (
                    <div className="pb-3">
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                        Sering dipesan bersama
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {togetherItems.map((item) => (
                          <SuggestionChip
                            key={item.id}
                            item={item}
                            onAdd={() => { onOpenItem(item); }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upsell chips — "Tambah minuman?" */}
                  {upsellItems.length > 0 && onOpenItem && (
                    <div className="pb-4">
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                        🥤 Tambah minuman atau snack?
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {upsellItems.map((item) => (
                          <SuggestionChip
                            key={item.id}
                            item={item}
                            onAdd={() => { onOpenItem(item); }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* CTA */}
            {entries.length > 0 && (
              <div className="px-4 py-4 shrink-0 border-t border-stone-100">
                <button
                  type="button"
                  onClick={onProceed}
                  className="w-full h-12 bg-[--color-primary] text-white font-semibold rounded-[--border-radius] text-sm hover:opacity-90 transition-opacity"
                >
                  {ctaLabel} — {fmt(summary.grandTotal)}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
