"use client";

/**
 * Revenue analytics section.
 * Shows stat cards + area chart (trend) + donut (by order type)
 * + horizontal bar (by payment method).
 */
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import type { RevenueData } from "./analytics-types";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";

function formatIDR(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function formatIDRShort(n: number): string {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(2).replace(".", ",")} Jt`;
  return formatIDR(n);
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  DINE_IN: "Makan di Tempat",
  TAKEAWAY: "Bawa Pulang",
  DELIVERY: "Delivery",
};
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  QRIS: "QRIS",
  EWALLET: "E-Wallet",
  VA: "Transfer Bank",
  CARD: "Kartu",
  CASH: "Tunai",
};

const DONUT_COLORS = ["#ea580c", "#fb923c", "#fed7aa", "#c2410c", "#7c2d12"];

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
}
function StatCard({ label, value, sublabel }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-stone-900 mt-1 truncate">{value}</p>
      {sublabel && <p className="text-xs text-stone-400 mt-0.5">{sublabel}</p>}
    </div>
  );
}

interface Props {
  data: RevenueData;
}

export function AnalyticsRevenueSection({ data }: Props) {
  const trendData = data.trend.map((d) => ({
    date: format(parseISO(d.date), "d MMM", { locale: localeId }),
    total: d.total,
  }));

  const donutData = data.byOrderType.map((d) => ({
    name: ORDER_TYPE_LABELS[d.type] ?? d.type,
    value: d.total,
  }));

  const barData = data.byPaymentMethod
    .map((d) => ({
      method: PAYMENT_METHOD_LABELS[d.method] ?? d.method,
      total: d.total,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <section>
      <h2 className="text-base font-semibold text-stone-800 mb-3">Pendapatan</h2>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard
          label="Pendapatan Kotor"
          value={formatIDRShort(data.grossRevenue)}
        />
        <StatCard
          label="PPN Dikumpulkan"
          value={formatIDRShort(data.taxCollected)}
        />
        <StatCard
          label="Service Charge"
          value={formatIDRShort(data.serviceChargeCollected)}
        />
        <StatCard
          label="Est. Biaya Gateway"
          value={formatIDRShort(data.estimatedGatewayFees)}
          sublabel="Estimasi"
        />
        <StatCard
          label="Pendapatan Bersih (est.)"
          value={formatIDRShort(data.netRevenue)}
          sublabel="Kotor − gateway − pajak"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area chart — revenue trend */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-sm font-medium text-stone-700 mb-3">Tren Pendapatan</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#78716c" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#78716c" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatIDRShort(v)}
                width={72}
              />
              <Tooltip
                formatter={(v) => [formatIDR(Number(v ?? 0)), "Pendapatan"]}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #e7e5e4",
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#ea580c"
                strokeWidth={2}
                fill="url(#revenueGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Donut — by order type */}
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-sm font-medium text-stone-700 mb-3">Berdasarkan Tipe Pesanan</p>
          {donutData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {donutData.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length] ?? "#ea580c"} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => [formatIDR(Number(v ?? 0))]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-stone-400">
              Belum ada data
            </div>
          )}
        </div>

        {/* Horizontal bar — by payment method */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-sm font-medium text-stone-700 mb-3">
            Berdasarkan Metode Pembayaran
          </p>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(120, barData.length * 36)}>
              <BarChart
                layout="vertical"
                data={barData}
                margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#78716c" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatIDRShort(v)}
                />
                <YAxis
                  type="category"
                  dataKey="method"
                  tick={{ fontSize: 12, fill: "#44403c" }}
                  tickLine={false}
                  axisLine={false}
                  width={90}
                />
                <Tooltip
                  formatter={(v) => [formatIDR(Number(v ?? 0)), "Pendapatan"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="total" fill="#ea580c" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-24 flex items-center justify-center text-sm text-stone-400">
              Belum ada data pembayaran
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
