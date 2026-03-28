"use client";

/**
 * BillingInvoicesClient — merchant subscription invoices list.
 *
 * Shows:
 *   - Current plan summary card (plan name, cycle, next renewal, auto-renew toggle)
 *   - Invoice history table with status badges + PDF download links
 *   - Status filter tabs
 */

import { useState } from "react";
import { Download, RefreshCw, CreditCard } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  planName: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  tax: number;
  total: number;
  status: string;
  dueAt: string;
  paidAt: string | null;
  pdfUrl: string | null;
  currency: string;
  createdAt: string;
}

interface SubscriptionInfo {
  planName: string;
  cycle: string;
  currentPeriodEnd: string;
  autoRenew: boolean;
  priceMonthly: number;
  priceAnnual: number;
}

interface Props {
  subscription: SubscriptionInfo | null;
  initialInvoices: InvoiceRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtIDR(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-green-100 text-green-700",
  PENDING: "bg-amber-100 text-amber-700",
  OVERDUE: "bg-red-100 text-red-700",
  CANCELLED: "bg-stone-100 text-stone-500",
};

const STATUS_LABELS: Record<string, string> = {
  PAID: "Lunas",
  PENDING: "Menunggu",
  OVERDUE: "Jatuh Tempo",
  CANCELLED: "Dibatalkan",
};

const CYCLE_LABELS: Record<string, string> = {
  MONTHLY: "Bulanan",
  ANNUAL: "Tahunan",
};

// ─── Main component ───────────────────────────────────────────────────────────

export function BillingInvoicesClient({ subscription, initialInvoices }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filtered =
    statusFilter === "ALL"
      ? initialInvoices
      : initialInvoices.filter((inv) => inv.status === statusFilter);

  const filterTabs = [
    { key: "ALL", label: "Semua" },
    { key: "PENDING", label: "Menunggu" },
    { key: "PAID", label: "Lunas" },
    { key: "OVERDUE", label: "Jatuh Tempo" },
  ];

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">
        Tagihan Langganan
      </h1>

      {/* Current plan card */}
      {subscription && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-stone-100 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-stone-600" />
              </div>
              <div>
                <p className="text-sm text-stone-500">Paket Aktif</p>
                <p className="text-base font-semibold text-stone-900">
                  {subscription.planName}
                  <span className="ml-2 text-xs font-normal text-stone-500">
                    ({CYCLE_LABELS[subscription.cycle] ?? subscription.cycle})
                  </span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-stone-500">Perbarui Berikutnya</p>
              <p className="text-sm font-medium text-stone-800">
                {fmtDate(subscription.currentPeriodEnd)}
              </p>
              {subscription.autoRenew && (
                <div className="flex items-center gap-1 justify-end mt-1">
                  <RefreshCw className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">Auto-renew</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-stone-100 flex gap-6 text-sm">
            <div>
              <p className="text-xs text-stone-500">Harga Bulanan</p>
              <p className="font-medium text-stone-800">
                {fmtIDR(subscription.priceMonthly)}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Harga Tahunan</p>
              <p className="font-medium text-stone-800">
                {fmtIDR(subscription.priceAnnual)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === tab.key
                ? "bg-stone-900 text-white"
                : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Invoice table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
          <p className="text-stone-400 text-sm">Belum ada tagihan.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  No. Invoice
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Periode
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Total
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Jatuh Tempo
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-stone-700">
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    <span className="text-xs">
                      {fmtDate(inv.periodStart)} – {fmtDate(inv.periodEnd)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-stone-900">
                    {fmtIDR(inv.total)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_COLORS[inv.status] ?? "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {STATUS_LABELS[inv.status] ?? inv.status}
                    </span>
                    {inv.status === "PAID" && inv.paidAt && (
                      <p className="text-xs text-stone-400 mt-0.5">
                        {fmtDate(inv.paidAt)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-stone-600 text-xs">
                    {fmtDate(inv.dueAt)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {inv.pdfUrl ? (
                      <a
                        href={inv.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 transition-colors"
                        title="Unduh PDF"
                      >
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </a>
                    ) : (
                      <span className="text-xs text-stone-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-stone-400 mt-4">
        * PDF invoice tersedia selama 24 jam. Muat ulang halaman untuk
        memperbarui link unduhan.
      </p>
    </div>
  );
}
