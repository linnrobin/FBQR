"use client";

/**
 * Analytics export button — triggers download of Excel (.xlsx) report.
 * Calls GET /api/merchant/analytics/export with current filters.
 */
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

interface Props {
  from: string;
  to: string;
  branchId: string;
}

export function AnalyticsExportButton({ from, to, branchId }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      if (branchId) params.set("branchId", branchId);

      const res = await fetch(`/api/merchant/analytics/export?${params}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-pesanan-${from}-${to}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Non-fatal — user can retry
      alert("Gagal mengunduh laporan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-50 transition-colors"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      Ekspor ke Excel
    </button>
  );
}
