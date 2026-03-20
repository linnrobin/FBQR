"use client";

/**
 * FBQRSYS Merchant Detail page.
 * Route: /fbqrsys/merchants/[merchantId]
 * Requires: merchants:read
 *
 * Layout: breadcrumb + two-column (main left, sidebar right).
 * Spec: docs/platform-owner.md § Screen 4 — Merchant Detail
 */
import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MerchantStatusBadge, BillingInvoiceStatusBadge } from "@/components/fbqrsys/status-badge";
import { ChevronRight, Building2, AlertTriangle, CreditCard, Clock } from "lucide-react";

interface Branch {
  id: string;
  name: string;
  address: string | null;
  _count: { tables: number };
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  total: number;
  status: string;
  paidAt: string | null;
  pdfUrl: string | null;
}

interface MerchantDetail {
  id: string;
  email: string;
  status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
  trialEndsAt: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  multiBranchEnabled: boolean;
  branchLimit: number;
  notes: string | null;
  assignedToAdminId: string | null;
  createdAt: string;
  restaurant: {
    id: string;
    name: string;
    cuisineType: string | null;
    email: string | null;
    branches: Branch[];
  } | null;
  subscription: {
    cycle: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    autoRenew: boolean;
    failedAttempts: number;
    plan: {
      name: string;
      priceMonthly: number;
      priceAnnual: number;
    };
    invoices: Invoice[];
  } | null;
  assignedAdmin: { id: string; email: string } | null;
}

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

export default function MerchantDetailPage({
  params,
}: {
  params: Promise<{ merchantId: string }>;
}) {
  const { merchantId } = use(params);
  const router = useRouter();
  const [merchant, setMerchant] = useState<MerchantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [suspendLoading, setSuspendLoading] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [showExtendTrial, setShowExtendTrial] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<{ id: string; name: string; priceMonthly: number }[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedCycle, setSelectedCycle] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  const [extendDays, setExtendDays] = useState("14");
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/fbqrsys/merchants/${merchantId}`)
      .then((r) => r.json())
      .then((d) => {
        setMerchant(d.merchant);
        setNotes(d.merchant?.notes ?? "");
      })
      .finally(() => setLoading(false));
  }, [merchantId]);

  async function saveNotes() {
    setNotesSaving(true);
    await fetch(`/api/fbqrsys/merchants/${merchantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setNotesSaving(false);
  }

  // Load available plans lazily when the modal is opened
  const loadPlans = useCallback(async () => {
    if (availablePlans.length > 0) return;
    const res = await fetch("/api/fbqrsys/billing/plans");
    if (res.ok) {
      const d = await res.json();
      setAvailablePlans(d.plans ?? []);
      if (d.plans?.length) setSelectedPlanId(d.plans[0].id);
    }
  }, [availablePlans.length]);

  async function handleChangePlan() {
    if (!selectedPlanId) return;
    setSubscriptionLoading(true);
    const res = await fetch(`/api/fbqrsys/merchants/${merchantId}/subscription`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "change_plan", planId: selectedPlanId, cycle: selectedCycle }),
    });
    setSubscriptionLoading(false);
    if (res.ok) {
      setShowChangePlan(false);
      // Reload merchant data to reflect plan change
      const refresh = await fetch(`/api/fbqrsys/merchants/${merchantId}`);
      if (refresh.ok) {
        const d = await refresh.json();
        setMerchant(d.merchant);
      }
    }
  }

  async function handleExtendTrial() {
    const days = parseInt(extendDays, 10);
    if (!days || days < 1) return;
    setSubscriptionLoading(true);
    const res = await fetch(`/api/fbqrsys/merchants/${merchantId}/subscription`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "extend_trial", days }),
    });
    setSubscriptionLoading(false);
    if (res.ok) {
      setShowExtendTrial(false);
      const refresh = await fetch(`/api/fbqrsys/merchants/${merchantId}`);
      if (refresh.ok) {
        const d = await refresh.json();
        setMerchant(d.merchant);
      }
    }
  }

  async function handleSuspend() {
    if (!merchant) return;
    const action =
      merchant.status === "SUSPENDED" ? "unsuspend" : "suspend";
    setSuspendLoading(true);
    const res = await fetch(`/api/fbqrsys/merchants/${merchantId}/suspend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: suspendReason || undefined }),
    });
    setSuspendLoading(false);
    if (res.ok) {
      const data = await res.json();
      setMerchant((m) =>
        m ? { ...m, status: data.merchant.status, suspendedAt: data.merchant.suspendedAt } : m
      );
      setShowSuspendConfirm(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-6 w-64 animate-pulse rounded bg-stone-200 mb-8" />
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-lg bg-stone-200" />
            ))}
          </div>
          <div className="space-y-4">
            <div className="h-48 animate-pulse rounded-lg bg-stone-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="p-8 text-center">
        <p className="text-stone-500">Merchant tidak ditemukan.</p>
        <Link href="/fbqrsys/merchants" className="mt-4 text-orange-600 hover:underline">
          Kembali ke daftar
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-stone-500">
        <Link href="/fbqrsys/dashboard" className="hover:text-stone-700">FBQRSYS</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/fbqrsys/merchants" className="hover:text-stone-700">Merchants</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-stone-900 font-medium">
          {merchant.restaurant?.name ?? merchant.email}
        </span>
      </nav>

      {/* Page header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-stone-900">
              {merchant.restaurant?.name ?? merchant.email}
            </h1>
            <MerchantStatusBadge status={merchant.status} />
          </div>
          <p className="mt-1 text-sm text-stone-500">{merchant.email}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSuspendConfirm(true)}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              merchant.status === "SUSPENDED"
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
          >
            {merchant.status === "SUSPENDED" ? "Aktifkan Kembali" : "Tangguhkan"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Main content */}
        <div className="col-span-2 space-y-6">
          {/* Section 1: Restaurant Info */}
          <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-stone-900">Info Restoran</h2>
            <div className="grid grid-cols-2 gap-y-4">
              <span className="text-sm text-stone-500">Nama Restoran</span>
              <span className="text-sm font-medium text-stone-900">
                {merchant.restaurant?.name ?? "—"}
              </span>
              <span className="text-sm text-stone-500">Jenis Masakan</span>
              <span className="text-sm font-medium text-stone-900">
                {merchant.restaurant?.cuisineType ?? "—"}
              </span>
              <span className="text-sm text-stone-500">Email Restoran</span>
              <span className="text-sm font-medium text-stone-900">
                {merchant.restaurant?.email ?? merchant.email}
              </span>
              <span className="text-sm text-stone-500">Bergabung</span>
              <span className="text-sm font-medium text-stone-900">
                {formatDate(merchant.createdAt)}
              </span>
              {merchant.trialEndsAt && (
                <>
                  <span className="text-sm text-stone-500">Trial Berakhir</span>
                  <span className="text-sm font-medium text-stone-900">
                    {formatDate(merchant.trialEndsAt)}
                  </span>
                </>
              )}
              {merchant.suspendedAt && (
                <>
                  <span className="text-sm text-stone-500">Ditangguhkan Pada</span>
                  <span className="text-sm font-medium text-red-600">
                    {formatDate(merchant.suspendedAt)}
                  </span>
                  <span className="text-sm text-stone-500">Alasan Penangguhan</span>
                  <span className="text-sm font-medium text-stone-900">
                    {merchant.suspendedReason ?? "—"}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Section 2: Subscription */}
          {merchant.subscription && (
            <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold text-stone-900">Langganan</h2>
              <div className="grid grid-cols-2 gap-y-4">
                <span className="text-sm text-stone-500">Plan</span>
                <span className="text-sm font-medium text-stone-900">
                  {merchant.subscription.plan.name}
                </span>
                <span className="text-sm text-stone-500">Harga</span>
                <span className="text-sm font-medium text-stone-900">
                  {merchant.subscription.cycle === "ANNUAL"
                    ? formatIDR(merchant.subscription.plan.priceAnnual) + " / tahun"
                    : formatIDR(merchant.subscription.plan.priceMonthly) + " / bulan"}
                </span>
                <span className="text-sm text-stone-500">Siklus</span>
                <span className="text-sm font-medium text-stone-900">
                  {merchant.subscription.cycle === "ANNUAL" ? "Tahunan" : "Bulanan"}
                </span>
                <span className="text-sm text-stone-500">Periode Saat Ini</span>
                <span className="text-sm font-medium text-stone-900">
                  {formatDate(merchant.subscription.currentPeriodStart)} –{" "}
                  {formatDate(merchant.subscription.currentPeriodEnd)}
                </span>
                <span className="text-sm text-stone-500">Auto-Perpanjang</span>
                <span className="text-sm font-medium text-stone-900">
                  {merchant.subscription.autoRenew ? "Ya" : "Tidak"}
                </span>
                {merchant.subscription.failedAttempts > 0 && (
                  <>
                    <span className="text-sm text-stone-500">Gagal Bayar</span>
                    <span className="text-sm font-semibold text-red-600">
                      {merchant.subscription.failedAttempts}× percobaan
                    </span>
                  </>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    setShowChangePlan(true);
                    loadPlans();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  <CreditCard className="h-4 w-4" />
                  Ganti Plan
                </button>
                <button
                  onClick={() => setShowExtendTrial(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  <Clock className="h-4 w-4" />
                  Perpanjang Trial
                </button>
              </div>
            </div>
          )}

          {/* Section 3: Branches */}
          <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-stone-900">Cabang</h2>
            <div className="mb-4 grid grid-cols-2 gap-y-3">
              <span className="text-sm text-stone-500">Multi-Cabang</span>
              <span className="text-sm font-medium text-stone-900">
                {merchant.multiBranchEnabled ? "Aktif" : "Tidak Aktif"}
              </span>
              <span className="text-sm text-stone-500">Batas Cabang</span>
              <span className="text-sm font-medium text-stone-900">
                {merchant.branchLimit}
              </span>
            </div>
            {merchant.restaurant?.branches.length ? (
              <div className="space-y-2">
                {merchant.restaurant.branches.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-md bg-stone-50 px-4 py-3 text-sm"
                  >
                    <div>
                      <span className="font-medium text-stone-900">{b.name}</span>
                      {b.address && (
                        <span className="ml-2 text-stone-500">{b.address}</span>
                      )}
                    </div>
                    <span className="text-stone-400">{b._count.tables} meja</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-400">Belum ada cabang.</p>
            )}
          </div>

          {/* Section 4: Billing History */}
          {merchant.subscription?.invoices.length ? (
            <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold text-stone-900">Riwayat Tagihan</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="pb-2 text-left font-semibold text-stone-600">Invoice #</th>
                    <th className="pb-2 text-left font-semibold text-stone-600">Periode</th>
                    <th className="pb-2 text-left font-semibold text-stone-600">Total</th>
                    <th className="pb-2 text-left font-semibold text-stone-600">Status</th>
                    <th className="pb-2 text-left font-semibold text-stone-600">Dibayar</th>
                  </tr>
                </thead>
                <tbody>
                  {merchant.subscription.invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-stone-100">
                      <td className="py-3 font-mono text-xs text-stone-700">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 text-stone-600">
                        {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                      </td>
                      <td className="py-3 font-medium text-stone-900">
                        {formatIDR(inv.total)}
                      </td>
                      <td className="py-3">
                        <BillingInvoiceStatusBadge status={inv.status} />
                      </td>
                      <td className="py-3 text-stone-500">
                        {inv.paidAt ? formatDate(inv.paidAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Admin Notes */}
          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-base font-semibold text-stone-900">Catatan Internal</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              rows={5}
              placeholder="Tambahkan catatan tentang merchant ini..."
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none"
            />
            <button
              onClick={saveNotes}
              disabled={notesSaving}
              className="mt-2 rounded-md bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-200 disabled:opacity-50"
            >
              {notesSaving ? "Menyimpan..." : "Simpan Catatan"}
            </button>
          </div>

          {/* Quick Info */}
          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-base font-semibold text-stone-900">Info Platform</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">ID Merchant</span>
                <span className="font-mono text-xs text-stone-700 truncate max-w-[120px]">
                  {merchant.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Ditugaskan ke</span>
                <span className="text-stone-700">
                  {merchant.assignedAdmin?.email ?? "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-lg border border-red-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <h3 className="text-base font-semibold text-red-700">Zona Berbahaya</h3>
            </div>
            <button
              onClick={() => setShowSuspendConfirm(true)}
              className={`w-full rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                merchant.status === "SUSPENDED"
                  ? "border border-green-300 text-green-700 hover:bg-green-50"
                  : "border border-red-300 text-red-700 hover:bg-red-50"
              }`}
            >
              {merchant.status === "SUSPENDED"
                ? "Aktifkan Akun Merchant"
                : "Tangguhkan Akun Merchant"}
            </button>
          </div>
        </div>
      </div>

      {/* Change Plan Modal */}
      {showChangePlan && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-stone-900">Ganti Subscription Plan</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">Plan *</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {availablePlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(p.priceMonthly)}/bln
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">Siklus Billing</label>
                <div className="flex gap-3">
                  {(["MONTHLY", "ANNUAL"] as const).map((c) => (
                    <label key={c} className="flex items-center gap-2 text-sm text-stone-700">
                      <input
                        type="radio"
                        value={c}
                        checked={selectedCycle === c}
                        onChange={() => setSelectedCycle(c)}
                      />
                      {c === "MONTHLY" ? "Bulanan" : "Tahunan"}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowChangePlan(false)}
                className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Batal
              </button>
              <button
                onClick={handleChangePlan}
                disabled={subscriptionLoading || !selectedPlanId}
                className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {subscriptionLoading ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Trial Modal */}
      {showExtendTrial && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-stone-900">Perpanjang Trial</h3>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                Tambah Hari *
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              {merchant.trialEndsAt && (
                <p className="mt-1 text-xs text-stone-400">
                  Trial saat ini berakhir: {formatDate(merchant.trialEndsAt)}
                </p>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowExtendTrial(false)}
                className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Batal
              </button>
              <button
                onClick={handleExtendTrial}
                disabled={subscriptionLoading}
                className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {subscriptionLoading ? "Menyimpan..." : "Perpanjang"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Confirmation Modal */}
      {showSuspendConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-stone-900">
              {merchant.status === "SUSPENDED"
                ? "Aktifkan Kembali Merchant?"
                : "Tangguhkan Merchant?"}
            </h3>
            <p className="mb-4 text-sm text-stone-600">
              {merchant.status === "SUSPENDED"
                ? `Merchant "${merchant.restaurant?.name ?? merchant.email}" akan diaktifkan kembali. Mereka dapat login dan menerima pesanan.`
                : `Merchant "${merchant.restaurant?.name ?? merchant.email}" tidak dapat login atau menerima pesanan baru.`}
            </p>
            {merchant.status !== "SUSPENDED" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Alasan (opsional)
                </label>
                <input
                  type="text"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="contoh: Pembayaran gagal 3×"
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSuspendConfirm(false)}
                className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Batal
              </button>
              <button
                onClick={handleSuspend}
                disabled={suspendLoading}
                className={`rounded-md px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                  merchant.status === "SUSPENDED"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {suspendLoading
                  ? "Memproses..."
                  : merchant.status === "SUSPENDED"
                    ? "Ya, Aktifkan"
                    : "Ya, Tangguhkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
