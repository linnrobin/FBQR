"use client";

/**
 * FBQRSYS Create Merchant form.
 * Route: /fbqrsys/merchants/new
 * Requires: merchants:create
 *
 * Spec: docs/platform-owner.md § Screen 5 — Create Merchant Form
 */
import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
}

interface Admin {
  id: string;
  email: string;
}

function formatIDR(v: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(v);
}

export default function NewMerchantPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [staff, setStaff] = useState<Admin[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [restaurantName, setRestaurantName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [cuisineType, setCuisineType] = useState("");
  const [phone, setPhone] = useState("");
  const [planId, setPlanId] = useState("");
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  const [isTrial, setIsTrial] = useState(true);
  const [trialDays, setTrialDays] = useState(14);
  const [multiBranch, setMultiBranch] = useState(false);
  const [branchLimit, setBranchLimit] = useState(1);
  const [notes, setNotes] = useState("");
  const [assignedToAdminId, setAssignedToAdminId] = useState("");

  useEffect(() => {
    fetch("/api/fbqrsys/plans")
      .then((r) => r.json())
      .then((d) => {
        setPlans(d.plans ?? []);
        if (d.plans?.length) setPlanId(d.plans[0].id);
      });
    fetch("/api/fbqrsys/staff")
      .then((r) => r.json())
      .then((d) => setStaff(d.staff ?? []));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/fbqrsys/merchants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantName,
        email,
        password,
        cuisineType: cuisineType || undefined,
        phone: phone || undefined,
        planId,
        billingCycle,
        isTrial,
        trialDays,
        multiBranchEnabled: multiBranch,
        branchLimit: multiBranch ? branchLimit : 1,
        notes: notes || undefined,
        assignedToAdminId: assignedToAdminId || undefined,
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Terjadi kesalahan. Coba lagi.");
      return;
    }

    const data = await res.json();
    router.push(`/fbqrsys/merchants/${data.merchant.id}`);
  }

  const selectedPlan = plans.find((p) => p.id === planId);

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-stone-500">
        <Link href="/fbqrsys/dashboard" className="hover:text-stone-700">FBQRSYS</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/fbqrsys/merchants" className="hover:text-stone-700">Merchants</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-stone-900 font-medium">Tambah Merchant</span>
      </nav>

      <h1 className="mb-8 text-3xl font-bold text-stone-900">Tambah Merchant Baru</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-8">
          {/* Left column: main fields */}
          <div className="space-y-5">
            <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-xl font-semibold text-stone-900">Informasi Merchant</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Nama Restoran <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="Warung Pak Budi"
                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Email Pemilik <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@restoran.com"
                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Password Sementara <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 8 karakter"
                      className="w-full rounded-md border border-stone-300 px-3 py-2 pr-16 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-500 hover:text-stone-700"
                    >
                      {showPassword ? "Sembunyikan" : "Tampilkan"}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-stone-400">
                    Merchant akan diminta mengganti password saat pertama login.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Jenis Masakan
                  </label>
                  <input
                    type="text"
                    value={cuisineType}
                    onChange={(e) => setCuisineType(e.target.value)}
                    placeholder="Masakan Indonesia, Western, dll."
                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Nomor Telepon
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+6281234567890"
                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                  <p className="mt-1 text-xs text-stone-400">Format E.164 (+62...)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: plan/settings */}
          <div className="space-y-5">
            <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-xl font-semibold text-stone-900">Langganan & Pengaturan</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Subscription Plan <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value)}
                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {selectedPlan && (
                    <p className="mt-1 text-xs text-stone-500">
                      {formatIDR(selectedPlan.priceMonthly)} / bulan ·{" "}
                      {formatIDR(selectedPlan.priceAnnual)} / tahun
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Siklus Tagihan
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="cycle"
                        value="MONTHLY"
                        checked={billingCycle === "MONTHLY"}
                        onChange={() => setBillingCycle("MONTHLY")}
                        className="text-orange-600"
                      />
                      <span className="text-sm text-stone-700">Bulanan</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="cycle"
                        value="ANNUAL"
                        checked={billingCycle === "ANNUAL"}
                        onChange={() => setBillingCycle("ANNUAL")}
                        className="text-orange-600"
                      />
                      <span className="text-sm text-stone-700">Tahunan</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={isTrial}
                      onChange={(e) => setIsTrial(e.target.checked)}
                      className="rounded border-stone-300 text-orange-600"
                    />
                    <span className="text-sm font-medium text-stone-700">Mulai dengan periode Trial</span>
                  </label>
                  {isTrial && (
                    <div className="ml-6">
                      <label className="block text-xs text-stone-500 mb-1">
                        Durasi Trial (hari)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={trialDays}
                        onChange={(e) => setTrialDays(parseInt(e.target.value, 10))}
                        className="w-24 rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-orange-500"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={multiBranch}
                      onChange={(e) => setMultiBranch(e.target.checked)}
                      className="rounded border-stone-300 text-orange-600"
                    />
                    <span className="text-sm font-medium text-stone-700">Aktifkan Multi-Cabang</span>
                  </label>
                  {multiBranch && (
                    <div className="ml-6">
                      <label className="block text-xs text-stone-500 mb-1">
                        Batas Cabang
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={branchLimit}
                        onChange={(e) => setBranchLimit(parseInt(e.target.value, 10))}
                        className="w-24 rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-orange-500"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Catatan Internal
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Catatan tentang merchant ini..."
                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Ditugaskan ke
                  </label>
                  <select
                    value={assignedToAdminId}
                    onChange={(e) => setAssignedToAdminId(e.target.value)}
                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="">— Tidak ditugaskan —</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="mt-8 flex justify-end gap-3">
          <Link
            href="/fbqrsys/merchants"
            className="rounded-md border border-stone-300 px-5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-orange-600 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Membuat Akun..." : "Buat Akun Merchant"}
          </button>
        </div>
      </form>
    </div>
  );
}
