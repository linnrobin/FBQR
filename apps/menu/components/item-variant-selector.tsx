"use client";

/**
 * ItemVariantSelector — radio pill-chip group for item variant selection.
 * Used inside the item detail modal (bottom sheet).
 * Per spec: selected = border-[--color-primary] bg-[--color-primary]/10 text-[--color-primary]
 */

import type { MenuItemVariant } from "./menu-item-card";

// ─── Props ───────────────────────────────────────────────────────────────────

interface ItemVariantSelectorProps {
  variants: MenuItemVariant[];
  selectedId: string | null;
  onChange: (id: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDelta(delta: number): string {
  if (delta === 0) return "";
  const abs = `Rp ${Math.abs(delta).toLocaleString("id-ID")}`;
  return delta > 0 ? `+${abs}` : `-${abs}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ItemVariantSelector({
  variants,
  selectedId,
  onChange,
}: ItemVariantSelectorProps) {
  if (variants.length === 0) return null;

  return (
    <div>
      <p className="text-sm font-semibold text-stone-900 mb-2">
        Pilih Ukuran{" "}
        <span className="text-red-500 font-normal">*</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => {
          const selected = v.id === selectedId;
          const delta = formatDelta(v.priceDelta);
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onChange(v.id)}
              className={`px-4 py-2 text-sm rounded-[--border-radius] border transition-colors ${
                selected
                  ? "border-[--color-primary] bg-[--color-primary]/10 text-[--color-primary] font-medium"
                  : "border-stone-200 text-stone-700 hover:border-stone-300 bg-white"
              }`}
            >
              {v.name}
              {delta && (
                <span className="ml-1.5 text-xs text-stone-500">{delta}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
