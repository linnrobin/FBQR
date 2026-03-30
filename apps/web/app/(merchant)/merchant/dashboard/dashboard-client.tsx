"use client";

/**
 * Merchant dashboard client component.
 *
 * Responsibilities:
 *  - Supabase Realtime subscription on orders:{primaryBranchId}
 *  - 30-second fallback REST poll
 *  - Stat cards: active orders, occupied tables, waiter requests, today revenue
 *  - Ordering status toggle (pause / resume)
 *  - 7-day revenue area chart
 *  - Recent orders table (last 10)
 *  - WaiterRequest alerts panel with [Tandai Selesai]
 *  - Onboarding checklist card (dismissible)
 *
 * Spec: docs/merchant.md § Screen 3 — Dashboard / Home
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import {
  ShoppingBag,
  Users,
  BellRing,
  TrendingUp,
  Pause,
  Play,
  CheckCircle2,
  WifiOff,
  Loader2,
  Clock,
} from "lucide-react";
import { DashboardRevenueChart } from "@/components/merchant/dashboard-revenue-chart";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChartPoint {
  date: string;
  label: string;
  revenue: number;
}

interface RecentOrder {
  id: string;
  queueNumber: number | null;
  tableName: string;
  itemSummary: string;
  itemCount: number;
  grandTotal: number;
  status: string;
  orderType: string;
  createdAt: string;
}

interface WaiterRequestItem {
  id: string;
  type: string;
  tableName: string;
  createdAt: string;
}

interface DashboardData {
  primaryBranchId: string | null;
  activeOrders: number;
  occupiedTables: number;
  totalTables: number;
  openWaiterRequests: number;
  todayRevenue: number;
  chartData: ChartPoint[];
  recentOrders: RecentOrder[];
  waiterRequests: WaiterRequestItem[];
  orderingPaused: boolean;
  orderingPausedMessage: string | null;
}

interface ChecklistItem {
  key: string;
  label: string;
  link?: string;
  linkLabel?: string;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { key: "restaurantInfo", label: "Info restoran diisi" },
  { key: "menuCreated", label: "Menu pertama dibuat", link: "/merchant/menu", linkLabel: "Setup" },
  { key: "tableCreated", label: "Meja & QR code dibuat", link: "/merchant/tables", linkLabel: "Setup" },
  { key: "paymentConfigured", label: "Metode pembayaran dikonfigurasi", link: "/merchant/settings", linkLabel: "Setup" },
  { key: "staffInvited", label: "Staff pertama diundang", link: "/merchant/staff", linkLabel: "Setup" },
  { key: "brandingConfigured", label: "Atur branding & warna", link: "/merchant/branding", linkLabel: "Setup" },
];

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu",
  CONFIRMED: "Dikonfirmasi",
  PREPARING: "Disiapkan",
  READY: "Siap",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-stone-100 text-stone-600",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PREPARING: "bg-amber-100 text-amber-700",
  READY: "bg-green-100 text-green-700",
  COMPLETED: "bg-stone-100 text-stone-500",
  CANCELLED: "bg-red-100 text-red-600",
};

const WAITER_TYPE_LABELS: Record<string, string> = {
  CALL: "Panggil Pelayan",
  ASSISTANCE: "Butuh Bantuan",
  BILL: "Minta Struk",
};

// ─── Supabase client ──────────────────────────────────────────────────────────

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function elapsedLabel(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} mnt lalu`;
  const hrs = Math.floor(mins / 60);
  return `${hrs} jam lalu`;
}

function timeLabel(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  restaurantName: string;
  merchantStatus: string;
  trialDaysLeft: number | null;
  onboardingChecklist: string[];
  wizardComplete: boolean;
  initialData: DashboardData;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MerchantDashboardClient({
  restaurantName,
  merchantStatus,
  trialDaysLeft,
  onboardingChecklist,
  wizardComplete,
  initialData,
}: Props) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [checklistDismissed, setChecklistDismissed] = useState(false);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch dashboard data ─────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/merchant/dashboard");
      if (!res.ok) return;
      const json: DashboardData = await res.json();
      setData(json);
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, []);

  // ── Supabase Realtime + 30s fallback poll ────────────────────────────────
  useEffect(() => {
    const branchId = data.primaryBranchId;
    if (!branchId) return;

    const supabase = getSupabaseClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    if (supabase) {
      channel = supabase.channel(`orders:${branchId}`);
      channel
        .on("broadcast", { event: "*" }, () => {
          fetchData();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
          fetchData();
        })
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR") setOffline(true);
          if (status === "SUBSCRIBED") setOffline(false);
        });
    }

    // 30s fallback poll (silent reconciliation guard)
    pollRef.current = setInterval(fetchData, 30_000);

    return () => {
      if (channel) supabase?.removeChannel(channel);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [data.primaryBranchId, fetchData]);

  // ── Ordering pause toggle ────────────────────────────────────────────────
  async function handleTogglePause() {
    setPauseLoading(true);
    try {
      const res = await fetch("/api/merchant/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderingPaused: !data.orderingPaused }),
      });
      if (res.ok) {
        setData((prev) => ({ ...prev, orderingPaused: !prev.orderingPaused }));
      }
    } finally {
      setPauseLoading(false);
    }
  }

  // ── Waiter request resolve ───────────────────────────────────────────────
  async function handleResolveWaiter(id: string) {
    setResolvingId(id);
    try {
      const res = await fetch(`/api/merchant/waiter-requests/${id}/resolve`, {
        method: "PATCH",
      });
      if (res.ok) {
        setData((prev) => ({
          ...prev,
          waiterRequests: prev.waiterRequests.filter((wr) => wr.id !== id),
          openWaiterRequests: Math.max(0, prev.openWaiterRequests - 1),
        }));
      }
    } finally {
      setResolvingId(null);
    }
  }

  // ── Checklist ────────────────────────────────────────────────────────────
  const completedCount = CHECKLIST_ITEMS.filter((item) =>
    onboardingChecklist.includes(item.key)
  ).length;
  const totalCount = CHECKLIST_ITEMS.length;
  const pct = Math.round((completedCount / totalCount) * 100);
  const showChecklist = !checklistDismissed && completedCount < totalCount;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Top navigation bar */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-stone-900">FBQR</span>
          <span className="text-stone-300">|</span>
          <span className="text-sm text-stone-600 font-medium">{restaurantName}</span>
        </div>
        <div className="flex items-center gap-3">
          {offline && (
            <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              <WifiOff size={12} /> Offline
            </span>
          )}
          {merchantStatus === "TRIAL" && trialDaysLeft !== null && (
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                trialDaysLeft <= 3
                  ? "bg-red-100 text-red-700"
                  : trialDaysLeft <= 7
                  ? "bg-amber-100 text-amber-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              Trial: {trialDaysLeft} hari lagi
            </span>
          )}
          {merchantStatus === "SUSPENDED" && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-red-100 text-red-700">
              Akun Disuspend
            </span>
          )}
          <a href="/api/auth/signout" className="text-xs text-stone-400 hover:text-stone-600">
            Keluar
          </a>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Page heading */}
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Dashboard</h1>
          <p className="text-sm text-stone-500 mt-1">Selamat datang di {restaurantName}</p>
        </div>

        {/* Trial warning */}
        {merchantStatus === "TRIAL" && trialDaysLeft !== null && trialDaysLeft <= 7 && (
          <div
            className={`rounded-lg px-4 py-3 flex items-center justify-between ${
              trialDaysLeft <= 3 ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200"
            }`}
          >
            <p className={`text-sm font-medium ${trialDaysLeft <= 3 ? "text-red-800" : "text-amber-800"}`}>
              {trialDaysLeft === 0 ? "Trial Anda berakhir hari ini!" : `Trial berakhir dalam ${trialDaysLeft} hari.`}{" "}
              Upgrade sekarang.
            </p>
            <Link href="/merchant/billing" className="text-xs font-semibold text-orange-600 hover:text-orange-700 whitespace-nowrap ml-4">
              Upgrade →
            </Link>
          </div>
        )}

        {/* ── Stat cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={<ShoppingBag size={20} className="text-primary" />}
            label="Pesanan Aktif"
            value={String(data.activeOrders)}
            accent={data.activeOrders > 0}
          />
          <StatCard
            icon={<Users size={20} className="text-primary" />}
            label="Meja Terisi"
            value={`${data.occupiedTables} / ${data.totalTables}`}
            accent={data.occupiedTables > 0}
          />
          <StatCard
            icon={<BellRing size={20} className={data.openWaiterRequests > 0 ? "text-amber-500" : "text-stone-400"} />}
            label="Permintaan Pelayan"
            value={String(data.openWaiterRequests)}
            accent={false}
            warning={data.openWaiterRequests > 0}
          />
          <StatCard
            icon={<TrendingUp size={20} className="text-stone-400" />}
            label="Pendapatan Hari Ini"
            value={formatIDR(data.todayRevenue)}
            accent={false}
          />
        </div>

        {/* ── Ordering status toggle ──────────────────────────────────── */}
        {!data.orderingPaused ? (
          <div className="flex items-center justify-between px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-2 text-green-800 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              Pesanan: Aktif
            </div>
            <button
              onClick={handleTogglePause}
              disabled={pauseLoading}
              className="flex items-center gap-1.5 border border-green-300 text-green-700 hover:bg-green-100 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              {pauseLoading ? <Loader2 size={12} className="animate-spin" /> : <Pause size={12} />}
              Jeda Pesanan
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
            <div>
              <div className="flex items-center gap-2 text-red-800 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                Pesanan: DIJEDA
              </div>
              {data.orderingPausedMessage && (
                <p className="text-xs text-red-600 mt-0.5">{data.orderingPausedMessage}</p>
              )}
            </div>
            <button
              onClick={handleTogglePause}
              disabled={pauseLoading}
              className="flex items-center gap-1.5 border border-red-300 text-red-700 hover:bg-red-100 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 self-start sm:self-auto"
            >
              {pauseLoading ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              Lanjutkan Pesanan
            </button>
          </div>
        )}

        {/* ── Onboarding checklist ────────────────────────────────────── */}
        {showChecklist && (
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-stone-900">Selesaikan setup restoran Anda</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  {completedCount} dari {totalCount} langkah selesai
                </p>
              </div>
              <button
                onClick={() => setChecklistDismissed(true)}
                className="text-xs text-stone-400 hover:text-stone-600 ml-4"
              >
                Sembunyikan
              </button>
            </div>
            <div className="h-1.5 w-full bg-stone-100 rounded-full mb-4 overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="space-y-2">
              {CHECKLIST_ITEMS.map((item) => {
                const done = onboardingChecklist.includes(item.key);
                return (
                  <div key={item.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${done ? "bg-green-100 text-green-600" : "border border-stone-300"}`}>
                        {done && "✓"}
                      </span>
                      <span className={`text-sm ${done ? "text-stone-400 line-through" : "text-stone-700"}`}>
                        {item.label}
                      </span>
                    </div>
                    {!done && item.link && (
                      <Link href={item.link} className="text-xs text-orange-600 hover:text-orange-700 font-medium">
                        {item.linkLabel ?? "Setup"} →
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Revenue chart + waiter requests ────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Revenue chart */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-stone-700 mb-4">Pendapatan 7 Hari Terakhir</h2>
            <DashboardRevenueChart data={data.chartData} />
          </div>

          {/* Waiter requests */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 flex flex-col">
            <h2 className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
              <BellRing size={14} className={data.waiterRequests.length > 0 ? "text-amber-500" : "text-stone-400"} />
              Permintaan Pelayan
              {data.waiterRequests.length > 0 && (
                <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  {data.waiterRequests.length}
                </span>
              )}
            </h2>

            {data.waiterRequests.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-stone-400">
                Tidak ada permintaan
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-56">
                {data.waiterRequests.map((wr) => (
                  <div key={wr.id} className="flex items-start justify-between gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div>
                      <p className="text-xs font-medium text-stone-800">
                        {WAITER_TYPE_LABELS[wr.type] ?? wr.type}
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Meja {wr.tableName} · {elapsedLabel(wr.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleResolveWaiter(wr.id)}
                      disabled={resolvingId === wr.id}
                      className="flex items-center gap-1 text-xs text-green-700 hover:text-green-800 font-medium whitespace-nowrap disabled:opacity-50"
                    >
                      {resolvingId === wr.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={12} />
                      )}
                      Selesai
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Recent orders table ─────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
            <h2 className="text-sm font-semibold text-stone-700">Pesanan Terbaru</h2>
            <Link href="/merchant/orders" className="text-xs text-orange-600 hover:text-orange-700 font-medium">
              Lihat semua →
            </Link>
          </div>

          {data.recentOrders.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-stone-400">Belum ada pesanan</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-stone-500 border-b border-stone-100">
                    <th className="px-6 py-3 text-left font-medium">#</th>
                    <th className="px-4 py-3 text-left font-medium">Meja</th>
                    <th className="px-4 py-3 text-left font-medium">Item</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium flex items-center gap-1">
                      <Clock size={11} /> Waktu
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {data.recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-6 py-3 font-mono text-stone-500 text-xs">
                        {order.queueNumber ? `#${order.queueNumber}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-stone-700 text-xs whitespace-nowrap">
                        {order.tableName}
                      </td>
                      <td className="px-4 py-3 text-stone-600 text-xs max-w-[200px] truncate">
                        {order.itemSummary || `${order.itemCount} item`}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-stone-800 text-xs whitespace-nowrap">
                        {formatIDR(order.grandTotal)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] ?? "bg-stone-100 text-stone-500"}`}>
                          {STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-400 whitespace-nowrap">
                        {timeLabel(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Quick navigation cards ───────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-semibold text-stone-600 mb-3">Menu Cepat</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {[
              { label: "Menu", href: "/merchant/menu", icon: "🍽️" },
              { label: "Meja & QR", href: "/merchant/tables", icon: "🪑" },
              { label: "Pesanan", href: "/merchant/orders", icon: "📋" },
              { label: "Staff", href: "/merchant/staff", icon: "👤" },
              { label: "Dapur", href: "/kitchen", icon: "🍳" },
              { label: "Analitik", href: "/merchant/analytics", icon: "📊" },
              { label: "Branding", href: "/merchant/branding", icon: "🎨" },
              { label: "Pengaturan", href: "/merchant/settings", icon: "⚙️" },
            ].map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="bg-white rounded-xl border border-stone-200 p-3 hover:border-orange-300 hover:shadow-sm transition-all group text-center"
              >
                <div className="text-xl mb-1">{card.icon}</div>
                <p className="text-xs font-medium text-stone-700 group-hover:text-orange-600 transition-colors">
                  {card.label}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  accent,
  warning,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: boolean;
  warning?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-3 ${warning ? "border-amber-200" : "border-stone-200"}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-stone-500 font-medium">{label}</span>
        {icon}
      </div>
      <span className={`text-2xl font-bold leading-none ${accent ? "text-primary" : warning ? "text-amber-600" : "text-stone-800"}`}>
        {value}
      </span>
    </div>
  );
}
