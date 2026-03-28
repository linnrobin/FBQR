"use client";

/**
 * QueueDisplay — full-screen order queue display for the customer waiting area.
 *
 * Shows two sections:
 *   1. PESANAN SIAP (READY)      — green tiles, large queue numbers
 *   2. SEDANG DISIAPKAN (PREPARING) — stone tiles, large queue numbers
 *
 * Updates via Supabase Realtime (orders:{branchId} channel).
 * Falls back to 30-second polling when Realtime is unavailable.
 *
 * Spec: docs/ui-ux.md § Order Queue Display Screen
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { AnimatePresence, motion } from "framer-motion";

interface QueueState {
  restaurantName: string;
  logoUrl: string | null;
  branchName: string;
  preparing: number[];
  ready: number[];
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function NumberTile({
  num,
  variant,
}: {
  num: number;
  variant: "ready" | "preparing";
}) {
  return (
    <motion.div
      key={num}
      initial={
        variant === "ready"
          ? { y: -40, opacity: 0 }
          : { x: 40, opacity: 0 }
      }
      animate={{ y: 0, x: 0, opacity: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      className={`h-20 w-20 flex items-center justify-center text-3xl font-black rounded-xl text-white ${
        variant === "ready" ? "bg-green-700" : "bg-stone-700"
      }`}
    >
      {num.toString().padStart(3, "0")}
    </motion.div>
  );
}

export function QueueDisplay({ branchId }: { branchId: string }) {
  const [queue, setQueue] = useState<QueueState | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/kitchen/queue?branchId=${encodeURIComponent(branchId)}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const data = (await res.json()) as QueueState;
      setQueue(data);
    } catch {
      // Silent — display will retain last known state
    }
  }, [branchId]);

  // Initial fetch
  useEffect(() => {
    void fetchQueue();
  }, [fetchQueue]);

  // Realtime subscription + fallback poll
  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      pollTimerRef.current = setInterval(() => void fetchQueue(), 30_000);
      return () => {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      };
    }

    const channel = supabase
      .channel(`orders:${branchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `branch_id=eq.${branchId}`,
        },
        () => {
          void fetchQueue();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setReconnecting(false);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setReconnecting(true);
        }
      });

    // Fallback poll every 30s regardless of Realtime
    pollTimerRef.current = setInterval(() => void fetchQueue(), 30_000);

    return () => {
      void supabase.removeChannel(channel);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [branchId, fetchQueue]);

  return (
    <div className="min-h-screen bg-stone-950 text-white flex flex-col">
      {/* Top bar — restaurant name + branch */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-stone-800">
        <div className="flex items-center gap-4">
          {queue?.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={queue.logoUrl}
              alt="logo"
              className="h-10 w-10 rounded-full object-cover"
            />
          )}
          <span className="text-xl font-bold text-white">
            {queue?.restaurantName ?? "—"}
          </span>
        </div>
        <span className="text-sm text-stone-400">{queue?.branchName ?? ""}</span>
      </header>

      {/* Reconnecting banner */}
      {reconnecting && (
        <div className="bg-amber-900/60 text-amber-300 text-sm text-center py-2 px-4">
          Menyambungkan kembali ke server...
        </div>
      )}

      {/* Queue sections */}
      <div className="flex-1 flex flex-col divide-y divide-stone-800">
        {/* PESANAN SIAP */}
        <section className="flex-1 px-8 py-6">
          <h1 className="text-3xl font-black tracking-widest text-green-400 mb-6 text-center">
            PESANAN SIAP
          </h1>
          {queue?.ready.length === 0 || !queue ? (
            <p className="text-center text-stone-600 text-lg mt-4">
              —
            </p>
          ) : (
            <div className="flex flex-wrap justify-center gap-4">
              <AnimatePresence>
                {queue.ready.map((num) => (
                  <NumberTile key={num} num={num} variant="ready" />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* SEDANG DISIAPKAN */}
        <section className="flex-1 px-8 py-6">
          <h1 className="text-3xl font-black tracking-widest text-amber-400 mb-6 text-center">
            SEDANG DISIAPKAN
          </h1>
          {queue?.preparing.length === 0 || !queue ? (
            <p className="text-center text-stone-600 text-lg mt-4">
              —
            </p>
          ) : (
            <div className="flex flex-wrap justify-center gap-4">
              <AnimatePresence>
                {queue.preparing.map((num) => (
                  <NumberTile key={num} num={num} variant="preparing" />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
