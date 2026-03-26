"use client";

/**
 * Onboarding wizard — Step 5: Tambahkan Staff (optional, skippable)
 * Route: /merchant/onboarding/step-5
 *
 * Creates Staff accounts with PIN authentication.
 * On complete, marks wizard as done and redirects to /merchant/dashboard.
 */
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { WizardProgress } from "@/components/merchant/wizard-progress";

interface StaffMember {
  name: string;
  pin: string;
  roleName: string;
}

const ROLE_SUGGESTIONS = [
  "Kasir",
  "Dapur",
  "Supervisor",
  "Pelayan",
  "Kitchen Admin",
];

export default function OnboardingStep5Page() {
  const router = useRouter();

  const [staff, setStaff] = useState<StaffMember[]>([
    { name: "", pin: "", roleName: "Kasir" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function addStaff() {
    if (staff.length < 10) {
      setStaff([...staff, { name: "", pin: "", roleName: "Kasir" }]);
    }
  }

  function removeStaff(idx: number) {
    if (staff.length > 1) {
      setStaff(staff.filter((_, i) => i !== idx));
    }
  }

  function updateStaff(idx: number, field: keyof StaffMember, value: string) {
    setStaff(staff.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  }

  async function completeWizard(skipStaff: boolean) {
    setError(null);
    setLoading(true);

    if (!skipStaff) {
      const validStaff = staff.filter((s) => s.name.trim() && s.pin.trim());
      if (validStaff.length === 0) {
        setError("Tambahkan minimal 1 staff atau klik Lewati.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/merchant/onboarding/step/5", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff: validStaff.map((s) => ({
            name: s.name.trim(),
            pin: s.pin.trim(),
            roleName: s.roleName || undefined,
          })),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Terjadi kesalahan. Silakan coba lagi.");
        setLoading(false);
        return;
      }
    }

    // Mark wizard complete
    const completeRes = await fetch("/api/merchant/onboarding/complete", {
      method: "POST",
    });

    setLoading(false);

    if (!completeRes.ok) {
      setError("Gagal menyelesaikan setup. Silakan coba lagi.");
      return;
    }

    router.push("/merchant/dashboard");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await completeWizard(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-10 px-4">
      {/* Progress */}
      <div className="w-full max-w-lg mb-8">
        <WizardProgress currentStep={5} />
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-white rounded-xl shadow-sm border border-stone-200 p-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-stone-900">Tambahkan Staff</h1>
          <p className="text-sm text-stone-500 mt-1">
            Buat akun untuk karyawan Anda. Staff login menggunakan PIN. ⏱ ~2 menit
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {staff.map((member, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg border border-stone-200 space-y-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
                  Staff {idx + 1}
                </span>
                {staff.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStaff(idx)}
                    className="text-xs text-red-500 hover:text-red-700"
                    disabled={loading}
                  >
                    Hapus
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    Nama
                  </label>
                  <input
                    type="text"
                    value={member.name}
                    onChange={(e) => updateStaff(idx, "name", e.target.value)}
                    className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    placeholder="Nama karyawan"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    PIN (4–6 digit)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={member.pin}
                    onChange={(e) =>
                      updateStaff(idx, "pin", e.target.value.replace(/\D/g, ""))
                    }
                    className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    placeholder="1234"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  Role
                </label>
                <select
                  value={member.roleName}
                  onChange={(e) => updateStaff(idx, "roleName", e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  disabled={loading}
                >
                  {ROLE_SUGGESTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}

          {staff.length < 10 && (
            <button
              type="button"
              onClick={addStaff}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              disabled={loading}
            >
              + Tambah Staff Lagi
            </button>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between pt-2 gap-3">
            <button
              type="button"
              onClick={() => router.push("/merchant/onboarding/step-4")}
              className="px-4 py-2 text-sm font-medium text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
              disabled={loading}
            >
              ← Kembali
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => completeWizard(true)}
                className="px-4 py-2 text-sm font-medium text-stone-500 hover:text-stone-700 transition-colors"
                disabled={loading}
              >
                Lewati
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-orange-600 px-6 py-2 text-sm font-semibold text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Menyimpan…" : "Selesai & Buka Dashboard"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
