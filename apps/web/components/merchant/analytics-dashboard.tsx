"use client";

/**
 * Analytics dashboard orchestrator.
 * Manages date range + branch selector state; fetches data from
 * GET /api/merchant/analytics and passes it to section sub-components.
 */
import { useState, useEffect, useCallback } from "react";
import { subDays, subMonths, format } from "date-fns";
import { Loader2, AlertCircle } from "lucide-react";
import type { AnalyticsData, Branch } from "./analytics-types";
import { AnalyticsRevenueSection } from "./analytics-revenue-section";
import { AnalyticsOrdersSection } from "./analytics-orders-section";
import { AnalyticsMenuTable } from "./analytics-menu-table";
import { AnalyticsRatingsSection } from "./analytics-ratings-section";
import { AnalyticsExportButton } from "./analytics-export-button";

type DateRange = "7d" | "30d" | "90d" | "custom";

interface Props {
  branches: Branch[];
}

const RANGE_LABELS: Record<string, string> = {
  "7d": "7 Hari Terakhir",
  "30d": "30 Hari Terakhir",
  "90d": "3 Bulan Terakhir",
  custom: "Kustom",
};

function getPresetRange(range: DateRange): { from: Date; to: Date } {
  const to = new Date();
  let from: Date;
  switch (range) {
    case "7d":
      from = subDays(to, 6);
      break;
    case "30d":
      from = subDays(to, 29);
      break;
    case "90d":
      from = subMonths(to, 3);
      break;
    default:
      from = subDays(to, 6);
  }
  return { from, to };
}

function toDateInputValue(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function AnalyticsDashboard({ branches }: Props) {
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [customFrom, setCustomFrom] = useState<string>(() =>
    toDateInputValue(subDays(new Date(), 29))
  );
  const [customTo, setCustomTo] = useState<string>(() =>
    toDateInputValue(new Date())
  );
  const [branchId, setBranchId] = useState<string>("");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedFrom =
    dateRange === "custom"
      ? customFrom
      : toDateInputValue(getPresetRange(dateRange).from);
  const resolvedTo =
    dateRange === "custom" ? customTo : toDateInputValue(getPresetRange(dateRange).to);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from: resolvedFrom, to: resolvedTo });
      if (branchId) params.set("branchId", branchId);

      const res = await fetch(`/api/merchant/analytics?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json as AnalyticsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }, [resolvedFrom, resolvedTo, branchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-8">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date range preset buttons */}
        <div className="flex rounded-lg border border-stone-300 overflow-hidden">
          {(["7d", "30d", "90d", "custom"] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                dateRange === range
                  ? "bg-orange-600 text-white"
                  : "bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              {RANGE_LABELS[range]}
            </button>
          ))}
        </div>

        {/* Custom date inputs — only visible when custom is selected */}
        {dateRange === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              max={customTo}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-3 py-1.5 text-sm border border-stone-300 rounded-lg bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <span className="text-stone-400 text-sm">s/d</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              max={toDateInputValue(new Date())}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-3 py-1.5 text-sm border border-stone-300 rounded-lg bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        )}

        {/* Branch selector — only visible if >1 branch */}
        {branches.length > 1 && (
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="px-3 py-1.5 text-sm border border-stone-300 rounded-lg bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Semua Cabang</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Export button */}
        <AnalyticsExportButton from={resolvedFrom} to={resolvedTo} branchId={branchId} />
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">{error}</span>
          <button
            onClick={fetchData}
            className="ml-auto text-sm underline hover:no-underline"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Data sections */}
      {!loading && !error && data && (
        <>
          <AnalyticsRevenueSection data={data.revenue} />

          <AnalyticsOrdersSection data={data.orders} />

          <AnalyticsMenuTable data={data.menu} />

          {/* Table analytics */}
          <section>
            <h2 className="text-base font-semibold text-stone-800 mb-3">Meja & Sesi</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border border-stone-200 p-4">
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Rata-rata Turnover Meja/Hari
                </p>
                <p className="text-2xl font-bold text-stone-900 mt-1">
                  {data.tables.avgTurnoverRate.toFixed(2)}×
                </p>
              </div>
              <div className="bg-white rounded-xl border border-stone-200 p-4">
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Rata-rata Belanja per Sesi
                </p>
                <p className="text-2xl font-bold text-stone-900 mt-1">
                  Rp {data.tables.avgSpendPerSession.toLocaleString("id-ID")}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-stone-200 p-4">
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Meja Tersibuk
                </p>
                <p className="text-2xl font-bold text-stone-900 mt-1">
                  {data.tables.busiestTableName ?? "—"}
                </p>
                {data.tables.busiestTableCount > 0 && (
                  <p className="text-xs text-stone-400 mt-0.5">
                    {data.tables.busiestTableCount} sesi
                  </p>
                )}
              </div>
            </div>
          </section>

          <AnalyticsRatingsSection data={data.ratings} />
        </>
      )}
    </div>
  );
}
