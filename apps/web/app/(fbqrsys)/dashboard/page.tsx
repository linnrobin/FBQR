"use client";

/**
 * FBQRSYS Dashboard page.
 * Route: /fbqrsys/dashboard
 * Requires: reports:read
 *
 * Displays platform-level stat cards + simple trend charts.
 * Charts use simple inline SVG bars rather than Recharts (not yet installed).
 */
import { useEffect, useState } from "react";
import { StatCard } from "@/components/fbqrsys/stat-card";
import {
  Building2,
  TrendingUp,
  UserX,
  Users,
  DollarSign,
  BarChart2,
} from "lucide-react";

interface DashboardStats {
  activeMerchants: number;
  activeDelta: number;
  trialMerchants: number;
  trialDelta: number;
  suspendedMerchants: number;
  suspendedDelta: number;
  cancelledMerchants: number;
  newSignupsThisMonth: number;
  newSignupsDelta: number | null;
  mrr: number;
  arr: number;
}

interface DashboardData {
  stats: DashboardStats;
  charts: {
    merchantGrowth: { date: string; active: number; trial: number }[];
    signupsTrend: { date: string; count: number }[];
  };
}

function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function MiniBarChart({
  data,
  valueKey,
  color = "bg-orange-400",
}: {
  data: Record<string, unknown>[];
  valueKey: string;
  color?: string;
}) {
  const values = data.map((d) => (d[valueKey] as number) ?? 0);
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-16 items-end gap-0.5">
      {values.map((v, i) => (
        <div
          key={i}
          className={`flex-1 rounded-t ${color} opacity-80`}
          style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? 2 : 0 }}
        />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/fbqrsys/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("Gagal memuat data dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8 h-9 w-48 animate-pulse rounded bg-stone-200" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg bg-stone-200"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-red-600">{error ?? "Terjadi kesalahan."}</p>
      </div>
    );
  }

  const { stats, charts } = data;

  return (
    <div className="p-8">
      <h1 className="mb-8 text-3xl font-bold text-stone-900">Dashboard</h1>

      {/* Row 1: Live platform metrics */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Building2}
          label="Merchant Aktif"
          value={String(stats.activeMerchants)}
          delta={`${stats.activeDelta > 0 ? "+" : ""}${stats.activeDelta} dari bulan lalu`}
          deltaPositive={stats.activeDelta >= 0}
        />
        <StatCard
          icon={Users}
          label="Merchant Trial"
          value={String(stats.trialMerchants)}
          delta={`${stats.trialDelta > 0 ? "+" : ""}${stats.trialDelta} dari minggu lalu`}
          deltaPositive={stats.trialDelta >= 0}
        />
        <StatCard
          icon={UserX}
          label="Merchant Ditangguhkan"
          value={String(stats.suspendedMerchants)}
          delta={`${stats.suspendedDelta > 0 ? "+" : ""}${stats.suspendedDelta} dari minggu lalu`}
          deltaPositive={stats.suspendedDelta <= 0}
        />
        <StatCard
          icon={TrendingUp}
          label="Pendaftar Baru (bulan ini)"
          value={String(stats.newSignupsThisMonth)}
          {...(stats.newSignupsDelta !== null
            ? {
                delta: `${stats.newSignupsDelta > 0 ? "+" : ""}${stats.newSignupsDelta}% vs bulan lalu`,
                deltaPositive: stats.newSignupsDelta >= 0,
              }
            : {})}
        />
      </div>

      {/* Row 2: Revenue metrics */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          icon={DollarSign}
          label="Platform MRR"
          value={formatIDR(stats.mrr)}
        />
        <StatCard
          icon={BarChart2}
          label="Platform ARR (proyeksi)"
          value={formatIDR(stats.arr)}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Merchant Growth */}
        <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-xl font-semibold text-stone-900">
            Pertumbuhan Merchant
          </h2>
          <p className="mb-4 text-sm text-stone-500">30 hari terakhir — pendaftar baru per hari</p>
          <MiniBarChart
            data={charts.merchantGrowth}
            valueKey="active"
            color="bg-green-400"
          />
          <div className="mt-2 flex gap-4 text-xs text-stone-500">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
              Aktif
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-400" />
              Trial
            </span>
          </div>
        </div>

        {/* New Signups Trend */}
        <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-xl font-semibold text-stone-900">
            Tren Pendaftar Baru
          </h2>
          <p className="mb-4 text-sm text-stone-500">30 hari terakhir</p>
          <MiniBarChart
            data={charts.signupsTrend}
            valueKey="count"
            color="bg-orange-400"
          />
          <p className="mt-2 text-xs text-stone-500">
            Total bulan ini: {stats.newSignupsThisMonth} merchant
          </p>
        </div>
      </div>
    </div>
  );
}
