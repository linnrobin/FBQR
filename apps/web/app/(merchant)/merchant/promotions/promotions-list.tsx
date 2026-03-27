"use client";

/**
 * PromotionsList — Table of all promotions with filter, status toggle, duplicate, delete.
 *
 * Used inside PromotionsClient as the main content area.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreVertical, Plus, Edit2, Copy, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import type { DiscountType } from "./promotion-form";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PromotionRow {
  id: string;
  name: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  maximumDiscountAmount: number | null;
  minimumOrderValue: number | null;
  applicableTo: string;
  code: string | null;
  usageLimit: number | null;
  usageCount: number;
  perCustomerLimit: number | null;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<DiscountType, string> = {
  PERCENTAGE: "Persentase",
  FIXED_AMOUNT: "Fixed",
  BOGO: "BOGO",
  FREE_ITEM: "Item Gratis",
};

const TYPE_BADGE: Record<DiscountType, string> = {
  PERCENTAGE: "bg-blue-100 text-blue-800",
  FIXED_AMOUNT: "bg-green-100 text-green-800",
  BOGO: "bg-purple-100 text-purple-700",
  FREE_ITEM: "bg-amber-100 text-amber-800",
};

function formatDiscount(promo: PromotionRow): string {
  if (promo.discountType === "PERCENTAGE") return `${promo.discountValue}%`;
  if (promo.discountType === "FIXED_AMOUNT")
    return `Rp ${promo.discountValue.toLocaleString("id-ID")}`;
  return "–";
}

function isExpired(promo: PromotionRow): boolean {
  if (!promo.validTo) return false;
  return new Date(promo.validTo) < new Date();
}

function statusLabel(promo: PromotionRow): { label: string; cls: string } {
  if (!promo.isActive) return { label: "Tidak Aktif", cls: "bg-gray-100 text-gray-600" };
  if (isExpired(promo)) return { label: "Kedaluwarsa", cls: "bg-red-100 text-red-700" };
  return { label: "Aktif", cls: "bg-green-100 text-green-700" };
}

// ─── Kebab Menu ───────────────────────────────────────────────────────────────

function RowActions({
  promo,
  onToggle,
  onDuplicate,
  onDelete,
}: {
  promo: PromotionRow;
  onToggle: (id: string, isActive: boolean) => void;
  onDuplicate: (promo: PromotionRow) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/merchant/promotions/${promo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !promo.isActive }),
      });
      if (res.ok) {
        setOpen(false);
        onToggle(promo.id, !promo.isActive);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Gagal mengubah status");
      }
    } catch {
      setError("Koneksi gagal");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/merchant/promotions/${promo.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setOpen(false);
        onDelete(promo.id);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Gagal menghapus");
      }
    } catch {
      setError("Koneksi gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setError(null); }}
        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Aksi"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-sm">
            {error && (
              <p className="px-3 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">{error}</p>
            )}
            <Link
              href={`/merchant/promotions/${promo.id}/edit`}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700"
              onClick={() => setOpen(false)}
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit
            </Link>
            <button
              type="button"
              disabled={loading}
              onClick={() => { setOpen(false); onDuplicate(promo); }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700 disabled:opacity-50"
            >
              <Copy className="h-3.5 w-3.5" />
              Duplikat
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleToggle}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700 disabled:opacity-50"
            >
              {promo.isActive ? (
                <ToggleLeft className="h-3.5 w-3.5" />
              ) : (
                <ToggleRight className="h-3.5 w-3.5" />
              )}
              {promo.isActive ? "Nonaktifkan" : "Aktifkan"}
            </button>
            <hr className="my-1 border-gray-100" />
            <button
              type="button"
              disabled={loading}
              onClick={handleDelete}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-600 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hapus
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface PromotionsListProps {
  initialPromotions: PromotionRow[];
}

export function PromotionsList({ initialPromotions }: PromotionsListProps) {
  const router = useRouter();
  const [promotions, setPromotions] = useState<PromotionRow[]>(initialPromotions);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "expired">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | DiscountType>("all");
  const [duplicating, setDuplicating] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  // Filter
  const visible = promotions.filter((p) => {
    if (typeFilter !== "all" && p.discountType !== typeFilter) return false;
    if (statusFilter === "active") return p.isActive && !isExpired(p);
    if (statusFilter === "inactive") return !p.isActive;
    if (statusFilter === "expired") return isExpired(p);
    return true;
  });

  function handleToggle(id: string, isActive: boolean) {
    setPromotions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive } : p))
    );
  }

  function handleDelete(id: string) {
    setPromotions((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleDuplicate(promo: PromotionRow) {
    setDuplicating(true);
    setDuplicateError(null);
    try {
      const payload = {
        name: `${promo.name} (Salinan)`,
        description: promo.description,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        maximumDiscountAmount: promo.maximumDiscountAmount,
        minimumOrderValue: promo.minimumOrderValue,
        applicableTo: promo.applicableTo,
        applicableItemIds: promo.applicableTo !== "ALL_ITEMS" ? [] : [],
        code: null, // reset code — codes must be unique
        usageLimit: promo.usageLimit,
        perCustomerLimit: promo.perCustomerLimit,
        validFrom: promo.validFrom,
        validTo: promo.validTo,
        isActive: false, // always start inactive
      };
      const res = await fetch("/api/merchant/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.promotion) {
          setPromotions((prev) => [data.promotion, ...prev]);
        } else {
          router.refresh();
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setDuplicateError(data.error ?? "Gagal menduplikat promosi");
      }
    } catch {
      setDuplicateError("Koneksi gagal. Coba lagi.");
    } finally {
      setDuplicating(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900 flex-1">Promosi</h1>
        <Link
          href="/merchant/promotions/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Buat Promosi
        </Link>
      </div>

      {/* Duplicate error */}
      {duplicateError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {duplicateError}
        </div>
      )}
      {duplicating && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
          Menduplikat promosi...
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Tidak Aktif</option>
          <option value="expired">Kedaluwarsa</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Semua Tipe</option>
          <option value="PERCENTAGE">Persentase</option>
          <option value="FIXED_AMOUNT">Fixed</option>
          <option value="BOGO">BOGO</option>
          <option value="FREE_ITEM">Item Gratis</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <p className="text-gray-500 mb-1">
              {promotions.length === 0
                ? "Belum ada promosi. Buat promosi pertama Anda."
                : "Tidak ada promosi yang sesuai filter."}
            </p>
            {promotions.length === 0 && (
              <Link
                href="/merchant/promotions/new"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Buat Promosi
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                    Nama
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">
                    Tipe
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">
                    Diskon
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">
                    Kode
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">
                    Penggunaan
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[160px]">
                    Berlaku Hingga
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">
                    Status
                  </th>
                  <th className="w-[60px]" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {visible.map((promo) => {
                  const { label: statusLbl, cls: statusCls } = statusLabel(promo);
                  return (
                    <tr key={promo.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm text-gray-900">{promo.name}</div>
                        {promo.description && (
                          <div className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">
                            {promo.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            TYPE_BADGE[promo.discountType]
                          }`}
                        >
                          {TYPE_LABELS[promo.discountType]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatDiscount(promo)}
                      </td>
                      <td className="px-4 py-3">
                        {promo.code ? (
                          <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                            {promo.code}
                          </code>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Auto</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {promo.usageCount}
                        {promo.usageLimit !== null ? ` / ${promo.usageLimit}` : " / ∞"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {promo.validTo
                          ? new Date(promo.validTo).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "Tidak Terbatas"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusCls}`}
                        >
                          {statusLbl}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <RowActions
                          promo={promo}
                          onToggle={handleToggle}
                          onDuplicate={handleDuplicate}
                          onDelete={handleDelete}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
