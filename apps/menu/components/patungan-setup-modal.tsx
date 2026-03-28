"use client";

/**
 * PatunganSetupModal — bottom sheet for configuring split payment.
 *
 * Two split modes:
 *   EQUAL  — split evenly across N people
 *   MANUAL — each person pays a set amount
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users } from "lucide-react";

interface PatunganSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  grandTotal: number;
  onCreatePatungan: (params: {
    splitMode: "EQUAL" | "MANUAL";
    totalParts: number;
    amountPerPart?: number;
  }) => Promise<void>;
  isLoading: boolean;
}

function fmt(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export function PatunganSetupModal({
  isOpen,
  onClose,
  grandTotal,
  onCreatePatungan,
  isLoading,
}: PatunganSetupModalProps) {
  const [splitMode, setSplitMode] = useState<"EQUAL" | "MANUAL">("EQUAL");
  const [totalParts, setTotalParts] = useState(2);
  const [amountPerPart, setAmountPerPart] = useState("");

  const equalShare = Math.floor(grandTotal / totalParts);
  const remainder = grandTotal - equalShare * totalParts;

  const handleCreate = async () => {
    const params =
      splitMode === "MANUAL"
        ? { splitMode, totalParts, amountPerPart: parseInt(amountPerPart, 10) || 0 }
        : { splitMode, totalParts };
    await onCreatePatungan(params);
  };

  const isValid =
    totalParts >= 2 &&
    totalParts <= 10 &&
    (splitMode === "EQUAL" || (parseInt(amountPerPart, 10) || 0) > 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-stone-300" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[--color-primary]" />
                <h3 className="text-base font-semibold text-stone-900">
                  Bayar Patungan
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-stone-400 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-4 py-4 space-y-5">
              {/* Total */}
              <div className="text-center">
                <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">
                  Total Tagihan
                </p>
                <p className="text-2xl font-bold text-[--color-primary]">
                  {fmt(grandTotal)}
                </p>
              </div>

              {/* Split mode */}
              <div>
                <p className="text-sm font-medium text-stone-700 mb-2">
                  Cara Membagi
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(["EQUAL", "MANUAL"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSplitMode(mode)}
                      className={`py-2 rounded-[--border-radius] border text-sm font-medium transition-all ${
                        splitMode === mode
                          ? "border-[--color-primary] bg-[--color-primary]/5 text-[--color-primary]"
                          : "border-stone-200 text-stone-600"
                      }`}
                    >
                      {mode === "EQUAL" ? "Sama Rata" : "Manual"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of people */}
              <div>
                <p className="text-sm font-medium text-stone-700 mb-2">
                  Jumlah Orang
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTotalParts(Math.max(2, totalParts - 1))}
                    className="h-10 w-10 rounded-full border border-stone-300 flex items-center justify-center text-stone-600 hover:border-[--color-primary] hover:text-[--color-primary] transition-colors text-lg font-bold"
                  >
                    −
                  </button>
                  <span className="flex-1 text-center text-xl font-bold text-stone-900">
                    {totalParts}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTotalParts(Math.min(10, totalParts + 1))}
                    className="h-10 w-10 rounded-full border border-stone-300 flex items-center justify-center text-stone-600 hover:border-[--color-primary] hover:text-[--color-primary] transition-colors text-lg font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Per-person amount preview / manual input */}
              {splitMode === "EQUAL" ? (
                <div className="bg-stone-50 rounded-[--border-radius] p-3 text-center">
                  <p className="text-xs text-stone-500 mb-1">Per Orang</p>
                  <p className="text-lg font-bold text-stone-900">
                    {fmt(equalShare)}
                  </p>
                  {remainder > 0 && (
                    <p className="text-xs text-stone-400 mt-1">
                      Orang terakhir membayar {fmt(equalShare + remainder)}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-stone-700 mb-2">
                    Jumlah Per Orang (IDR)
                  </p>
                  <input
                    type="number"
                    min={1}
                    value={amountPerPart}
                    onChange={(e) => setAmountPerPart(e.target.value)}
                    placeholder="Masukkan jumlah..."
                    className="w-full h-11 border border-stone-300 rounded-[--border-radius] px-3 text-sm focus:outline-none focus:border-[--color-primary]"
                  />
                  {amountPerPart && (
                    <p className="text-xs text-stone-500 mt-1">
                      Total:{" "}
                      {fmt((parseInt(amountPerPart, 10) || 0) * totalParts)}{" "}
                      {(parseInt(amountPerPart, 10) || 0) * totalParts !==
                        grandTotal && (
                        <span className="text-amber-600">
                          (tagihan: {fmt(grandTotal)})
                        </span>
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* CTA */}
              <button
                type="button"
                onClick={handleCreate}
                disabled={!isValid || isLoading}
                className="w-full h-12 bg-[--color-primary] text-white font-semibold rounded-[--border-radius] text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isLoading ? "Membuat..." : "Buat Link Patungan"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
