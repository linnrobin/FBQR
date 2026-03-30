"use client";

/**
 * OrderRatingPrompt — star rating + optional comment after order COMPLETED.
 *
 * Submits to POST /api/orders/[orderId]/rating.
 * Shows confirmation after successful submission.
 * Only rendered when status = "COMPLETED" and no existing rating.
 */

import { useState } from "react";
import { Star } from "lucide-react";

interface OrderRatingPromptProps {
  orderId: string;
  existingRating?: { rating: number; comment: string | null } | null;
}

export function OrderRatingPrompt({ orderId, existingRating }: OrderRatingPromptProps) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(existingRating?.rating ?? 0);
  const [comment, setComment] = useState(existingRating?.comment ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(!!existingRating);
  const [error, setError] = useState<string | null>(null);

  if (submitted) {
    return (
      <div className="bg-white rounded-xl border border-stone-100 px-4 py-4 text-center">
        <p className="text-sm font-semibold text-stone-800">
          Terima kasih atas ulasan Anda! 💛
        </p>
        <div className="flex justify-center gap-1 mt-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              className={`h-5 w-5 ${
                i < selected ? "text-amber-400 fill-amber-400" : "text-stone-200"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  async function handleSubmit() {
    if (selected < 1) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: selected,
          ...(comment.trim() ? { comment: comment.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Gagal mengirim ulasan");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-stone-100 px-4 py-4">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">
        Ulasan
      </p>
      <p className="text-sm font-medium text-stone-800 mb-3">
        Bagaimana makanannya?
      </p>

      {/* Stars */}
      <div className="flex gap-2 mb-3">
        {Array.from({ length: 5 }, (_, i) => {
          const starVal = i + 1;
          const active = starVal <= (hovered || selected);
          return (
            <button
              key={i}
              type="button"
              className="h-10 w-10 flex items-center justify-center"
              onMouseEnter={() => setHovered(starVal)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setSelected(starVal)}
              aria-label={`${starVal} bintang`}
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  active ? "text-amber-400 fill-amber-400" : "text-stone-200"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Comment */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Tambahkan komentar... (opsional)"
        rows={2}
        maxLength={500}
        className="w-full border border-stone-300 rounded-[--border-radius] px-3 py-2 text-sm resize-none focus:outline-none focus:border-[--color-primary] mb-3"
      />

      {error && (
        <p className="text-xs text-red-600 mb-2">{error}</p>
      )}

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={selected < 1 || submitting}
        className="w-full h-10 bg-[--color-primary] text-white font-semibold rounded-[--border-radius] text-sm hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Mengirim..." : "Kirim Ulasan"}
      </button>
    </div>
  );
}
