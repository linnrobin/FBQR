"use client";

/**
 * PatunganParticipantScreen — participant view for paying their share.
 *
 * Loaded by participants who open the share link or enter the 6-digit code.
 * Shows: restaurant name, order total, their share amount, payment button.
 */

import { useState, useEffect, useCallback } from "react";
import { Users, CheckCircle2, Clock, ArrowRight } from "lucide-react";

interface PatunganInfo {
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
  payments: Array<{ id: string; status: string; amount: number }>;
}

interface PatunganParticipantScreenProps {
  patunganId: string;
}

function fmt(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export function PatunganParticipantScreen({
  patunganId,
}: PatunganParticipantScreenProps) {
  const [info, setInfo] = useState<PatunganInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInfo = useCallback(async () => {
    try {
      const res = await fetch(`/api/patungan/${patunganId}`);
      if (!res.ok) {
        setError("Patungan tidak ditemukan.");
        return;
      }
      const data = (await res.json()) as PatunganInfo;
      setInfo(data);
    } catch {
      setError("Gagal memuat informasi Patungan.");
    } finally {
      setLoading(false);
    }
  }, [patunganId]);

  useEffect(() => {
    fetchInfo();
    const interval = setInterval(fetchInfo, 5000);
    return () => clearInterval(interval);
  }, [fetchInfo]);

  const handlePay = async () => {
    if (!info) return;
    setPaying(true);
    setError(null);

    try {
      const res = await fetch(`/api/patungan/${patunganId}/pay`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Gagal membuat pembayaran.");
        return;
      }

      const { redirectUrl } = data as { redirectUrl: string };
      window.location.href = redirectUrl;
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-stone-400 text-sm">
        Memuat...
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <p className="text-stone-500 text-sm">{error}</p>
      </div>
    );
  }

  if (!info) return null;

  const isFull = info.paidParts >= info.totalParts;
  const isCancelled = info.status === "CANCELLED";
  const isCompleted = info.status === "COMPLETED";

  const perPart = info.amountPerPart
    ? Number(info.amountPerPart)
    : Math.floor(info.grandTotal / info.totalParts);

  const spotsLeft = info.totalParts - info.paidParts;

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-sm mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="h-16 w-16 rounded-full bg-[--color-primary]/10 flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-[--color-primary]" />
          </div>
          <h1 className="text-xl font-bold text-stone-900">
            {info.restaurantName}
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Diajak patungan bayar pesanan
          </p>
        </div>

        {/* Order info card */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-stone-500">Total Tagihan</span>
            <span className="text-sm font-bold text-stone-900">
              {fmt(info.grandTotal)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-stone-500">Jumlah Orang</span>
            <span className="text-sm font-medium text-stone-900">
              {info.totalParts} orang
            </span>
          </div>
          <div className="flex justify-between items-center border-t border-stone-100 pt-3">
            <span className="text-sm font-semibold text-stone-700">
              Bagianmu
            </span>
            <span className="text-base font-bold text-[--color-primary]">
              {fmt(perPart)}
            </span>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-stone-500">Progres Pembayaran</span>
            <span className="font-medium text-stone-700">
              {info.paidParts}/{info.totalParts}
            </span>
          </div>
          <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[--color-primary] transition-all"
              style={{
                width: `${Math.round((info.paidParts / info.totalParts) * 100)}%`,
              }}
            />
          </div>
          <p className="text-xs text-stone-500 mt-2">
            {spotsLeft > 0
              ? `${spotsLeft} slot tersisa`
              : "Semua sudah bayar!"}
          </p>
        </div>

        {/* Status messages */}
        {isCancelled && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-sm font-semibold text-red-700">
              Patungan Dibatalkan
            </p>
            <p className="text-xs text-red-500 mt-1">
              Pembayaran yang sudah masuk akan dikembalikan.
            </p>
          </div>
        )}

        {isCompleted && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-green-800">
              Semua sudah bayar! 🎉
            </p>
            <p className="text-xs text-green-600 mt-1">
              Pesanan sedang diproses oleh dapur.
            </p>
          </div>
        )}

        {paid && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-green-800">
              Pembayaranmu berhasil! ✓
            </p>
            <p className="text-xs text-green-600 mt-1">
              Menunggu teman lainnya...
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 text-center bg-red-50 border border-red-200 rounded-xl p-3">
            {error}
          </p>
        )}

        {/* Pay button */}
        {!isCancelled && !isCompleted && !paid && !isFull && (
          <button
            type="button"
            onClick={handlePay}
            disabled={paying}
            className="w-full h-12 bg-[--color-primary] text-white font-semibold rounded-[--border-radius] text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {paying ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                Bayar {fmt(perPart)}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        )}

        {isFull && !isCompleted && (
          <div className="text-center text-sm text-stone-500">
            Menunggu konfirmasi dari host...
          </div>
        )}
      </div>
    </div>
  );
}
