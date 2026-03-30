"use client";

/**
 * Tables Client — orchestrator for the /merchant/tables page.
 *
 * Responsibilities:
 *   - Branch selector tabs
 *   - Pause Orders banner + toggle (PATCH /api/merchant/settings)
 *   - View mode toggle: Floor Map ↔ List
 *   - List view table
 *   - Mounts QrModal and OrderPanel as needed
 *
 * Heavy sub-components live in:
 *   ./tables-floor-map.tsx  — responsive grid of table cards
 *   ./tables-qr-modal.tsx   — QR view/download/print/rotate modal
 *   ./tables-order-panel.tsx — waiter-assisted order panel
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, List, QrCode, Pause, Play, Loader2, MoreVertical } from "lucide-react";
import { FloorMap } from "./tables-floor-map";
import { QrModal } from "./tables-qr-modal";
import { OrderPanel } from "./tables-order-panel";
import type { FloorMapTable, TableStatus } from "./tables-floor-map";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Branch {
  id: string;
  name: string;
  tables: FloorMapTable[];
}

interface Settings {
  orderingPaused: boolean;
  orderingPausedMessage: string | null;
  enableDirtyState: boolean;
}

interface Variant {
  id: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
}

interface Addon {
  id: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
  maxQuantity: number | null;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  priceType: string;
  imageUrl: string | null;
  isAvailable: boolean;
  variants: Variant[];
  addons: Addon[];
}

interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

interface TablesClientProps {
  restaurantId: string;
  initialBranches: Branch[];
  initialSettings: Settings;
  menuCategories: MenuCategory[];
}

// ── Status labels (for list view) ─────────────────────────────────────────────

const STATUS_LABEL: Record<TableStatus, string> = {
  AVAILABLE: "Tersedia",
  OCCUPIED: "Terisi",
  DIRTY: "Perlu Dibersihkan",
  RESERVED: "Direservasi",
  CLOSED: "Ditutup",
};

const STATUS_BADGE: Record<TableStatus, string> = {
  AVAILABLE: "bg-green-100 text-green-800 border-green-300",
  OCCUPIED: "bg-orange-100 text-orange-800 border-orange-300",
  DIRTY: "bg-amber-100 text-amber-700 border-amber-300",
  RESERVED: "bg-blue-100 text-blue-800 border-blue-300",
  CLOSED: "bg-stone-100 text-stone-500 border-stone-200",
};

// ── Pause Orders Banner ────────────────────────────────────────────────────────

function PauseBanner({
  paused,
  onToggle,
  loading,
}: {
  paused: boolean;
  onToggle: () => void;
  loading: boolean;
}) {
  if (!paused) {
    return (
      <div className="flex items-center justify-between px-4 py-2 bg-green-50 border border-green-200 rounded-lg mb-4">
        <div className="flex items-center gap-2 text-green-800 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          Pesanan: Aktif
        </div>
        <button
          onClick={onToggle}
          disabled={loading}
          className="flex items-center gap-1.5 border border-green-300 text-green-700 hover:bg-green-100 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Pause size={12} />}
          Jeda Pesanan
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-red-50 border border-red-300 rounded-lg mb-4">
      <div className="flex items-center gap-2 text-red-800 font-semibold text-sm">
        <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse" />
        PESANAN DIJEDA
      </div>
      <button
        onClick={onToggle}
        disabled={loading}
        className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
        Lanjutkan
      </button>
    </div>
  );
}

// ── List view ─────────────────────────────────────────────────────────────────

function ListView({
  tables,
  onQrClick,
  onOrderClick,
}: {
  tables: FloorMapTable[];
  onQrClick: (tableId: string, tableName: string) => void;
  onOrderClick: (tableId: string, tableName: string, branchId: string) => void;
}) {
  if (tables.length === 0) {
    return (
      <div className="text-center py-16 text-stone-400">
        <p className="text-sm">Belum ada meja di cabang ini.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-xs text-stone-500 uppercase tracking-wide">
            <th className="text-left px-4 py-3 font-medium min-w-[140px]">Nama Meja</th>
            <th className="text-left px-4 py-3 font-medium w-[100px]">Kapasitas</th>
            <th className="text-left px-4 py-3 font-medium w-[160px]">Status</th>
            <th className="text-left px-4 py-3 font-medium w-[100px]">Sesi Aktif</th>
            <th className="text-left px-4 py-3 font-medium w-[160px]">QR Token</th>
            <th className="px-4 py-3 w-[120px]" />
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {tables.map((table) => (
            <tr key={table.id} className="hover:bg-stone-50">
              <td className="px-4 py-3 font-medium text-stone-900">{table.name}</td>
              <td className="px-4 py-3 text-stone-600">
                {table.capacity ? `${table.capacity} kursi` : "—"}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_BADGE[table.status]}`}
                >
                  {STATUS_LABEL[table.status]}
                </span>
              </td>
              <td className="px-4 py-3 text-stone-600">
                {table._count.sessions > 0 ? (
                  <span className="text-orange-600 font-medium">Aktif</span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-stone-400 truncate max-w-[160px]">
                {table.qrToken.slice(0, 8)}…
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => onQrClick(table.id, table.name)}
                    className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600"
                    title="Lihat QR Code"
                  >
                    <QrCode size={14} />
                  </button>
                  {(table.status === "AVAILABLE" || table.status === "OCCUPIED") && (
                    <button
                      onClick={() => onOrderClick(table.id, table.name, table.branchId)}
                      className="p-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white"
                      title="Pesan untuk meja ini"
                    >
                      <MoreVertical size={14} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function TablesClient({
  initialBranches,
  initialSettings,
  menuCategories,
}: TablesClientProps) {
  const router = useRouter();

  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    initialBranches[0]?.id ?? ""
  );
  const [viewMode, setViewMode] = useState<"floor" | "list">("floor");
  const [paused, setPaused] = useState(initialSettings.orderingPaused);
  const [pauseLoading, setPauseLoading] = useState(false);

  // QR modal state
  const [qrTarget, setQrTarget] = useState<{ tableId: string; tableName: string } | null>(null);

  // Order panel state
  const [orderTarget, setOrderTarget] = useState<{
    tableId: string;
    tableName: string;
    branchId: string;
  } | null>(null);

  const activeBranch = initialBranches.find((b) => b.id === selectedBranchId);
  const tables = activeBranch?.tables ?? [];

  async function togglePause() {
    setPauseLoading(true);
    try {
      const res = await fetch("/api/merchant/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderingPaused: !paused }),
      });
      if (res.ok) {
        setPaused((p) => !p);
        router.refresh();
      }
    } finally {
      setPauseLoading(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-stone-900">Meja & QR</h1>
      </div>

      {/* Pause banner */}
      <PauseBanner paused={paused} onToggle={togglePause} loading={pauseLoading} />

      {/* Branch tabs */}
      {initialBranches.length > 1 && (
        <div className="flex gap-1.5 mb-4 overflow-x-auto">
          {initialBranches.map((branch) => (
            <button
              key={branch.id}
              onClick={() => setSelectedBranchId(branch.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedBranchId === branch.id
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              {branch.name}
              <span className="ml-1.5 text-xs opacity-70">
                ({branch.tables.length})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* View mode toggle */}
      <div className="flex items-center justify-end mb-3">
        <div className="flex border border-stone-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode("floor")}
            className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 ${
              viewMode === "floor"
                ? "bg-stone-900 text-white"
                : "bg-white text-stone-600 hover:bg-stone-50"
            }`}
          >
            <LayoutGrid size={13} /> Floor Map
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 ${
              viewMode === "list"
                ? "bg-stone-900 text-white"
                : "bg-white text-stone-600 hover:bg-stone-50"
            }`}
          >
            <List size={13} /> Daftar
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === "floor" ? (
        <FloorMap
          branchId={selectedBranchId}
          tables={tables}
          onQrClick={(tableId, tableName) => setQrTarget({ tableId, tableName })}
          onOrderClick={(tableId, tableName, branchId) =>
            setOrderTarget({ tableId, tableName, branchId })
          }
        />
      ) : (
        <ListView
          tables={tables}
          onQrClick={(tableId, tableName) => setQrTarget({ tableId, tableName })}
          onOrderClick={(tableId, tableName, branchId) =>
            setOrderTarget({ tableId, tableName, branchId })
          }
        />
      )}

      {/* QR Modal */}
      {qrTarget && (
        <QrModal
          tableId={qrTarget.tableId}
          tableName={qrTarget.tableName}
          onClose={() => setQrTarget(null)}
        />
      )}

      {/* Waiter Order Panel */}
      {orderTarget && (
        <OrderPanel
          tableId={orderTarget.tableId}
          tableName={orderTarget.tableName}
          branchId={orderTarget.branchId}
          categories={menuCategories}
          onClose={() => { setOrderTarget(null); router.refresh(); }}
        />
      )}
    </div>
  );
}
