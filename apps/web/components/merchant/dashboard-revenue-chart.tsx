"use client";

/**
 * DashboardRevenueChart — 7-day revenue area chart for merchant dashboard.
 *
 * Uses Recharts (already installed: Step 21).
 * Spec: docs/merchant.md § Screen 3 — Dashboard / Home — Revenue chart
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartPoint {
  date: string;
  label: string;
  revenue: number;
}

interface Props {
  data: ChartPoint[];
}

function formatIDR(value: number): string {
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}rb`;
  return `Rp ${value}`;
}

export function DashboardRevenueChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-stone-400">
        Belum ada data pendapatan
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#a8a29e" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatIDR}
          tick={{ fontSize: 11, fill: "#a8a29e" }}
          axisLine={false}
          tickLine={false}
          width={64}
        />
        <Tooltip
          formatter={(value: number) => [
            new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value),
            "Pendapatan",
          ]}
          labelFormatter={(label) => `Tanggal ${label}`}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid #e7e5e4",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#f97316"
          strokeWidth={2}
          fill="url(#revenueGradient)"
          dot={false}
          activeDot={{ r: 4, fill: "#f97316" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
