"use client";

/**
 * Merchant dashboard client component.
 * Handles dismissal of the onboarding checklist card.
 * Full live dashboard (stat cards, charts, orders) implemented in Step 9+.
 */
import { useState } from "react";
import Link from "next/link";

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

interface Props {
  restaurantName: string;
  merchantStatus: string;
  trialDaysLeft: number | null;
  onboardingChecklist: string[];
  wizardComplete: boolean;
}

export function MerchantDashboardClient({
  restaurantName,
  merchantStatus,
  trialDaysLeft,
  onboardingChecklist,
  wizardComplete,
}: Props) {
  const [checklistDismissed, setChecklistDismissed] = useState(false);

  const completedCount = CHECKLIST_ITEMS.filter((item) =>
    onboardingChecklist.includes(item.key)
  ).length;
  const totalCount = CHECKLIST_ITEMS.length;
  const pct = Math.round((completedCount / totalCount) * 100);

  const showChecklist =
    !checklistDismissed && completedCount < totalCount;

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
          <a
            href="/api/auth/signout"
            className="text-xs text-stone-400 hover:text-stone-600"
          >
            Keluar
          </a>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Page heading */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-stone-900">Dashboard</h1>
          <p className="text-sm text-stone-500 mt-1">
            Selamat datang di {restaurantName}
          </p>
        </div>

        {/* Trial expiry warning */}
        {merchantStatus === "TRIAL" && trialDaysLeft !== null && trialDaysLeft <= 7 && (
          <div
            className={`rounded-lg px-4 py-3 mb-6 flex items-center justify-between ${
              trialDaysLeft <= 3 ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200"
            }`}
          >
            <p className={`text-sm font-medium ${trialDaysLeft <= 3 ? "text-red-800" : "text-amber-800"}`}>
              {trialDaysLeft === 0
                ? "Trial Anda berakhir hari ini!"
                : `Trial Anda berakhir dalam ${trialDaysLeft} hari.`}{" "}
              Upgrade sekarang untuk tidak kehilangan akses.
            </p>
            <Link
              href="/merchant/billing"
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 whitespace-nowrap ml-4"
            >
              Upgrade →
            </Link>
          </div>
        )}

        {/* Onboarding checklist card */}
        {showChecklist && (
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-stone-900">
                  Selesaikan setup restoran Anda
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  {completedCount} dari {totalCount} langkah selesai
                </p>
              </div>
              <button
                onClick={() => setChecklistDismissed(true)}
                className="text-xs text-stone-400 hover:text-stone-600 ml-4"
                title="Sembunyikan"
              >
                Sembunyikan
              </button>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 w-full bg-stone-100 rounded-full mb-4 overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Checklist items */}
            <div className="space-y-2">
              {CHECKLIST_ITEMS.map((item) => {
                const done = onboardingChecklist.includes(item.key);
                return (
                  <div key={item.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                          done
                            ? "bg-green-100 text-green-600"
                            : "border border-stone-300"
                        }`}
                      >
                        {done && "✓"}
                      </span>
                      <span
                        className={`text-sm ${
                          done ? "text-stone-400 line-through" : "text-stone-700"
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                    {!done && item.link && (
                      <Link
                        href={item.link}
                        className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                      >
                        {item.linkLabel ?? "Setup"} →
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick navigation cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[
            { label: "Menu", href: "/merchant/menu", icon: "🍽️", desc: "Kelola menu & kategori" },
            { label: "Meja & QR", href: "/merchant/tables", icon: "🪑", desc: "Buat & kelola meja" },
            { label: "Pesanan", href: "/merchant/orders", icon: "📋", desc: "Lihat pesanan masuk" },
            { label: "Staff", href: "/merchant/staff", icon: "👤", desc: "Kelola karyawan" },
            { label: "Dapur", href: "/kitchen", icon: "🍳", desc: "Display dapur" },
            { label: "Laporan", href: "/merchant/reports", icon: "📊", desc: "Analitik penjualan" },
            { label: "Branding", href: "/merchant/branding", icon: "🎨", desc: "Logo & warna" },
            { label: "Pengaturan", href: "/merchant/settings", icon: "⚙️", desc: "Konfigurasi restoran" },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="bg-white rounded-xl border border-stone-200 p-4 hover:border-orange-300 hover:shadow-sm transition-all group"
            >
              <div className="text-2xl mb-2">{card.icon}</div>
              <p className="text-sm font-semibold text-stone-800 group-hover:text-orange-600 transition-colors">
                {card.label}
              </p>
              <p className="text-xs text-stone-400 mt-0.5">{card.desc}</p>
            </Link>
          ))}
        </div>

        {/* Placeholder — full dashboard in Step 9+ */}
        <div className="mt-8 bg-white rounded-xl border border-stone-200 p-6 text-center">
          <p className="text-sm text-stone-400">
            Dashboard penuh (pesanan aktif, pendapatan, grafik) tersedia di Step 9.
          </p>
        </div>
      </main>
    </div>
  );
}
