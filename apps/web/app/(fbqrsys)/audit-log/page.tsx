"use client";

/**
 * FBQRSYS Audit Log Viewer
 * Route: /fbqrsys/audit-log
 * Permission: reports:read
 *
 * Full-text search, actor/action/entity/date/restaurant filters,
 * paginated table, row-expand JSON diff viewer.
 */
import { useEffect, useState, useCallback } from "react";
import { Shield, ChevronDown, ChevronRight, Search } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorType: string;
  actorRole: string | null;
  actorName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  restaurantId: string | null;
  createdAt: string;
  restaurant: { name: string } | null;
}

interface AuditLogResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTOR_TYPES = ["ALL", "STAFF", "MERCHANT", "ADMIN", "CUSTOMER", "SYSTEM"];
const ACTIONS = [
  "ALL", "CREATE", "UPDATE", "DELETE",
  "LOGIN", "LOGOUT",
  "SUSPEND", "UNSUSPEND",
  "CANCEL", "REFUND",
  "REORDER",
  "LATE_WEBHOOK_REVIVAL", "LATE_WEBHOOK_REFUND",
];
const ENTITIES = [
  "ALL", "Order", "OrderItem", "MenuItem", "MenuCategory",
  "Staff", "Merchant", "Promotion", "CustomerSession",
  "WaiterRequest", "Payment",
];

// ─── Action badge colors ──────────────────────────────────────────────────────

function actionBadgeClass(action: string): string {
  switch (action) {
    case "CREATE":
      return "bg-green-100 text-green-800";
    case "UPDATE":
      return "bg-blue-100 text-blue-800";
    case "DELETE":
    case "SUSPEND":
    case "CANCEL":
    case "REFUND":
      return "bg-red-100 text-red-700";
    case "LOGIN":
    case "LOGOUT":
      return "bg-stone-100 text-stone-600";
    case "LATE_WEBHOOK_REVIVAL":
    case "LATE_WEBHOOK_REFUND":
      return "bg-purple-100 text-purple-700";
    case "UNSUSPEND":
      return "bg-green-100 text-green-800";
    default:
      return "bg-stone-100 text-stone-600";
  }
}

function actorTypeBadgeClass(type: string): string {
  switch (type) {
    case "ADMIN":
      return "bg-orange-100 text-orange-700";
    case "STAFF":
      return "bg-blue-100 text-blue-700";
    case "MERCHANT":
      return "bg-purple-100 text-purple-700";
    case "CUSTOMER":
      return "bg-green-100 text-green-700";
    case "SYSTEM":
      return "bg-stone-100 text-stone-500";
    default:
      return "bg-stone-100 text-stone-500";
  }
}

// ─── JSON diff viewer ─────────────────────────────────────────────────────────

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  if (value == null) {
    return (
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">{label}</p>
        <p className="text-xs italic text-stone-400">—</p>
      </div>
    );
  }
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">{label}</p>
      <pre className="overflow-x-auto rounded bg-stone-950 p-3 text-xs text-stone-100">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────

function AuditRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);

  const date = new Date(entry.createdAt);
  const dateStr = date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <>
      <tr
        className="cursor-pointer border-b border-stone-100 hover:bg-stone-50"
        onClick={() => setExpanded((e) => !e)}
      >
        {/* Waktu */}
        <td className="w-[160px] whitespace-nowrap px-4 py-3 text-xs text-stone-600">
          <div className="font-medium text-stone-900">{dateStr}</div>
          <div className="text-stone-400">{timeStr}</div>
        </td>

        {/* Aktor */}
        <td className="min-w-[160px] px-4 py-3">
          <div className="text-sm font-medium text-stone-900">{entry.actorName ?? "—"}</div>
          <span
            className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${actorTypeBadgeClass(entry.actorType)}`}
          >
            {entry.actorType}
          </span>
        </td>

        {/* Tindakan */}
        <td className="w-[120px] px-4 py-3">
          <span
            className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${actionBadgeClass(entry.action)}`}
          >
            {entry.action}
          </span>
        </td>

        {/* Entitas */}
        <td className="min-w-[200px] px-4 py-3">
          <div className="text-sm font-medium text-stone-900">{entry.entity}</div>
          {entry.entityId && (
            <div
              className="max-w-[200px] truncate text-xs text-stone-400"
              title={entry.entityId}
            >
              {entry.entityId}
            </div>
          )}
        </td>

        {/* Restoran */}
        <td className="w-[160px] px-4 py-3 text-sm text-stone-600">
          {entry.restaurant?.name ?? "—"}
        </td>

        {/* IP */}
        <td className="w-[130px] px-4 py-3 text-xs text-stone-400">
          {entry.ipAddress ?? "—"}
        </td>

        {/* Expand icon */}
        <td className="w-8 px-2 py-3 text-stone-400">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </td>
      </tr>

      {/* Expanded row — JSON diff */}
      {expanded && (
        <tr className="border-b border-stone-100 bg-stone-50">
          <td colSpan={7} className="px-6 py-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <JsonBlock label="Sebelum (oldValue)" value={entry.oldValue} />
              <JsonBlock label="Sesudah (newValue)" value={entry.newValue} />
            </div>
            {entry.userAgent && (
              <p className="mt-3 text-xs text-stone-400">
                <span className="font-medium">User-Agent:</span> {entry.userAgent}
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

interface Filters {
  search: string;
  actorType: string;
  action: string;
  entity: string;
  dateFrom: string;
  dateTo: string;
}

function FilterBar({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const set = (key: keyof Filters, value: string) =>
    onChange({ ...filters, [key]: value });

  const selectClass =
    "rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500";

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          placeholder="Cari aktor, entitas, ID..."
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          className="w-full rounded-md border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Actor Type */}
      <select value={filters.actorType} onChange={(e) => set("actorType", e.target.value)} className={selectClass}>
        {ACTOR_TYPES.map((t) => (
          <option key={t} value={t}>{t === "ALL" ? "Semua Aktor" : t}</option>
        ))}
      </select>

      {/* Action */}
      <select value={filters.action} onChange={(e) => set("action", e.target.value)} className={selectClass}>
        {ACTIONS.map((a) => (
          <option key={a} value={a}>{a === "ALL" ? "Semua Tindakan" : a}</option>
        ))}
      </select>

      {/* Entity */}
      <select value={filters.entity} onChange={(e) => set("entity", e.target.value)} className={selectClass}>
        {ENTITIES.map((e) => (
          <option key={e} value={e}>{e === "ALL" ? "Semua Entitas" : e}</option>
        ))}
      </select>

      {/* Date from */}
      <input
        type="date"
        value={filters.dateFrom}
        onChange={(e) => set("dateFrom", e.target.value)}
        className={selectClass}
      />

      {/* Date to */}
      <input
        type="date"
        value={filters.dateTo}
        onChange={(e) => set("dateTo", e.target.value)}
        className={selectClass}
      />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function defaultDateFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split("T")[0];
}

export default function AuditLogPage() {
  const [filters, setFilters] = useState<Filters>({
    search: "",
    actorType: "ALL",
    action: "ALL",
    entity: "ALL",
    dateFrom: defaultDateFrom(),
    dateTo: new Date().toISOString().split("T")[0],
  });
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(
    async (f: Filters, p: number) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (f.search) params.set("search", f.search);
        if (f.actorType !== "ALL") params.set("actorType", f.actorType);
        if (f.action !== "ALL") params.set("action", f.action);
        if (f.entity !== "ALL") params.set("entity", f.entity);
        if (f.dateFrom) params.set("dateFrom", f.dateFrom);
        if (f.dateTo) params.set("dateTo", f.dateTo);
        params.set("page", String(p));

        const res = await fetch(`/api/fbqrsys/audit-log?${params.toString()}`);
        if (!res.ok) throw new Error("Gagal memuat log");
        const json = await res.json();
        setData(json);
      } catch {
        setError("Gagal memuat log aktivitas.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debounced fetch on filter change — reset to page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchLogs(filters, 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, fetchLogs]);

  // Fetch on page change
  useEffect(() => {
    fetchLogs(filters, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="p-8">
      <h1 className="mb-6 text-3xl font-bold text-stone-900">Log Aktivitas</h1>

      <FilterBar filters={filters} onChange={(f) => { setFilters(f); }} />

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-stone-200 bg-stone-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Waktu</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Aktor</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Tindakan</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Entitas</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Restoran</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">IP</th>
                <th className="w-8 px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-orange-500" />
                    <p className="mt-2 text-sm text-stone-400">Memuat...</p>
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <p className="text-sm text-red-600">{error}</p>
                  </td>
                </tr>
              )}
              {!loading && !error && data && data.logs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Shield className="mx-auto mb-3 h-10 w-10 text-stone-300" />
                    <p className="text-base font-medium text-stone-500">Belum ada log aktivitas</p>
                    <p className="mt-1 text-sm text-stone-400">
                      Perubahan dan aktivitas akun akan muncul di sini.
                    </p>
                  </td>
                </tr>
              )}
              {!loading && !error && data?.logs.map((entry) => (
                <AuditRow key={entry.id} entry={entry} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-stone-200 px-4 py-3">
            <p className="text-sm text-stone-500">
              {data.total} entri · Halaman {data.page} dari {data.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-stone-200 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Sebelumnya
              </button>
              <button
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-stone-200 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Berikutnya →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
