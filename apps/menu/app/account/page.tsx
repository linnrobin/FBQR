"use client";

/**
 * Customer account overview page.
 * Route: /account
 *
 * Shows tier status, loyalty points balance, platform FBQR points, and recent orders.
 * Requires customer to be logged in (redirects to /account/login if not).
 */
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  LogOut,
  Star,
  ShoppingBag,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Globe,
  ChevronRight,
} from "lucide-react";

interface TierInfo {
  name: string;
  customTitle: string | null;
  badge: string | null;
  multiplier: number;
}

interface NextTierInfo {
  name: string;
  threshold: number;
  badge: string | null;
}

interface LoyaltyBalance {
  balance: number;
  totalEarned: number;
  program: {
    name: string;
    idrPerPoint: number;
    redemptionRate: number | string;
  };
  tier: TierInfo | null;
  nextTier: NextTierInfo | null;
  pointsToNextTier: number | null;
}

interface PlatformLoyalty {
  balance: number;
  totalEarned: number;
}

interface OrderItem {
  name: string;
  quantity: number;
  lineTotal: number;
}

interface Order {
  id: string;
  status: string;
  grandTotal: number;
  queueNumber: number | null;
  createdAt: string;
  items: OrderItem[];
}

interface CustomerData {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Menunggu Pembayaran",
  CONFIRMED: "Dikonfirmasi",
  PREPARING: "Sedang Disiapkan",
  READY: "Siap Diambil",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  COMPLETED: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  CANCELLED: <XCircle className="h-4 w-4 text-red-500" />,
};

function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified") === "1";

  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loyaltyBalance, setLoyaltyBalance] = useState<LoyaltyBalance | null>(null);
  const [platformLoyalty, setPlatformLoyalty] = useState<PlatformLoyalty | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [restaurantId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("fbqr_restaurantId");
    }
    return null;
  });

  useEffect(() => {
    async function fetchCustomer() {
      try {
        const url = restaurantId
          ? `/api/customer/me?restaurantId=${restaurantId}`
          : "/api/customer/me";
        const res = await fetch(url);
        if (res.status === 401) {
          router.replace("/account/login?next=/account");
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setCustomer(data.customer);
        setLoyaltyBalance(data.loyaltyBalance ?? null);
        setPlatformLoyalty(data.platformLoyalty ?? null);
        setRecentOrders(data.recentOrders ?? []);
      } catch {
        router.replace("/account/login?next=/account");
      } finally {
        setLoading(false);
      }
    }
    fetchCustomer();
  }, [router, restaurantId]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/customer/logout", { method: "POST" });
    router.push("/account/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!customer) return null;

  // Tier progress bar percentage toward next tier
  const tierProgressPct =
    loyaltyBalance?.nextTier && loyaltyBalance.pointsToNextTier != null
      ? Math.min(
          100,
          Math.round(
            (loyaltyBalance.totalEarned / loyaltyBalance.nextTier.threshold) * 100
          )
        )
      : loyaltyBalance?.tier
      ? 100
      : 0;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-stone-900">{customer.name}</h1>
          <p className="text-sm text-stone-500">{customer.email}</p>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 disabled:opacity-50"
        >
          {loggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          Keluar
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* Email verification banners */}
        {verified && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Email berhasil diverifikasi!
          </div>
        )}
        {!customer.emailVerified && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
            Email Anda belum diverifikasi. Cek kotak masuk untuk link verifikasi.
          </div>
        )}

        {/* Merchant loyalty card */}
        {loyaltyBalance ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              {loyaltyBalance.tier?.badge ? (
                <span className="text-2xl leading-none">{loyaltyBalance.tier.badge}</span>
              ) : (
                <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
              )}
              <div>
                <p className="font-semibold text-stone-900 leading-tight">
                  {loyaltyBalance.program.name}
                </p>
                {loyaltyBalance.tier && (
                  <p className="text-xs text-stone-500">
                    {loyaltyBalance.tier.name}
                    {loyaltyBalance.tier.customTitle && (
                      <> &middot; &ldquo;{loyaltyBalance.tier.customTitle}&rdquo;</>
                    )}
                    {loyaltyBalance.tier.multiplier > 1 && (
                      <> &middot; {loyaltyBalance.tier.multiplier}&times; poin</>
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-end gap-1 mb-1">
              <span className="text-4xl font-black text-stone-900">
                {loyaltyBalance.balance.toLocaleString("id-ID")}
              </span>
              <span className="text-base text-stone-500 mb-1">poin</span>
            </div>
            <p className="text-xs text-stone-400 mb-3">
              Total diperoleh: {loyaltyBalance.totalEarned.toLocaleString("id-ID")} poin
              {" · "}Setiap Rp{" "}
              {Number(loyaltyBalance.program.idrPerPoint).toLocaleString("id-ID")} = 1 poin
            </p>

            {/* Next tier progress */}
            {loyaltyBalance.nextTier && loyaltyBalance.pointsToNextTier != null && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-stone-500">
                    {loyaltyBalance.nextTier.badge && (
                      <span className="mr-1">{loyaltyBalance.nextTier.badge}</span>
                    )}
                    Menuju {loyaltyBalance.nextTier.name}
                  </p>
                  <p className="text-xs text-stone-400">
                    {loyaltyBalance.pointsToNextTier.toLocaleString("id-ID")} poin lagi
                  </p>
                </div>
                <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-orange-400 transition-all"
                    style={{ width: `${tierProgressPct}%` }}
                  />
                </div>
              </div>
            )}
            {!loyaltyBalance.nextTier && loyaltyBalance.tier && (
              <p className="text-xs text-stone-400">Anda sudah di tier tertinggi 🎉</p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200 p-5 flex items-center gap-3">
            <Star className="h-8 w-8 text-stone-300" />
            <div>
              <p className="text-sm font-medium text-stone-700">Program Loyalty</p>
              <p className="text-xs text-stone-400">
                Belum ada program loyalty aktif di restoran ini.
              </p>
            </div>
          </div>
        )}

        {/* Platform FBQR loyalty card */}
        {platformLoyalty && platformLoyalty.balance > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4 text-blue-500" />
              <p className="text-sm font-semibold text-stone-900">FBQR Platform Points</p>
            </div>
            <p className="text-2xl font-black text-stone-900">
              {platformLoyalty.balance.toLocaleString("id-ID")}
              <span className="text-sm font-normal text-stone-500 ml-1">poin</span>
            </p>
            <p className="text-xs text-stone-400 mt-0.5">
              Berlaku di semua restoran FBQR &middot;{" "}
              {platformLoyalty.totalEarned.toLocaleString("id-ID")} total diperoleh
            </p>
          </div>
        )}

        {/* Recent orders */}
        <div>
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-2">
            Riwayat Pesanan
          </h2>
          {recentOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
              <ShoppingBag className="h-10 w-10 text-stone-300 mx-auto mb-2" />
              <p className="text-sm text-stone-500">Belum ada pesanan.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-stone-200 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      {STATUS_ICON[order.status] ?? (
                        <Clock className="h-4 w-4 text-orange-400" />
                      )}
                      <span className="text-sm font-medium text-stone-700">
                        {STATUS_LABEL[order.status] ?? order.status}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-stone-900">
                      {formatIDR(order.grandTotal)}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 mb-2">{formatDate(order.createdAt)}</p>
                  <p className="text-xs text-stone-500 line-clamp-2">
                    {order.items.map((i) => `${i.quantity}\u00d7 ${i.name}`).join(", ")}
                  </p>
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="inline-flex items-center gap-0.5 mt-2 text-xs font-medium text-orange-600 hover:underline"
                  >
                    Lihat detail <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
