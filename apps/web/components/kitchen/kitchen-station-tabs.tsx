"use client";

/**
 * KitchenStationTabs — horizontal station tab bar for the kitchen display.
 *
 * Shows "Semua" + one tab per active KitchenStation.
 * Active tab uses bg-primary text-white.
 */

interface Station {
  id: string;
  name: string;
  displayColor: string;
}

interface Props {
  stations: Station[];
  activeStationId: string | null; // null = "Semua"
  onChange: (stationId: string | null) => void;
  orderCounts: Record<string, number>; // stationId → active order count
}

export function KitchenStationTabs({
  stations,
  activeStationId,
  onChange,
  orderCounts,
}: Props) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
      <Tab
        label="Semua"
        count={Object.values(orderCounts).reduce((a, b) => a + b, 0)}
        active={activeStationId === null}
        onClick={() => onChange(null)}
      />
      {stations.map((station) => (
        <Tab
          key={station.id}
          label={station.name}
          count={orderCounts[station.id] ?? 0}
          active={activeStationId === station.id}
          onClick={() => onChange(station.id)}
          color={station.displayColor}
        />
      ))}
    </div>
  );
}

function Tab({
  label,
  count,
  active,
  onClick,
  color,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
        active
          ? "bg-primary text-white"
          : "bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-stone-100"
      }`}
    >
      {color && !active && (
        <span
          className="h-2 w-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
      {count > 0 && (
        <span
          className={`text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-tight ${
            active ? "bg-white/20 text-white" : "bg-stone-700 text-stone-300"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
