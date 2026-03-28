"use client";

/**
 * Ratings & feedback analytics section.
 * Shows average rating stat, distribution bar chart, and recent comments.
 */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Star } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { RatingsData } from "./analytics-types";

interface Props {
  data: RatingsData;
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${
            s <= rating ? "fill-amber-400 text-amber-400" : "text-stone-300"
          }`}
        />
      ))}
    </div>
  );
}

export function AnalyticsRatingsSection({ data }: Props) {
  const distData = [1, 2, 3, 4, 5].map((r) => ({
    label: `${r}★`,
    count: data.distribution.find((d) => d.rating === r)?.count ?? 0,
  }));

  return (
    <section>
      <h2 className="text-base font-semibold text-stone-800 mb-3">Ulasan & Rating</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Avg rating stat + distribution */}
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
            Rata-rata Rating
          </p>
          {data.avg !== null ? (
            <>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-4xl font-bold text-stone-900">
                  {data.avg.toFixed(1)}
                </span>
                <span className="text-stone-400 text-sm mb-1">/ 5</span>
              </div>
              <div className="flex items-center gap-2">
                <StarDisplay rating={Math.round(data.avg)} />
                <span className="text-xs text-stone-400">
                  {data.count.toLocaleString("id-ID")} ulasan
                </span>
              </div>
            </>
          ) : (
            <p className="text-2xl font-bold text-stone-400 mt-1">Belum ada</p>
          )}

          <div className="mt-4">
            <p className="text-xs font-medium text-stone-500 mb-2">Distribusi</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart
                data={distData}
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#78716c" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#78716c" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={30}
                />
                <Tooltip
                  formatter={(v) => [Number(v ?? 0), "Ulasan"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="count" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent comments */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-sm font-medium text-stone-700 mb-3">Komentar Terbaru</p>
          {data.recentComments.length > 0 ? (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {data.recentComments.map((c, i) => (
                <div key={i} className="border-b border-stone-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <StarDisplay rating={c.rating} />
                    <span className="text-xs text-stone-400">
                      {format(parseISO(c.date), "d MMM yyyy", { locale: localeId })}
                    </span>
                  </div>
                  <p className="text-sm text-stone-700 line-clamp-3">{c.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm text-stone-400">
              Belum ada komentar
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
