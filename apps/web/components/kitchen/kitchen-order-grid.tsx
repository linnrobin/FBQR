"use client";

/**
 * KitchenOrderGrid — responsive card grid for the kitchen display.
 *
 * Renders order cards in a 2/3/4-column grid with AnimatePresence entrance.
 * Filters by activeStationId when set (null = show all).
 *
 * Spec: docs/ui-ux.md § Screen 16 — Kitchen Display
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  KitchenOrderCard,
  type KitchenOrderData,
} from "./kitchen-order-card";

interface Station {
  id: string;
  name: string;
  displayColor: string;
}

interface Props {
  orders: KitchenOrderData[];
  stations: Station[];
  activeStationId: string | null; // null = Semua
  onStatusChange: (orderId: string, newStatus: string) => void;
  onPriorityChange: (
    orderId: string,
    itemId: string,
    direction: "up" | "down"
  ) => void;
  onWeightSaved: (
    orderId: string,
    itemId: string,
    weightGrams: number,
    delta: number
  ) => void;
  onPrint: (orderId: string) => void;
}

const cardEntrance = {
  initial: { opacity: 0, scale: 0.95, y: -8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 8 },
  transition: { duration: 0.2, ease: "easeOut" },
};

export function KitchenOrderGrid({
  orders,
  stations,
  activeStationId,
  onStatusChange,
  onPriorityChange,
  onWeightSaved,
  onPrint,
}: Props) {
  // Filter orders by active station
  const filtered =
    activeStationId === null
      ? orders
      : orders.filter((order) =>
          order.items.some(
            (item) => item.kitchenStationId === activeStationId
          )
        );

  // Sort by confirmedAt asc (oldest first)
  const sorted = [...filtered].sort((a, b) => {
    const aTime = a.confirmedAt ?? a.createdAt;
    const bTime = b.confirmedAt ?? b.createdAt;
    return new Date(aTime).getTime() - new Date(bTime).getTime();
  });

  if (sorted.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-stone-600 text-lg">Tidak ada pesanan aktif</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <AnimatePresence initial={false} mode="popLayout">
        {sorted.map((order) => (
          <motion.div
            key={order.id}
            layout
            {...cardEntrance}
          >
            <KitchenOrderCard
              order={order}
              stations={stations}
              showStationBadge={activeStationId === null}
              onStatusChange={onStatusChange}
              onPriorityChange={onPriorityChange}
              onWeightSaved={onWeightSaved}
              onPrint={onPrint}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
