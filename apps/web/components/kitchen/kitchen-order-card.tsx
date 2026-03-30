"use client";

/**
 * KitchenOrderCard — single order card for the kitchen display.
 *
 * Shows:
 *   - Header: table name / queue number / order type / time placed
 *   - Items: qty × name, variant, add-ons, special badges (⚖️ ⚠️ 🔥)
 *   - Station badge (colored pill) — shown in "Semua" tab only
 *   - Customer note
 *   - Footer: elapsed timer (color-coded) + action button + priority controls
 *
 * Spec: docs/merchant.md § Kitchen Display — Order Card Format
 *       docs/ui-ux.md § Screen 16 — Kitchen Display
 */

import { useState, useEffect, useCallback } from "react";
import { ChevronUp, ChevronDown, Printer } from "lucide-react";
import { WeightEntryModal } from "./weight-entry-modal";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KitchenItem {
  id: string;
  name: string;
  quantity: number;
  kitchenStationId: string;
  kitchenPriority: number;
  needsWeighing: boolean;
  weightValue: number | null;
  specialRequest: string | null;
  variantSnapshot: { name: string } | null;
  addonSnapshot: { name: string; quantity: number }[] | null;
}

export interface KitchenOrderData {
  id: string;
  queueNumber: number | null;
  orderType: string;
  status: string;
  confirmedAt: string | null;
  createdAt: string;
  customerNote: string | null;
  platformName: string | null;
  estimatedPickupTime: string | null;
  table: { name: string } | null;
  items: KitchenItem[];
}

interface Station {
  id: string;
  name: string;
  displayColor: string;
}

interface Props {
  order: KitchenOrderData;
  stations: Station[];
  showStationBadge: boolean; // true in "Semua" tab
  onStatusChange: (orderId: string, newStatus: string) => void;
  onPriorityChange: (orderId: string, itemId: string, direction: "up" | "down") => void;
  onWeightSaved: (orderId: string, itemId: string, weightGrams: number, delta: number) => void;
  onPrint: (orderId: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ORDER_TYPE_ICON: Record<string, string> = {
  DINE_IN: "🪑",
  TAKEAWAY: "🥡",
  DELIVERY: "🛵",
};

const ORDER_TYPE_LABEL: Record<string, string> = {
  DINE_IN: "Dine-in",
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery",
};

const STATUS_ACTION: Record<string, { label: string; next: string }> = {
  CONFIRMED: { label: "Disiapkan", next: "PREPARING" },
  PREPARING: { label: "Siap", next: "READY" },
  READY: { label: "Selesai", next: "COMPLETED" },
};

function useElapsedSeconds(confirmedAt: string | null): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!confirmedAt) return;
    const start = new Date(confirmedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [confirmedAt]);

  return elapsed;
}

function ElapsedTimer({ confirmedAt }: { confirmedAt: string | null }) {
  const elapsed = useElapsedSeconds(confirmedAt);

  if (!confirmedAt) return <span className="text-stone-500 text-sm">–</span>;

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const display = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  const color =
    mins >= 20
      ? "text-red-400"
      : mins >= 10
      ? "text-yellow-400"
      : "text-green-400";

  const pulse = mins >= 10 ? "animate-pulse" : "";

  return (
    <span className={`text-sm font-mono font-semibold ${color} ${pulse}`}>
      ⏱ {display}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function KitchenOrderCard({
  order,
  stations,
  showStationBadge,
  onStatusChange,
  onPriorityChange,
  onWeightSaved,
  onPrint,
}: Props) {
  const [acting, setActing] = useState(false);
  const [weightModal, setWeightModal] = useState<{
    itemId: string;
    itemName: string;
  } | null>(null);

  const action = STATUS_ACTION[order.status];
  const stationMap = Object.fromEntries(stations.map((s) => [s.id, s]));

  const handleAction = useCallback(async () => {
    if (!action || acting) return;
    setActing(true);
    try {
      const res = await fetch(
        `/api/kitchen/orders/${order.id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: action.next }),
        }
      );
      if (!res.ok) throw new Error("Failed");
      onStatusChange(order.id, action.next);
    } catch {
      // Silently ignore — Realtime will reconcile on next poll
    } finally {
      setActing(false);
    }
  }, [action, acting, order.id, onStatusChange]);

  const handlePriority = useCallback(
    async (itemId: string, direction: "up" | "down") => {
      try {
        await fetch(
          `/api/kitchen/orders/${order.id}/items/${itemId}/priority`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ direction }),
          }
        );
        onPriorityChange(order.id, itemId, direction);
      } catch {
        // Non-fatal
      }
    },
    [order.id, onPriorityChange]
  );

  return (
    <>
      <div className="bg-stone-900 border border-stone-700 rounded-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-stone-800 px-4 py-3 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {order.orderType === "DELIVERY" && order.platformName ? (
                <span className="font-bold text-stone-100 text-sm">
                  🛵{" "}
                  {order.platformName === "GRABFOOD"
                    ? "GrabFood"
                    : order.platformName === "GOFOOD"
                    ? "GoFood"
                    : "ShopeeFood"}
                  {order.estimatedPickupTime && (
                    <span className="text-stone-400 font-normal">
                      {" — Driver ~"}
                      {new Date(order.estimatedPickupTime).toLocaleTimeString(
                        "id-ID",
                        { hour: "2-digit", minute: "2-digit" }
                      )}
                    </span>
                  )}
                </span>
              ) : (
                <>
                  {order.table && (
                    <span className="font-bold text-stone-100 text-sm">
                      Meja {order.table.name}
                    </span>
                  )}
                  {order.queueNumber && (
                    <span className="text-stone-300 text-sm font-mono">
                      #{String(order.queueNumber).padStart(3, "0")}
                    </span>
                  )}
                </>
              )}
              <span className="text-xs text-stone-400">
                {ORDER_TYPE_ICON[order.orderType] ?? ""}
                {" "}
                {ORDER_TYPE_LABEL[order.orderType] ?? order.orderType}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-xs text-stone-400">
              {new Date(order.createdAt).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <button
              onClick={() => onPrint(order.id)}
              className="p-1 text-stone-500 hover:text-stone-300 transition-colors"
              title="Cetak tiket dapur"
            >
              <Printer className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 px-4 py-3 space-y-2">
          {order.items.map((item) => {
            const station = stationMap[item.kitchenStationId];
            const isHighPriority =
              item.kitchenPriority > 0 &&
              item.kitchenPriority ===
                Math.min(...order.items.map((i) => i.kitchenPriority));

            return (
              <div key={item.id} className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-stone-100 text-sm">
                      <span className="font-semibold">{item.quantity}×</span>{" "}
                      {item.name}
                    </span>
                    {/* Badges */}
                    {item.needsWeighing && (
                      <button
                        onClick={() =>
                          setWeightModal({ itemId: item.id, itemName: item.name })
                        }
                        className="text-sm hover:opacity-80 transition-opacity"
                        title="Masukkan berat"
                      >
                        ⚖️
                      </button>
                    )}
                    {isHighPriority && (
                      <span title="Prioritas tinggi">🔥</span>
                    )}
                    {/* Station badge — only in Semua tab */}
                    {showStationBadge && station && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full text-white font-medium"
                        style={{ backgroundColor: station.displayColor }}
                      >
                        {station.name}
                      </span>
                    )}
                  </div>
                  {/* Variant */}
                  {item.variantSnapshot?.name && (
                    <p className="text-xs text-stone-400 mt-0.5 ml-4">
                      + {item.variantSnapshot.name}
                    </p>
                  )}
                  {/* Add-ons */}
                  {item.addonSnapshot?.map((addon, i) => (
                    <p key={i} className="text-xs text-stone-400 mt-0.5 ml-4">
                      + {addon.quantity > 1 ? `${addon.quantity}× ` : ""}{addon.name}
                    </p>
                  ))}
                  {/* Special request */}
                  {item.specialRequest && (
                    <p className="text-xs text-amber-300 mt-0.5 ml-4 italic">
                      {item.specialRequest}
                    </p>
                  )}
                </div>

                {/* Priority controls */}
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => handlePriority(item.id, "up")}
                    className="h-6 w-6 flex items-center justify-center rounded bg-stone-700 hover:bg-stone-600 text-stone-300 transition-colors"
                    title="Prioritas lebih tinggi"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handlePriority(item.id, "down")}
                    className="h-6 w-6 flex items-center justify-center rounded bg-stone-700 hover:bg-stone-600 text-stone-300 transition-colors"
                    title="Prioritas lebih rendah"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Customer note */}
        {order.customerNote && (
          <div className="px-4 py-2 border-t border-stone-700/50 bg-stone-800/40">
            <p className="text-xs text-stone-300 italic">
              &ldquo;{order.customerNote}&rdquo;
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 border-t border-stone-700 flex items-center justify-between gap-2">
          <ElapsedTimer confirmedAt={order.confirmedAt} />
          {action && (
            <button
              onClick={handleAction}
              disabled={acting}
              className="px-4 h-8 rounded-lg bg-primary text-white text-sm font-medium transition-colors disabled:opacity-50 hover:opacity-90"
            >
              {acting ? "..." : action.label}
            </button>
          )}
        </div>
      </div>

      {/* Weight entry modal */}
      {weightModal && (
        <WeightEntryModal
          orderId={order.id}
          itemId={weightModal.itemId}
          itemName={weightModal.itemName}
          tableName={order.table?.name ?? null}
          queueNumber={order.queueNumber}
          onClose={() => setWeightModal(null)}
          onWeightSaved={(itemId, weightGrams, delta) => {
            setWeightModal(null);
            onWeightSaved(order.id, itemId, weightGrams, delta);
          }}
        />
      )}
    </>
  );
}
