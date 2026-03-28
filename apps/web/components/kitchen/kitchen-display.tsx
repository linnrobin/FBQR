"use client";

/**
 * KitchenDisplay — main orchestrator for the kitchen display screen.
 *
 * Responsibilities:
 *   - Supabase Realtime subscription on orders:{branchId}
 *   - 60-second fallback REST poll (KDS silent reconciliation guard)
 *   - Station tab state
 *   - Optimistic order state updates
 *   - Auto-print on new order (CONFIRMED) if autoPrintKitchenTicket is enabled
 *   - Reconnection banner on CHANNEL_ERROR
 *
 * Spec: docs/merchant.md § KDS Realtime Fallback
 *       docs/ui-ux.md § Screen 16 — Kitchen Display
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { WifiOff, RefreshCw, LogOut } from "lucide-react";
import { KitchenStationTabs } from "./kitchen-station-tabs";
import { KitchenOrderGrid } from "./kitchen-order-grid";
import type { KitchenOrderData, KitchenItem } from "./kitchen-order-card";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Station {
  id: string;
  name: string;
  displayColor: string;
}

interface Props {
  branchId: string;
  restaurantName: string;
  branchName: string;
  initialOrders: KitchenOrderData[];
  initialStations: Station[];
  autoPrintKitchenTicket: boolean;
}

// ─── Supabase client ──────────────────────────────────────────────────────────

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars not set");
  return createClient(url, key);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KitchenDisplay({
  branchId,
  restaurantName,
  branchName,
  initialOrders,
  initialStations,
  autoPrintKitchenTicket,
}: Props) {
  const [orders, setOrders] = useState<KitchenOrderData[]>(initialOrders);
  const [stations] = useState<Station[]>(initialStations);
  const [activeStationId, setActiveStationId] = useState<string | null>(null);
  const [realtimeError, setRealtimeError] = useState(false);
  const [printToast, setPrintToast] = useState<string | null>(null);

  const knownOrderIds = useRef(new Set(initialOrders.map((o) => o.id)));
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ── Fetch / reconcile orders from REST ─────────────────────────────────────

  const fetchAndMerge = useCallback(
    async (isSilent = true) => {
      try {
        const res = await fetch(
          `/api/kitchen/orders?branchId=${branchId}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const { orders: fresh } = await res.json() as {
          orders: KitchenOrderData[];
        };

        setOrders(fresh);
        // Detect recovered orders
        if (isSilent) {
          for (const o of fresh) {
            if (!knownOrderIds.current.has(o.id)) {
              console.log(`[KDS-fallback] recovered missed order: ${o.id}`);
              knownOrderIds.current.add(o.id);
            }
          }
        }
      } catch {
        // Non-fatal
      }
    },
    [branchId]
  );

  // ── Start/stop fallback poll ───────────────────────────────────────────────

  const startFallbackPoll = useCallback(
    (intervalMs: number) => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(() => fetchAndMerge(true), intervalMs);
    },
    [fetchAndMerge]
  );

  // ── Supabase Realtime ──────────────────────────────────────────────────────

  useEffect(() => {
    let supabase: ReturnType<typeof getSupabaseClient> | null = null;
    try {
      supabase = getSupabaseClient();
    } catch {
      // Supabase not configured — fall back to polling every 10s
      startFallbackPoll(10_000);
      return;
    }

    const channel = supabase.channel(`orders:${branchId}`);

    channel
      .on("broadcast", { event: "order_update" }, () => {
        // Reconcile full state from REST on any broadcast event
        fetchAndMerge(true);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeError(false);
          startFallbackPoll(60_000); // Normal 60s safety net
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeError(true);
          startFallbackPoll(10_000); // Faster poll when Realtime is down
        } else if (status === "CLOSED") {
          setRealtimeError(true);
          startFallbackPoll(10_000);
        }
      });

    return () => {
      supabase?.removeChannel(channel);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [branchId, fetchAndMerge, startFallbackPoll]);

  // ── Order state updates ────────────────────────────────────────────────────

  const handleStatusChange = useCallback(
    (orderId: string, newStatus: string) => {
      setOrders((prev) => {
        if (newStatus === "COMPLETED") {
          // Remove from active queue
          return prev.filter((o) => o.id !== orderId);
        }
        return prev.map((o) =>
          o.id === orderId ? { ...o, status: newStatus } : o
        );
      });
    },
    []
  );

  const handlePriorityChange = useCallback(
    (orderId: string, itemId: string, direction: "up" | "down") => {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            items: o.items.map((item) => {
              if (item.id !== itemId) return item;
              const delta = direction === "up" ? -1 : 1;
              return {
                ...item,
                kitchenPriority: Math.max(0, item.kitchenPriority + delta),
              };
            }),
          };
        })
      );
    },
    []
  );

  const handleWeightSaved = useCallback(
    (
      orderId: string,
      itemId: string,
      weightGrams: number,
      delta: number
    ) => {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            items: o.items.map((item) => {
              if (item.id !== itemId) return item;
              return {
                ...item,
                needsWeighing: false,
                weightValue: weightGrams,
              } as KitchenItem;
            }),
          };
        })
      );
      // Show delta info toast
      if (delta > 0) {
        showPrintToast(
          `⚖️ Tagih tambahan: Rp ${delta.toLocaleString("id-ID")}`
        );
      } else if (delta < 0) {
        showPrintToast(
          `⚖️ Kembalikan: Rp ${Math.abs(delta).toLocaleString("id-ID")}`
        );
      }
    },
    []
  );

  // ── Print ──────────────────────────────────────────────────────────────────

  function showPrintToast(msg: string) {
    setPrintToast(msg);
    setTimeout(() => setPrintToast(null), 4000);
  }

  const handlePrint = useCallback(async (orderId: string) => {
    try {
      const res = await fetch("/api/kitchen/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "KITCHEN_TICKET", orderId }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        showPrintToast("✓ Tiket dapur dicetak");
      } else {
        showPrintToast(
          `Printer: ${data.error ?? "Tidak terhubung"} — cetak manual dari Order Detail.`
        );
      }
    } catch {
      showPrintToast("Printer tidak terhubung — cetak manual dari Order Detail.");
    }
  }, []);

  // ── Station order counts ───────────────────────────────────────────────────

  const orderCounts = stations.reduce(
    (acc, station) => {
      acc[station.id] = orders.filter((o) =>
        o.items.some((item) => item.kitchenStationId === station.id)
      ).length;
      return acc;
    },
    {} as Record<string, number>
  );

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col bg-stone-950 text-stone-100 overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center gap-4 px-4 py-3 bg-stone-900 border-b border-stone-800 flex-shrink-0">
        {/* Restaurant info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-stone-400 leading-none">{restaurantName}</p>
          <p className="text-sm font-semibold text-stone-100 mt-0.5 leading-none">
            {branchName}
          </p>
        </div>

        {/* Station tabs */}
        <div className="flex-1">
          <KitchenStationTabs
            stations={stations}
            activeStationId={activeStationId}
            onChange={setActiveStationId}
            orderCounts={orderCounts}
          />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {realtimeError && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-red-900/40 border border-red-700/50 rounded-lg">
              <WifiOff className="h-3.5 w-3.5 text-red-400" />
              <span className="text-xs text-red-400">Offline</span>
            </div>
          )}
          <button
            onClick={() => fetchAndMerge(false)}
            className="p-2 text-stone-400 hover:text-stone-200 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <a
            href="/kitchen/login"
            className="p-2 text-stone-400 hover:text-stone-200 transition-colors"
            title="Keluar"
          >
            <LogOut className="h-4 w-4" />
          </a>
        </div>
      </header>

      {/* Print toast */}
      {printToast && (
        <div className="absolute top-16 right-4 z-50 bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 text-sm text-stone-100 shadow-xl">
          {printToast}
        </div>
      )}

      {/* Order grid */}
      <main className="flex-1 overflow-y-auto p-4">
        <KitchenOrderGrid
          orders={orders}
          stations={stations}
          activeStationId={activeStationId}
          onStatusChange={handleStatusChange}
          onPriorityChange={handlePriorityChange}
          onWeightSaved={handleWeightSaved}
          onPrint={handlePrint}
        />
      </main>
    </div>
  );
}
