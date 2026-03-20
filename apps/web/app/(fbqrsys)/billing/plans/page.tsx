"use client";

/**
 * FBQRSYS Subscription Plans page.
 * Route: /fbqrsys/billing/plans
 * Requires: billing:manage
 *
 * Screen 6 — Subscription Plans List
 * Spec: docs/platform-owner.md § Screen 6 — Subscription Plans List
 *
 * Card grid layout. Create/Edit via modal. Deactivate in-place.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Edit2, ToggleLeft, ToggleRight, ChevronRight } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceAnnual: number;
  features: string[];
  isActive: boolean;
  tableLimitCount: number | null;
  menuItemLimitCount: number | null;
  branchLimitCount: number | null;
  layoutAllowed: string[];
  _count: { subscriptions: number };
}

interface PlanFormData {
  name: string;
  description: string;
  priceMonthly: string;
  priceAnnual: string;
  features: string; // newline-separated
  isActive: boolean;
  tableLimitCount: string;
  menuItemLimitCount: string;
  branchLimitCount: string;
}

const emptyForm: PlanFormData = {
  name: "",
  description: "",
  priceMonthly: "0",
  priceAnnual: "0",
  features: "",
  isActive: true,
  tableLimitCount: "",
  menuItemLimitCount: "",
  branchLimitCount: "",
};

function formatIDR(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function PlanModal({
  plan,
  onClose,
  onSaved,
}: {
  plan: Plan | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<PlanFormData>(
    plan
      ? {
          name: plan.name,
          description: plan.description ?? "",
          priceMonthly: String(plan.priceMonthly),
          priceAnnual: String(plan.priceAnnual),
          features: plan.features.join("\n"),
          isActive: plan.isActive,
          tableLimitCount: plan.tableLimitCount != null ? String(plan.tableLimitCount) : "",
          menuItemLimitCount:
            plan.menuItemLimitCount != null ? String(plan.menuItemLimitCount) : "",
          branchLimitCount:
            plan.branchLimitCount != null ? String(plan.branchLimitCount) : "",
        }
      : emptyForm
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      priceMonthly: parseInt(form.priceMonthly, 10) || 0,
      priceAnnual: parseInt(form.priceAnnual, 10) || 0,
      features: form.features
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
      isActive: form.isActive,
      tableLimitCount: form.tableLimitCount
        ? parseInt(form.tableLimitCount, 10)
        : null,
      menuItemLimitCount: form.menuItemLimitCount
        ? parseInt(form.menuItemLimitCount, 10)
        : null,
      branchLimitCount: form.branchLimitCount
        ? parseInt(form.branchLimitCount, 10)
        : null,
      layoutAllowed: [],
    };

    const url = plan
      ? `/api/fbqrsys/billing/plans/${plan.id}`
      : "/api/fbqrsys/billing/plans";
    const method = plan ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (res.ok) {
      onSaved();
    } else {
      const d = await res.json();
      setError(d.error ?? "Terjadi kesalahan");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-stone-900">
            {plan ? "Edit Plan" : "Tambah Plan Baru"}
          </h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Nama Plan *
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Deskripsi
            </label>
            <input
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                Harga / Bulan (IDR)
              </label>
              <input
                type="number"
                min="0"
                value={form.priceMonthly}
                onChange={(e) =>
                  setForm({ ...form, priceMonthly: e.target.value })
                }
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                Harga / Tahun (IDR)
              </label>
              <input
                type="number"
                min="0"
                value={form.priceAnnual}
                onChange={(e) =>
                  setForm({ ...form, priceAnnual: e.target.value })
                }
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">
                Maks. Meja
              </label>
              <input
                type="number"
                min="1"
                placeholder="∞"
                value={form.tableLimitCount}
                onChange={(e) =>
                  setForm({ ...form, tableLimitCount: e.target.value })
                }
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">
                Maks. Menu
              </label>
              <input
                type="number"
                min="1"
                placeholder="∞"
                value={form.menuItemLimitCount}
                onChange={(e) =>
                  setForm({ ...form, menuItemLimitCount: e.target.value })
                }
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">
                Maks. Cabang
              </label>
              <input
                type="number"
                min="1"
                placeholder="∞"
                value={form.branchLimitCount}
                onChange={(e) =>
                  setForm({ ...form, branchLimitCount: e.target.value })
                }
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Fitur (satu per baris)
            </label>
            <textarea
              rows={4}
              value={form.features}
              onChange={(e) => setForm({ ...form, features: e.target.value })}
              placeholder="Fitur AI&#10;Program loyalitas&#10;Multiple cabang"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-stone-700">Aktif</label>
            <button
              type="button"
              onClick={() => setForm({ ...form, isActive: !form.isActive })}
              className={`text-xl ${form.isActive ? "text-orange-500" : "text-stone-300"}`}
            >
              {form.isActive ? (
                <ToggleRight className="h-6 w-6" />
              ) : (
                <ToggleLeft className="h-6 w-6" />
              )}
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalPlan, setModalPlan] = useState<Plan | "new" | null>(null);

  async function loadPlans() {
    setLoading(true);
    const res = await fetch("/api/fbqrsys/billing/plans");
    if (res.ok) {
      const d = await res.json();
      setPlans(d.plans ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadPlans();
  }, []);

  async function handleDeactivate(planId: string) {
    if (!confirm("Nonaktifkan plan ini? Merchant aktif tidak terpengaruh.")) return;
    await fetch(`/api/fbqrsys/billing/plans/${planId}`, { method: "DELETE" });
    await loadPlans();
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Header + breadcrumb */}
      <div className="mb-2 flex items-center gap-2 text-sm text-stone-400">
        <Link href="/fbqrsys/billing" className="hover:text-stone-600">
          Billing
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-stone-700">Plans</span>
      </div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-stone-900">
          Subscription Plans
        </h1>
        <button
          onClick={() => setModalPlan("new")}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
        >
          <Plus className="h-4 w-4" />
          Tambah Plan
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-stone-400">Memuat...</p>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-stone-400">
          <p className="text-sm font-medium">Belum ada plan</p>
          <button
            onClick={() => setModalPlan("new")}
            className="text-sm text-orange-600 hover:underline"
          >
            + Tambah plan pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-xl border border-stone-200 p-5 shadow-sm ${
                plan.name.toLowerCase().includes("free") ||
                plan.name.toLowerCase().includes("warung")
                  ? "bg-stone-50"
                  : "bg-white"
              } ${!plan.isActive ? "opacity-60" : ""}`}
            >
              <div className="mb-1 flex items-start justify-between">
                <h3 className="text-lg font-semibold text-stone-900">
                  {plan.name}
                </h3>
                {!plan.isActive && (
                  <span className="rounded bg-stone-100 px-2 py-0.5 text-xs text-stone-400">
                    Nonaktif
                  </span>
                )}
              </div>

              {plan.description && (
                <p className="mb-3 text-xs text-stone-500">{plan.description}</p>
              )}

              <p className="mb-4 text-2xl font-bold text-orange-600">
                {formatIDR(plan.priceMonthly)}
                <span className="text-sm font-normal text-stone-400">
                  {" "}
                  / bulan
                </span>
              </p>

              <ul className="mb-4 space-y-1 text-sm">
                <li className="text-stone-600">
                  <span className="font-medium">Meja:</span>{" "}
                  {plan.tableLimitCount != null
                    ? plan.tableLimitCount
                    : "Tidak terbatas"}
                </li>
                <li className="text-stone-600">
                  <span className="font-medium">Menu item:</span>{" "}
                  {plan.menuItemLimitCount != null
                    ? plan.menuItemLimitCount
                    : "Tidak terbatas"}
                </li>
                <li className="text-stone-600">
                  <span className="font-medium">Cabang:</span>{" "}
                  {plan.branchLimitCount != null
                    ? plan.branchLimitCount
                    : "Tidak terbatas"}
                </li>
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-stone-600">
                    <span className="text-green-500">✓</span> {f}
                  </li>
                ))}
              </ul>

              <p className="mb-4 text-xs text-stone-400">
                {plan._count.subscriptions} merchant aktif
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setModalPlan(plan)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
                >
                  <Edit2 className="h-3 w-3" />
                  Edit Plan
                </button>
                {plan.isActive && (
                  <button
                    onClick={() => handleDeactivate(plan.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-400 hover:bg-stone-50 hover:text-red-500"
                  >
                    Nonaktifkan
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalPlan !== null && (
        <PlanModal
          plan={modalPlan === "new" ? null : modalPlan}
          onClose={() => setModalPlan(null)}
          onSaved={() => {
            setModalPlan(null);
            loadPlans();
          }}
        />
      )}
    </div>
  );
}
