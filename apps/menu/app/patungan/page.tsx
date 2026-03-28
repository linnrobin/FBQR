/**
 * Patungan code entry page.
 * Route: /patungan
 *
 * Participants who received a share code can enter it here to find
 * their Patungan session and pay their share.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, ArrowRight } from "lucide-react";

export default function PatunganPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async () => {
    const trimmed = code.toUpperCase().trim();
    if (trimmed.length !== 6) {
      setError("Kode Patungan harus 6 karakter.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Look up PatunganSession by shareCode
      const res = await fetch(`/api/patungan/lookup?code=${trimmed}`);
      if (!res.ok) {
        setError("Kode tidak ditemukan. Pastikan kode yang kamu masukkan benar.");
        return;
      }
      const data = (await res.json()) as { patunganId: string };
      router.push(`/patungan/${data.patunganId}`);
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Bayar Patungan</h1>
          <p className="text-sm text-stone-500 mt-2">
            Masukkan kode 6 huruf yang diberikan temanmu
          </p>
        </div>

        {/* Code input */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-5 space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.toUpperCase().slice(0, 6))
            }
            placeholder="Contoh: ABC123"
            maxLength={6}
            className="w-full h-14 border border-stone-300 rounded-xl px-4 text-2xl font-bold text-center tracking-widest text-stone-900 placeholder:text-stone-300 placeholder:text-base placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:border-blue-500"
            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
          />

          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          <button
            type="button"
            onClick={handleLookup}
            disabled={loading || code.length !== 6}
            className="w-full h-12 bg-blue-600 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              "Mencari..."
            ) : (
              <>
                Cari Patungan
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-stone-400 text-center">
          Belum punya kode? Minta temanmu yang membuat pesanan untuk membagikan kode.
        </p>
      </div>
    </div>
  );
}
