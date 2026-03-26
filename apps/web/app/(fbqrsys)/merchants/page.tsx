"use client";

/**
 * FBQRSYS Merchant List page.
 * Route: /fbqrsys/merchants
 * Requires: merchants:read
 *
 * Features: search, status/plan filter, sortable table, kebab menu,
 * bulk suspend (checkbox multi-select), CSV export.
 */
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MerchantStatusBadge } from "@/components/fbqrsys/status-badge";
import { Building2, Search, ChevronLeft, ChevronRight, MoreVertical, Plus } from "lucide-react";

interface MerchantRow {
  id: string;
  email: string;
  status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
  createdAt: string;
  restaurant: { id: string; name: string } | null;
  subscription: {
    plan: { id: string; name: string };
  } | null;
}

interface Plan {
  id: string;
  name: string;
}

interface ListResponse {
  merchants: MerchantRow[];
  total: number;
  page: number;
  totalPages: number;
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "Semua Status" },
  { value: "TRIAL", label: "Trial" },
  { value: "ACTIVE", label: "Aktif" },
  { value: "SUSPENDED", label: "Ditangguhkan" },
  { value: "CANCELLED", label: "Dibatalkan" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function MerchantsPage() {
  const router = useRouter();
  const [data, setData] = useState<ListResponse | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [planId, setPlanId] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchMerchants = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      search,
      status,
      planId,
      page: String(page),
    });
    const res = await fetch(`/api/fbqrsys/merchants?${params}`);
    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  }, [search, status, planId, page]);

  useEffect(() => {
    fetch("/api/fbqrsys/plans")
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? []));
  }, []);

  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setPage(1);
  }, [search, status, planId]);

  async function handleSuspend(merchantId: string, currentStatus: string) {
    const action =
      currentStatus === "SUSPENDED" ? "unsuspend" : "suspend";
    setActionLoading(merchantId);
    await fetch(`/api/fbqrsys/merchants/${merchantId}/suspend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setOpenMenuId(null);
    setActionLoading(null);
    fetchMerchants();
  }

  async function handleBulkSuspend() {
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) {
      const merchant = data?.merchants.find((m) => m.id === id);
      if (merchant && merchant.status !== "SUSPENDED") {
        await fetch(`/api/fbqrsys/merchants/${id}/suspend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "suspend" }),
        });
      }
    }
    setSelectedIds(new Set());
    fetchMerchants();
  }

  function handleExportCSV() {
    if (!data) return;
    const rows = data.merchants.filter((m) =>
      selectedIds.size > 0 ? selectedIds.has(m.id) : true
    );
    const csv = [
      ["Nama Restoran", "Email", "Status", "Plan", "Bergabung"].join(","),
      ...rows.map((m) =>
        [
          `"${m.restaurant?.name ?? ""}"`,
          m.email,
          m.status,
          m.subscription?.plan.name ?? "",
          formatDate(m.createdAt),
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "merchants.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const merchants = data?.merchants ?? [];
  const allSelected =
    merchants.length > 0 &&
    merchants.every((m) => selectedIds.has(m.id));

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(merchants.map((m) => m.id)));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-stone-900">Merchants</h1>
        <Link
          href="/fbqrsys/merchants/new"
          className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Tambah Merchant
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Cari nama restoran atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-stone-300 pl-9 pr-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 w-64"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
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
          className="rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
        >
          <option value="ALL">Semua Plan</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-md bg-orange-50 border border-orange-200 px-4 py-2">
          <span className="text-sm text-orange-700 font-medium">
            {selectedIds.size} merchant dipilih
          </span>
          <button
            onClick={handleBulkSuspend}
            className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
          >
            Tangguhkan Terpilih
          </button>
          <button
            onClick={handleExportCSV}
            className="rounded-md border border-stone-300 px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            Export CSV
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-stone-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="mb-4 h-14 animate-pulse rounded bg-stone-100"
              />
            ))}
          </div>
        ) : merchants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-12 w-12 text-stone-300 mb-4" />
            <h3 className="text-base font-semibold text-stone-900 mb-1">
              Belum ada merchant
            </h3>
            <p className="text-sm text-stone-500 mb-4">
              Tambahkan merchant pertama ke platform.
            </p>
            <Link
              href="/fbqrsys/merchants/new"
              className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
            >
              <Plus className="h-4 w-4" />
              Tambah Merchant
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-stone-300"
                  />
                </th>
                <th className="min-w-[200px] px-4 py-3 text-left font-semibold text-stone-700">
                  Nama Restoran
                </th>
                <th className="min-w-[200px] px-4 py-3 text-left font-semibold text-stone-700">
                  Email
                </th>
                <th className="w-[120px] px-4 py-3 text-left font-semibold text-stone-700">
                  Status
                </th>
                <th className="w-[120px] px-4 py-3 text-left font-semibold text-stone-700">
                  Plan
                </th>
                <th className="w-[130px] px-4 py-3 text-left font-semibold text-stone-700">
                  Bergabung
                </th>
                <th className="w-[60px] px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {merchants.map((merchant) => (
                <tr
                  key={merchant.id}
                  className="border-b border-stone-100 h-14 hover:bg-stone-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(merchant.id)}
                      onChange={() => toggleOne(merchant.id)}
                      className="rounded border-stone-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/fbqrsys/merchants/${merchant.id}`}
                      className="font-medium text-stone-900 hover:text-orange-600"
                    >
                      {merchant.restaurant?.name ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{merchant.email}</td>
                  <td className="px-4 py-3">
                    <MerchantStatusBadge status={merchant.status} />
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {merchant.subscription?.plan.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {formatDate(merchant.createdAt)}
                  </td>
                  <td className="px-4 py-3 relative">
                    <button
                      onClick={() =>
                        setOpenMenuId(
                          openMenuId === merchant.id ? null : merchant.id
                        )
                      }
                      className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {openMenuId === merchant.id && (
                      <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-stone-200 bg-white shadow-lg py-1">
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            router.push(`/fbqrsys/merchants/${merchant.id}`);
                          }}
                          className="block w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50"
                        >
                          Lihat Detail
                        </button>
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            router.push(`/fbqrsys/merchants/${merchant.id}`);
                          }}
                          className="block w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50"
                        >
                          Edit
                        </button>
                        <button
                          disabled={actionLoading === merchant.id}
                          onClick={() =>
                            handleSuspend(merchant.id, merchant.status)
                          }
                          className={`block w-full px-4 py-2 text-left text-sm hover:bg-stone-50 ${
                            merchant.status === "SUSPENDED"
                              ? "text-green-700"
                              : "text-red-600"
                          }`}
                        >
                          {merchant.status === "SUSPENDED"
                            ? "Aktifkan Kembali"
                            : "Tangguhkan"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-stone-600">
          <p>
            Menampilkan {(page - 1) * 25 + 1}–
            {Math.min(page * 25, data.total)} dari {data.total} data
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 rounded-md border border-stone-300 px-3 py-1.5 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Sebelumnya
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="flex items-center gap-1 rounded-md border border-stone-300 px-3 py-1.5 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Berikutnya
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Close dropdown on outside click */}
      {openMenuId && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setOpenMenuId(null)}
        />
      )}
    </div>
  );
}
