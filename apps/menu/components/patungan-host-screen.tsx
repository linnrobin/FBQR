"use client";

/**
 * PatunganHostScreen — host view of split payment progress.
 *
 * Shows: share code, QR/link for participants, list of paid vs unpaid parts,
 * total progress bar, and Cancel Patungan button.
 */

import { useState, useEffect, useCallback } from "react";
import { Users, Copy, CheckCircle2, Clock, X } from "lucide-react";

interface PatunganStatus {
  patunganId: string;
  shareCode: string;
  splitMode: "EQUAL" | "MANUAL";
  totalParts: number;
  paidParts: number;
  amountPerPart: number | null;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  expiresAt: string;
  grandTotal: number;
  orderId: string;
  orderStatus: string;
  restaurantName: string;
  payments: Array<{ id: string; status: string; amount: number; createdAt: string }>;
}

interface PatunganHostScreenProps {
  patunganId: string;
  restaurantId: string;
  tableId: string;
  onAllPaid: (orderId: string) => void;
  onCancelled: () => void;
}

function fmt(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export function PatunganHostScreen({
  patunganId,
  restaurantId,
  tableId,
  onAllPaid,
  onCancelled,
}: PatunganHostScreenProps) {
  const [status, setStatus] = useState<PatunganStatus | null>(null);
  const [copied, setCopied] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const menuUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/patungan/${patunganId}`
      : `/patungan/${patunganId}`;

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/patungan/${patunganId}`);
      if (!res.ok) return;
      const data = (await res.json()) as PatunganStatus;
      setStatus(data);

      if (data.status === "COMPLETED" && data.orderStatus === "CONFIRMED") {
        onAllPaid(data.orderId);
      }
    } catch {
      // silent poll failure
    }
  }, [patunganId, onAllPaid]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(menuUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: do nothing
    }
  };

  const handleCancel = async () => {
    if (!confirm("Yakin ingin membatalkan Patungan? Semua pembayaran yang sudah masuk akan dikembalikan.")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/patungan/${patunganId}`, { method: "DELETE" });
      if (res.ok) {
        onCancelled();
      } else {
        const d = await res.json().catch(() => ({}));
        setError((d as { error?: string }).error ?? "Gagal membatalkan Patungan.");
      }
    } catch {
      setError("Terjadi kesalahan.");
    } finally {
      setCancelling(false);
    }
  };

  if (!status) {
    return (
      <div className="flex items-center justify-center py-16 text-stone-400 text-sm">
        Memuat status Patungan...
      </div>
    );
  }

  const paidCount = status.paidParts;
  const unpaidCount = status.totalParts - paidCount;
  const progress = Math.round((paidCount / status.totalParts) * 100);
  const perPart = status.amountPerPart
    ? Number(status.amountPerPart)
    : Math.floor(status.grandTotal / status.totalParts);

  return (
    <div className="px-4 py-4 space-y-5">
      {/* Success banner */}
      {status.status === "COMPLETED" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-green-800">
            Semua sudah bayar! 🎉
          </p>
          <p className="text-xs text-green-600 mt-1">Pesanan sedang diproses.</p>
        </div>
      )}

      {/* Share section */}
      {status.status === "PENDING" && (
        <div className="bg-[--color-secondary]/40 rounded-xl p-4 text-center">
          <p className="text-xs text-stone-500 uppercase tracking-wide mb-2">
            Kode Patungan
          </p>
          <p className="text-4xl font-bold text-[--color-primary] tracking-widest mb-3">
            {status.shareCode}
          </p>
          <p className="text-xs text-stone-500 mb-3">
            Bagikan kode atau link ini kepada teman
          </p>
          <button
            type="button"
            onClick={copyLink}
            className="flex items-center gap-2 mx-auto px-4 py-2 border border-[--color-primary] text-[--color-primary] rounded-[--border-radius] text-sm font-medium hover:bg-[--color-primary]/5 transition-colors"
          >
            <Copy className="h-4 w-4" />
            {copied ? "Link disalin!" : "Salin Link"}
          </button>
          <p className="text-xs text-stone-400 mt-2 break-all">{menuUrl}</p>
        </div>
      )}

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-stone-500" />
            <span className="text-sm font-medium text-stone-700">
              Pembayaran Patungan
            </span>
          </div>
          <span className="text-sm font-bold text-[--color-primary]">
            {paidCount} / {status.totalParts}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-[--color-primary] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Parts list */}
      <div className="space-y-2">
        {Array.from({ length: status.totalParts }, (_, i) => {
          const payment = status.payments[i];
          const isPaid = payment?.status === "SUCCESS";
          const isPending = payment?.status === "PENDING";
          const isLastPart = i === status.totalParts - 1;
          const remainder =
            isLastPart && status.splitMode === "EQUAL"
              ? status.grandTotal - perPart * (status.totalParts - 1)
              : perPart;

          return (
            <div
              key={i}
              className={`flex items-center justify-between px-3 py-2 rounded-[--border-radius] border ${
                isPaid
                  ? "border-green-200 bg-green-50"
                  : isPending
                  ? "border-amber-200 bg-amber-50"
                  : "border-stone-200 bg-stone-50"
              }`}
            >
              <div className="flex items-center gap-2">
                {isPaid ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : isPending ? (
                  <Clock className="h-4 w-4 text-amber-500" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-stone-300" />
                )}
                <span className="text-sm text-stone-700">
                  Orang {i + 1}
                  {i === 0 ? " (Kamu)" : ""}
                </span>
              </div>
              <span
                className={`text-sm font-medium ${
                  isPaid
                    ? "text-green-700"
                    : isPending
                    ? "text-amber-600"
                    : "text-stone-500"
                }`}
              >
                {fmt(isLastPart ? remainder : perPart)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}

      {/* Cancel button (host-only, only when PENDING) */}
      {status.status === "PENDING" && (
        <button
          type="button"
          onClick={handleCancel}
          disabled={cancelling}
          className="w-full flex items-center justify-center gap-2 py-3 border border-red-300 text-red-600 rounded-[--border-radius] text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          <X className="h-4 w-4" />
          {cancelling ? "Membatalkan..." : "Batalkan Patungan"}
        </button>
      )}
    </div>
  );
}
