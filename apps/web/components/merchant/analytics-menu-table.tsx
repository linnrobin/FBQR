"use client";

/**
 * Menu performance section.
 * Top 10 by revenue, top 10 by order count (horizontal bar charts),
 * and slowest-moving items table.
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
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { MenuData } from "./analytics-types";

function formatIDR(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function truncate(name: string, max = 24): string {
  return name.length > max ? name.slice(0, max - 1) + "…" : name;
}

interface Props {
  data: MenuData;
}

export function AnalyticsMenuTable({ data }: Props) {
  const revenueBarData = data.topByRevenue.map((i) => ({
    name: truncate(i.name),
    total: i.total,
  }));

  const countBarData = data.topByCount.map((i) => ({
    name: truncate(i.name),
    count: i.count,
  }));

  return (
    <section>
      <h2 className="text-base font-semibold text-stone-800 mb-3">Performa Menu</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Top 10 by revenue */}
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-sm font-medium text-stone-700 mb-3">
            Top 10 Item — Pendapatan
          </p>
          {revenueBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, revenueBarData.length * 28)}>
              <BarChart
                layout="vertical"
                data={revenueBarData}
                margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "#78716c" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) =>
                    v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(1)} Jt`
                      : v >= 1000
                      ? `${(v / 1000).toFixed(0)} rb`
                      : String(v)
                  }
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#44403c" }}
                  tickLine={false}
                  axisLine={false}
                  width={140}
                />
                <Tooltip
                  formatter={(v) => [formatIDR(Number(v ?? 0)), "Pendapatan"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="total" fill="#ea580c" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-stone-400">
              Belum ada data
            </div>
          )}
        </div>

        {/* Top 10 by count */}
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-sm font-medium text-stone-700 mb-3">
            Top 10 Item — Jumlah Pesanan
          </p>
          {countBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, countBarData.length * 28)}>
              <BarChart
                layout="vertical"
                data={countBarData}
                margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "#78716c" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#44403c" }}
                  tickLine={false}
                  axisLine={false}
                  width={140}
                />
                <Tooltip
                  formatter={(v) => [Number(v ?? 0), "Pesanan"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="count" fill="#fb923c" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-stone-400">
              Belum ada data
            </div>
          )}
        </div>
      </div>

      {/* Slowest moving items table */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <p className="text-sm font-medium text-stone-700 mb-3">
          Item Paling Jarang Dipesan
        </p>
        {data.slowest.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Nama Item
                  </th>
                  <th className="text-right py-2 pr-4 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Pesanan (Periode)
                  </th>
                  <th className="text-right py-2 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Terakhir Dipesan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {data.slowest.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-4 text-stone-800">{item.name}</td>
                    <td className="py-2 pr-4 text-right text-stone-600">{item.count}</td>
                    <td className="py-2 text-right text-stone-500">
                      {item.lastOrderedAt
                        ? format(parseISO(item.lastOrderedAt), "d MMM yyyy", {
                            locale: localeId,
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-stone-400 text-center py-4">Belum ada data</p>
        )}
      </div>
    </section>
  );
}
