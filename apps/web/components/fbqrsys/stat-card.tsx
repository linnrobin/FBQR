/**
 * Stat card component — used in FBQRSYS Dashboard.
 * Spec: docs/ui-ux.md § B.1 Stat Card.
 */

import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  icon?: LucideIcon;
}

export function StatCard({
  label,
  value,
  delta,
  deltaPositive,
  icon: Icon,
}: StatCardProps) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2 text-stone-400">
        {Icon && <Icon className="h-5 w-5" />}
        <span className="text-sm font-medium text-stone-500">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-stone-900">{value}</p>
      {delta && (
        <p
          className={`mt-1 text-sm ${
            deltaPositive === undefined
              ? "text-stone-500"
              : deltaPositive
                ? "text-green-600"
                : "text-red-600"
          }`}
        >
          {deltaPositive === true && "↑ "}
          {deltaPositive === false && "↓ "}
          {delta}
        </p>
      )}
    </div>
  );
}
