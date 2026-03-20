"use client";

/**
 * FBQRSYS Billing Overview page.
 * Route: /fbqrsys/billing
 * Requires: billing:manage
 *
 * Screen 7 — Merchant Billing
 * Spec: docs/platform-owner.md § Screen 7 — Merchant Billing
 */
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { BillingInvoiceStatusBadge } from "@/components/fbqrsys/status-badge";
import { StatCard } from "@/components/fbqrsys/stat-card";
import {
  CreditCard,
  FileText,
  AlertTriangle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  total: number;
  status: string;
  dueAt: string;
  paidAt: string | null;
  pdfUrl: string | null;
  subscription: {
    plan: { id: string; name: string };
    merchant: {
      id: string;
      email: string;
      restaurant: { id: string; name: string } | null;
    };
  };
}

interface ListResponse {
  invoices: InvoiceRow[];
  total: number;
  page: number;
  totalPages: number;
}

interface BillingStats {
  mrr: number;
  issuedThisMonth: number;
  overdueCount: number;
  collectionRate: number;
}

interface Plan {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "Semua Status" },
  { value: "PENDING", label: "Menunggu" },
  { value: "PAID", label: "Dibayar" },
  { value: "OVERDUE", label: "Terlambat" },
  { value: "CANCELLED", label: "Dibatalkan" },
];

function formatIDR(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function BillingPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("ALL");
  const [planId, setPlanId] = useState("ALL");
  const [page, setPage] = useState(1);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      status,
      planId,
      page: String(page),
    });
    const res = await fetch(`/api/fbqrsys/billing?${params}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [status, planId, page]);

  useEffect(() => {
    // Fetch stats and plans once on mount
    fetch("/api/fbqrsys/billing/stats")
      .then((r) => r.json())
      .then(setStats);
    fetch("/api/fbqrsys/billing/plans")
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? []));
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    setPage(1);
  }, [status, planId]);

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-stone-900">Billing</h1>
        <Link
          href="/fbqrsys/billing/plans"
          className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
        >
          Kelola Plans
        </Link>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="MRR Bulan Ini"
            value={formatIDR(stats.mrr)}
            icon={TrendingUp}
          />
          <StatCard
            label="Invoice Diterbitkan"
            value={String(stats.issuedThisMonth)}
            icon={FileText}
          />
          <StatCard
            label="Invoice Terlambat"
            value={String(stats.overdueCount)}
            deltaPositive={stats.overdueCount === 0}
            delta={stats.overdueCount > 0 ? "Perlu tindakan" : "Semua lancar"}
            icon={AlertTriangle}
          />
          <StatCard
            label="Tingkat Pembayaran"
            value={`${stats.collectionRate}%`}
            deltaPositive={stats.collectionRate >= 90}
            icon={CreditCard}
          />
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="ALL">Semua Plan</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <th className="w-[160px] px-4 py-3 text-left">Invoice #</th>
                <th className="min-w-[180px] px-4 py-3 text-left">Merchant</th>
                <th className="w-[120px] px-4 py-3 text-left">Plan</th>
                <th className="w-[140px] px-4 py-3 text-right">Total</th>
                <th className="w-[100px] px-4 py-3 text-left">Status</th>
                <th className="w-[180px] px-4 py-3 text-left">Periode</th>
                <th className="w-[130px] px-4 py-3 text-left">Jatuh Tempo</th>
                <th className="w-[130px] px-4 py-3 text-left">Dibayar</th>
                <th className="w-[80px] px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-stone-400"
                  >
                    Memuat...
                  </td>
                </tr>
              ) : !data?.invoices.length ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-stone-400">
                      <FileText className="h-8 w-8" />
                      <p className="text-sm font-medium">Belum ada invoice</p>
                      <p className="text-xs">
                        Invoice akan muncul setelah billing cron berjalan.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-stone-50"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-stone-700">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-stone-900">
                        {inv.subscription.merchant.restaurant?.name ??
                          inv.subscription.merchant.email}
                      </div>
                      <div className="text-xs text-stone-400">
                        {inv.subscription.merchant.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {inv.subscription.plan.name}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-stone-900">
                      {formatIDR(inv.total)}
                    </td>
                    <td className="px-4 py-3">
                      <BillingInvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {formatDate(inv.dueAt)}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {inv.paidAt ? formatDate(inv.paidAt) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {inv.pdfUrl ? (
                        <a
                          href={inv.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-orange-600 hover:underline"
                        >
                          PDF
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-stone-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-stone-100 px-4 py-3">
            <p className="text-xs text-stone-500">
              {data.total} invoice · Halaman {data.page} dari {data.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-stone-200 text-stone-600 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page === data.totalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-stone-200 text-stone-600 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
