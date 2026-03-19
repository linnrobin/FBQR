"use client";

/**
 * FBQRSYS sidebar navigation.
 * Collapsible on mobile; always expanded on desktop.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Settings,
  LogOut,
  Users,
  FileText,
} from "lucide-react";

const navItems = [
  { href: "/fbqrsys/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "reports:read" },
  { href: "/fbqrsys/merchants", label: "Merchants", icon: Building2, permission: "merchants:read" },
  { href: "/fbqrsys/billing", label: "Billing", icon: CreditCard, permission: "billing:manage" },
  { href: "/fbqrsys/audit-log", label: "Log Aktivitas", icon: FileText, permission: "reports:read" },
  { href: "/fbqrsys/settings", label: "Pengaturan", icon: Settings, permission: "settings:manage" },
  { href: "/fbqrsys/settings/staff", label: "Staff", icon: Users, permission: "admins:manage" },
];

export function FbqrsysSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-stone-200 bg-white">
      {/* Brand */}
      <div className="flex h-16 items-center border-b border-stone-200 px-6">
        <span className="text-xl font-bold text-stone-900">FBQR</span>
        <span className="ml-2 rounded bg-orange-100 px-1.5 py-0.5 text-xs font-semibold text-orange-700">
          SYS
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/fbqrsys/dashboard" &&
                pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-orange-50 text-orange-700"
                      : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sign out */}
      <div className="border-t border-stone-200 p-3">
        <button
          onClick={() => signOut({ callbackUrl: "/fbqrsys/login" })}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Keluar
        </button>
      </div>
    </aside>
  );
}
