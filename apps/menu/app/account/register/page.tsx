"use client";

/**
 * Customer registration page.
 * Route: /account/register
 *
 * After registration, redirects to ?next= param or /account.
 */
import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/account";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/auth/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Pendaftaran gagal. Coba lagi.");
        return;
      }
      if (data.emailVerificationRequired) {
        setSuccess("Akun dibuat! Cek email Anda untuk verifikasi sebelum melanjutkan.");
      } else {
        router.push(next);
      }
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full border border-stone-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500";

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
        <h1 className="text-2xl font-bold text-stone-900 mb-1">Daftar</h1>
        <p className="text-sm text-stone-500 mb-6">
          Buat akun untuk kumpulkan poin loyalty dan lacak pesanan Anda.
        </p>

        {success ? (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            {success}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Nama</label>
              <input
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="Nama lengkap"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="email@kamu.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Kata Sandi</label>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="Minimal 8 karakter"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Memproses…</> : "Daftar"}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-stone-500">
          Sudah punya akun?{" "}
          <Link
            href={`/account/login?next=${encodeURIComponent(next)}`}
            className="font-medium text-orange-600 hover:underline"
          >
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
