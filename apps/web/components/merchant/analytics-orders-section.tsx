"use client";

/**
 * Orders analytics section.
 * Shows stat cards + by-hour bar chart + by-day-of-week bar chart.
 */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { OrdersData } from "./analytics-types";

function formatIDR(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
}
function StatCard({ label, value, sublabel }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-stone-900 mt-1">{value}</p>
      {sublabel && <p className="text-xs text-stone-400 mt-0.5">{sublabel}</p>}
    </div>
  );
}

interface Props {
  data: OrdersData;
}

export function AnalyticsOrdersSection({ data }: Props) {
  return (
    <section>
      <h2 className="text-base font-semibold text-stone-800 mb-3">Pesanan</h2>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Pesanan" value={data.total.toLocaleString("id-ID")} />
        <StatCard
          label="Rata-rata Nilai Pesanan"
          value={formatIDR(data.aov)}
          sublabel="Average Order Value"
        />
        <StatCard
          label="Tingkat Pembatalan"
          value={`${data.cancellationRate.toFixed(1)}%`}
        />
        <StatCard
          label="Pesanan per Jam (rata-rata)"
          value={
            data.total > 0
              ? (data.byHour.reduce((s, h) => s + h.count, 0) / 24).toFixed(1)
              : "0"
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Orders by hour */}
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-sm font-medium text-stone-700 mb-3">
            Pesanan per Jam (WIB)
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={data.byHour}
              margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fill: "#78716c" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(h) => `${String(h).padStart(2, "0")}:00`}
                interval={3}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#78716c" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                labelFormatter={(h) => `Jam ${String(h).padStart(2, "0")}:00 WIB`}
                formatter={(v) => [Number(v ?? 0), "Pesanan"]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="count" fill="#fb923c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Orders by day of week */}
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-sm font-medium text-stone-700 mb-3">
            Pesanan per Hari
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={data.byDow}
              margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12, fill: "#78716c" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#78716c" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                formatter={(v) => [Number(v ?? 0), "Pesanan"]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="count" fill="#ea580c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
