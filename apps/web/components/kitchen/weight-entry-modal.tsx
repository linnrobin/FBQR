"use client";

/**
 * WeightEntryModal — numpad modal for entering BY_WEIGHT item weight from the KDS.
 *
 * Opened when staff tap the ⚖️ badge on a BY_WEIGHT OrderItem.
 * On confirm: calls PATCH /api/kitchen/orders/[orderId]/items/[itemId]/weight
 * and reports the delta (charge/refund/zero) back to the parent.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Delete } from "lucide-react";

interface Props {
  orderId: string;
  itemId: string;
  itemName: string;
  tableName: string | null;
  queueNumber: number | null;
  onClose: () => void;
  onWeightSaved: (itemId: string, weightGrams: number, delta: number) => void;
}

export function WeightEntryModal({
  orderId,
  itemId,
  itemName,
  tableName,
  queueNumber,
  onClose,
  onWeightSaved,
}: Props) {
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayValue = input || "0";
  const numValue = parseFloat(input) || 0;

  function handleDigit(d: string) {
    if (d === "." && input.includes(".")) return;
    if (input.length >= 8) return;
    setInput((prev) => (prev === "0" && d !== "." ? d : prev + d));
    setError(null);
  }

  function handleBackspace() {
    setInput((prev) => prev.slice(0, -1));
    setError(null);
  }

  function handleClear() {
    setInput("");
    setError(null);
  }

  async function handleConfirm() {
    if (numValue <= 0) {
      setError("Masukkan berat yang valid");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/kitchen/orders/${orderId}/items/${itemId}/weight`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weightValue: numValue }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Gagal menyimpan berat");
      }
      const { delta } = await res.json();
      onWeightSaved(itemId, numValue, delta);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan berat");
    } finally {
      setSaving(false);
    }
  }

  const KEYS = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [".", "0", "⌫"],
  ];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/70"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative z-10 bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-xs overflow-hidden"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-stone-700">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">⚖️</span>
                <p className="font-semibold text-stone-100 text-sm leading-snug">
                  {itemName}
                </p>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                {tableName ? `Meja ${tableName}` : ""}
                {tableName && queueNumber ? " · " : ""}
                {queueNumber ? `#${String(queueNumber).padStart(3, "0")}` : ""}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-stone-400 hover:text-stone-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Weight display */}
          <div className="px-4 py-5 text-center">
            <div className="text-4xl font-bold text-stone-100 tracking-widest">
              {displayValue}
            </div>
            <div className="text-stone-400 text-sm mt-1">gram (g)</div>
            {error && (
              <p className="text-red-400 text-xs mt-2">{error}</p>
            )}
          </div>

          {/* Numpad */}
          <div className="px-4 pb-2 grid grid-cols-3 gap-2">
            {KEYS.flat().map((key) => (
              <button
                key={key}
                onClick={() => {
                  if (key === "⌫") handleBackspace();
                  else handleDigit(key);
                }}
                className="h-14 rounded-xl bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-stone-100 text-xl font-semibold transition-colors flex items-center justify-center"
              >
                {key === "⌫" ? <Delete className="h-5 w-5" /> : key}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="p-4 pt-2 flex gap-3">
            <button
              onClick={handleClear}
              className="flex-1 h-12 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 text-sm font-medium transition-colors"
            >
              Hapus
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving || numValue <= 0}
              className="flex-[2] h-12 rounded-xl bg-primary text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Konfirmasi Berat"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
