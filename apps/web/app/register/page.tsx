"use client";

/**
 * Self-service merchant registration page.
 * Route: /register (public)
 *
 * Creates a new merchant account with TRIAL status.
 * On success, shows "check your email" message.
 */
import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!agreeToTerms) {
      setError("Anda harus menyetujui Syarat & Ketentuan.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessName, email, password, agreeToTerms }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Terjadi kesalahan. Silakan coba lagi.");
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-8">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-stone-900 mb-2">Cek email Anda</h2>
            <p className="text-sm text-stone-500 mb-6">
              Kami telah mengirimkan link verifikasi ke <strong>{email}</strong>.
              Klik link tersebut untuk mengaktifkan akun Anda.
            </p>
            <p className="text-xs text-stone-400">
              Tidak menerima email?{" "}
              <button
                onClick={() => setSuccess(false)}
                className="text-orange-600 hover:underline"
              >
                Coba daftar ulang
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-stone-900">FBQR</h1>
          <p className="text-sm text-stone-500 mt-1">
            Mulai terima pesanan dari meja pelanggan
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-8">
          <h2 className="text-lg font-semibold text-stone-900 mb-1">
            Daftar Gratis
          </h2>
          <p className="text-sm text-stone-500 mb-6">
            14 hari trial, tidak perlu kartu kredit.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="businessName"
                className="block text-sm font-medium text-stone-700 mb-1"
              >
                Nama Usaha <span className="text-red-500">*</span>
              </label>
              <input
                id="businessName"
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
                placeholder="Warung Makan Bu Siti"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-stone-700 mb-1"
              >
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
                placeholder="pemilik@restoran.com"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-stone-700 mb-1"
              >
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
                placeholder="Minimal 8 karakter"
                disabled={loading}
              />
            </div>

            <div className="flex items-start gap-2">
              <input
                id="agreeToTerms"
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-stone-300 accent-orange-600"
                disabled={loading}
              />
              <label htmlFor="agreeToTerms" className="text-xs text-stone-500">
                Saya menyetujui{" "}
                <a href="#" className="text-orange-600 hover:underline">
                  Syarat & Ketentuan
                </a>{" "}
                dan{" "}
                <a href="#" className="text-orange-600 hover:underline">
                  Kebijakan Privasi
                </a>{" "}
                FBQR.
              </label>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Mendaftar…" : "Daftar Sekarang — Gratis"}
            </button>
          </form>

          <p className="text-center text-xs text-stone-400 mt-6">
            Sudah punya akun?{" "}
            <Link href="/merchant/login" className="text-orange-600 hover:underline">
              Masuk
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
