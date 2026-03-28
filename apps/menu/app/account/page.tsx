"use client";

/**
 * Customer account overview page.
 * Route: /account
 *
 * Shows loyalty points balance and recent order history.
 * Requires customer to be logged in (redirects to /account/login if not).
 */
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogOut, Star, ShoppingBag, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";

interface LoyaltyBalance {
  balance: number;
  totalEarned: number;
  totalRedeemed: number;
  program: {
    name: string;
    idrPerPoint: number;
  };
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
  emailVerifiedAt: string | null;
  loyaltyBalance: LoyaltyBalance | null;
  recentOrders: Order[];
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Menunggu Pembayaran",
  CONFIRMED: "Dikonfirmasi",
  PREPARING: "Sedang Disiapkan",
  READY: "Siap Diambil",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  EXPIRED: "Kadaluarsa",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  COMPLETED: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  CANCELLED: <XCircle className="h-4 w-4 text-red-500" />,
  EXPIRED: <XCircle className="h-4 w-4 text-stone-400" />,
};

function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified") === "1";

  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  // Try to get restaurantId from URL or sessionStorage (set during QR session)
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
          {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          Keluar
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* Email verification banner */}
        {verified && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Email berhasil diverifikasi!
          </div>
        )}
        {!customer.emailVerifiedAt && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
            Email Anda belum diverifikasi. Cek kotak masuk untuk link verifikasi.
          </div>
        )}

        {/* Loyalty balance card */}
        {customer.loyaltyBalance ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
              <span className="font-semibold text-stone-900">{customer.loyaltyBalance.program.name}</span>
            </div>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-4xl font-black text-stone-900">
                {customer.loyaltyBalance.balance.toLocaleString("id-ID")}
              </span>
              <span className="text-base text-stone-500 mb-1">poin</span>
            </div>
            <p className="text-xs text-stone-400">
              Total diperoleh: {customer.loyaltyBalance.totalEarned.toLocaleString("id-ID")} poin
              {" · "}Setiap Rp {customer.loyaltyBalance.program.idrPerPoint.toLocaleString("id-ID")} = 1 poin
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200 p-5 flex items-center gap-3">
            <Star className="h-8 w-8 text-stone-300" />
            <div>
              <p className="text-sm font-medium text-stone-700">Program Loyalty</p>
              <p className="text-xs text-stone-400">Belum ada program loyalty aktif di restoran ini.</p>
            </div>
          </div>
        )}

        {/* Recent orders */}
        <div>
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-2">
            Riwayat Pesanan
          </h2>
          {customer.recentOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
              <ShoppingBag className="h-10 w-10 text-stone-300 mx-auto mb-2" />
              <p className="text-sm text-stone-500">Belum ada pesanan.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {customer.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-stone-200 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      {STATUS_ICON[order.status] ?? <Clock className="h-4 w-4 text-orange-400" />}
                      <span className="text-sm font-medium text-stone-700">
                        {STATUS_LABEL[order.status] ?? order.status}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-stone-900">{formatIDR(order.grandTotal)}</span>
                  </div>
                  <p className="text-xs text-stone-400 mb-2">{formatDate(order.createdAt)}</p>
                  <p className="text-xs text-stone-500 line-clamp-2">
                    {order.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                  </p>
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="inline-block mt-2 text-xs font-medium text-orange-600 hover:underline"
                  >
                    Lihat detail
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
