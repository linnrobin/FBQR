"use client";

/**
 * OrderTrackingScreen — orchestrates the full order tracking experience.
 *
 * Handles:
 *   1. Initial REST fetch of order data
 *   2. Supabase Realtime subscription on `orders:{branchId}` channel
 *   3. 30-second silent fallback poll
 *   4. Order confirmation banner (auto-dismiss after 5s)
 *   5. Return-from-Midtrans loading state (?status=finish)
 *   6. Status timeline, items display, call waiter, rating prompt
 *   7. Add More Items button
 *   8. Reconnection banner on Realtime drop
 *
 * Customer.md: "Channel scope: one per branch (orders:branchId), never per-order."
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, AlertCircle, Plus, ArrowLeft } from "lucide-react";
import { OrderTimeline, type OrderStatusStep } from "./order-timeline";
import { OrderStatusDisplay, type OrderItemSummary, type PaymentSummary } from "./order-status-display";
import { CallWaiterMenu } from "./call-waiter-menu";
import { OrderRatingPrompt } from "./order-rating-prompt";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderData {
  id: string;
  status: OrderStatusStep | "PENDING" | "EXPIRED";
  queueNumber: number;
  orderType: string;
  confirmedAt: string | null;
  readyAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  subtotal: number;
  taxAmount: number;
  serviceChargeAmount: number;
  grandTotal: number;
  customerNote: string | null;
  branchId: string;
  items: OrderItemSummary[];
  payments: PaymentSummary[];
  invoice: { id: string; pdfUrl: string | null } | null;
  rating: { rating: number; comment: string | null } | null;
  session: { status: string; expiresAt: string };
  restaurant: { name: string; logoUrl: string | null };
}

interface OrderTrackingScreenProps {
  orderId: string;
  restaurantId: string;
  tableId: string;
}

// ─── Realtime client (lazy singleton) ────────────────────────────────────────

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4 px-4 py-6 animate-pulse">
      <div className="h-6 bg-stone-200 rounded w-2/3" />
      <div className="h-32 bg-stone-100 rounded-xl" />
      <div className="h-48 bg-stone-100 rounded-xl" />
      <div className="h-24 bg-stone-100 rounded-xl" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OrderTrackingScreen({
  orderId,
  restaurantId,
  tableId,
}: OrderTrackingScreenProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const midtransStatus = searchParams.get("status"); // "finish" | "error" | "pending"

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(
    midtransStatus === "finish" || midtransStatus === null
  );
  const [reconnecting, setReconnecting] = useState(false);

  // Refs to avoid stale closures in Realtime handler
  const orderRef = useRef<OrderData | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch order ─────────────────────────────────────────────────────────────
  const fetchOrder = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Gagal memuat pesanan");
        return;
      }
      const data = (await res.json()) as OrderData;
      setOrder(data);
      orderRef.current = data;
      setError(null);
    } catch {
      setError("Terjadi kesalahan koneksi");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // ── Auto-dismiss banner after 5s ─────────────────────────────────────────────
  useEffect(() => {
    if (!showBanner) return;
    const timer = setTimeout(() => setShowBanner(false), 5000);
    return () => clearTimeout(timer);
  }, [showBanner]);

  // ── Initial fetch ────────────────────────────────────────────────────────────
  useEffect(() => {
    void fetchOrder(true);
  }, [fetchOrder]);

  // ── Supabase Realtime + fallback poll ────────────────────────────────────────
  useEffect(() => {
    if (!order?.branchId) return;

    const supabase = getSupabaseClient();
    if (!supabase) {
      // No Supabase credentials — use polling only
      pollTimerRef.current = setInterval(() => void fetchOrder(), 30_000);
      return () => {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      };
    }

    const channel = supabase
      .channel(`orders:${order.branchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (_payload) => {
          // Re-fetch full order on any change (avoids partial update issues)
          void fetchOrder();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setReconnecting(false);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setReconnecting(true);
          // Reconnect handled by Supabase client automatically
        }
      });

    // Fallback poll every 30 seconds regardless of Realtime
    pollTimerRef.current = setInterval(() => void fetchOrder(), 30_000);

    return () => {
      void supabase.removeChannel(channel);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [order?.branchId, orderId, fetchOrder]);

  // ── Render ───────────────────────────────────────────────────────────────────

  // Return-from-Midtrans loading state: show spinner while order is still PENDING
  if (midtransStatus === "finish" && order?.status === "PENDING" && !loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6 gap-4">
        <div className="h-12 w-12 border-4 border-[--color-primary] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-stone-600 text-center">
          Memverifikasi pembayaran Anda...
        </p>
        <p className="text-xs text-stone-400 text-center max-w-xs">
          Harap tunggu sebentar. Jangan tutup halaman ini.
        </p>
      </div>
    );
  }

  if (loading && !order) {
    return (
      <div className="min-h-screen bg-stone-50">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl shadow-md p-8 max-w-sm w-full text-center">
          <AlertCircle className="h-10 w-10 text-stone-300 mx-auto mb-3" />
          <h2 className="text-base font-bold text-stone-900 mb-2">
            Gagal Memuat Pesanan
          </h2>
          <p className="text-sm text-stone-500 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => void fetchOrder(true)}
            className="w-full h-10 bg-[--color-primary] text-white rounded-[--border-radius] text-sm font-semibold"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const sessionActive = order.session.status === "ACTIVE";
  const isConfirmedOrBeyond = ["CONFIRMED", "PREPARING", "READY", "COMPLETED"].includes(order.status);
  const isCompleted = order.status === "COMPLETED";
  const isCancelled = order.status === "CANCELLED" || order.status === "EXPIRED";

  // Determine status for timeline (handle PENDING/EXPIRED)
  const timelineStatus: OrderStatusStep =
    order.status === "PENDING" || order.status === "EXPIRED"
      ? "CONFIRMED"
      : (order.status as OrderStatusStep);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[--color-primary] text-white shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          {/* No back button on order tracking per spec — order is in progress */}
          <ShoppingBag className="h-6 w-6 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">{order.restaurant.name}</p>
            <p className="text-xs opacity-80">
              Pesanan #{order.queueNumber.toString().padStart(3, "0")}
            </p>
          </div>
        </div>
      </header>

      {/* Reconnecting banner */}
      {reconnecting && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
          <p className="text-xs text-amber-700">Menyambungkan kembali...</p>
        </div>
      )}

      {/* Confirmation banner */}
      <AnimatePresence>
        {showBanner && isConfirmedOrBeyond && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="mx-4 mt-4 bg-green-50 border border-green-200 rounded-xl px-6 py-4 cursor-pointer text-center"
            onClick={() => setShowBanner(false)}
          >
            <h2 className="text-base font-bold text-green-700">
              Pesanan diterima! 🎉
            </h2>
            <p className="text-xs text-green-600 mt-1">
              Dapur sedang memproses pesanan Anda.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancelled / expired state */}
      {isCancelled && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-4">
          <p className="font-bold text-red-700 text-sm">
            {order.status === "EXPIRED" ? "Sesi Berakhir" : "Pesanan Dibatalkan"}
          </p>
          <p className="text-xs text-red-600 mt-1">
            {order.status === "EXPIRED"
              ? "Sesi meja Anda telah berakhir."
              : "Pesanan Anda dibatalkan. Silakan hubungi staff untuk informasi lebih lanjut."}
          </p>
        </div>
      )}

      <div className="px-4 py-4 space-y-4">
        {/* Status timeline */}
        {!isCancelled && (
          <div className="bg-white rounded-xl border border-stone-100 px-4 py-4">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">
              Status Pesanan
            </p>
            <OrderTimeline
              currentStatus={isConfirmedOrBeyond ? timelineStatus : "CONFIRMED"}
              confirmedAt={order.confirmedAt}
              readyAt={order.readyAt}
              cancelledAt={order.cancelledAt}
            />
          </div>
        )}

        {/* Items, payment, invoice */}
        <OrderStatusDisplay
          status={order.status as "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED" | "EXPIRED"}
          subtotal={order.subtotal}
          taxAmount={order.taxAmount}
          serviceChargeAmount={order.serviceChargeAmount}
          grandTotal={order.grandTotal}
          items={order.items}
          payments={order.payments}
          invoice={order.invoice}
          customerNote={order.customerNote}
        />

        {/* Rating prompt — only when COMPLETED */}
        {isCompleted && (
          <OrderRatingPrompt
            orderId={orderId}
            existingRating={order.rating}
          />
        )}

        {/* Call waiter buttons */}
        {!isCancelled && (
          <CallWaiterMenu
            tableId={tableId}
            orderId={orderId}
            sessionActive={sessionActive}
          />
        )}

        {/* Add More Items button */}
        {sessionActive && !isCancelled && (
          <button
            type="button"
            onClick={() => router.push(`/${restaurantId}/${tableId}`)}
            className="w-full h-12 border border-[--color-primary] text-[--color-primary] rounded-[--border-radius] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[--color-primary]/5 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Tambah Pesanan Lagi
          </button>
        )}

        {/* Back to menu for expired/cancelled */}
        {isCancelled && (
          <button
            type="button"
            onClick={() => router.push(`/${restaurantId}/${tableId}`)}
            className="w-full h-12 border border-stone-300 text-stone-600 rounded-[--border-radius] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-stone-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Menu
          </button>
        )}

        {/* Bottom padding */}
        <div className="h-6" />
      </div>
    </div>
  );
}
