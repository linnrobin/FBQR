"use client";

/**
 * Merchant POS sidebar navigation.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UtensilsCrossed,
  QrCode,
  Tag,
  BarChart2,
  Settings,
  Palette,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/merchant/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/merchant/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/merchant/tables", label: "Meja & QR", icon: QrCode },
  { href: "/merchant/promotions", label: "Promosi", icon: Tag },
  { href: "/merchant/analytics", label: "Analitik", icon: BarChart2 },
  { href: "/merchant/branding", label: "Branding", icon: Palette },
  { href: "/merchant/settings", label: "Pengaturan", icon: Settings },
];

export function MerchantSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-stone-200 flex flex-col">
      {/* Logo / Brand */}
      <div className="h-16 flex items-center px-6 border-b border-stone-200">
        <span className="font-bold text-lg text-stone-900">FBQR Merchant</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-orange-50 text-orange-700"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-stone-200">
        <Link
          href="/api/auth/signout"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Keluar
        </Link>
      </div>
    </aside>
  );
}
