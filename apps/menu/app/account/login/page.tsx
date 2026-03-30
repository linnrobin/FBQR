"use client";

/**
 * Customer login page.
 * Route: /account/login
 *
 * After login, redirects to ?next= param or /account.
 */
import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/account";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Login gagal. Coba lagi.");
        return;
      }
      router.push(next);
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
        <h1 className="text-2xl font-bold text-stone-900 mb-1">Masuk</h1>
        <p className="text-sm text-stone-500 mb-6">
          Masuk untuk melihat poin loyalty dan riwayat pesanan Anda.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              autoComplete="current-password"
              required
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
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Memproses…</> : "Masuk"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-stone-500">
          Belum punya akun?{" "}
          <Link
            href={`/account/register?next=${encodeURIComponent(next)}`}
            className="font-medium text-orange-600 hover:underline"
          >
            Daftar
          </Link>
        </p>
      </div>
    </div>
  );
}
