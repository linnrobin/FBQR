"use client";

/**
 * Tables Floor Map — responsive grid of table cards.
 * Handles: status display, status transitions (PATCH /status),
 * table create/edit (POST / PATCH), table delete (DELETE),
 * and delegates QR + waiter-order actions to parent.
 */
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  QrCode,
  MoreVertical,
  Plus,
  Trash2,
  Pencil,
  ShoppingBag,
  CheckCircle,
  Bookmark,
  Lock,
  Unlock,
  X,
  Loader2,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

export type TableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "DIRTY" | "CLOSED";

export interface FloorMapTable {
  id: string;
  branchId: string;
  name: string;
  capacity: number | null;
  status: TableStatus;
  qrToken: string;
  _count: { sessions: number };
}

interface FloorMapProps {
  branchId: string;
  tables: FloorMapTable[];
  onQrClick: (tableId: string, tableName: string) => void;
  onOrderClick: (tableId: string, tableName: string, branchId: string) => void;
}

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS: Record<TableStatus, { card: string; badge: string; label: string }> = {
  AVAILABLE: {
    card: "bg-white border-stone-200",
    badge: "bg-green-100 text-green-800 border border-green-300",
    label: "Tersedia",
  },
  OCCUPIED: {
    card: "bg-orange-50 border-orange-200",
    badge: "bg-orange-100 text-orange-800 border border-orange-300",
    label: "Terisi",
  },
  DIRTY: {
    card: "bg-amber-50 border-amber-200",
    badge: "bg-amber-100 text-amber-700 border border-amber-300",
    label: "Perlu Dibersihkan",
  },
  RESERVED: {
    card: "bg-blue-50 border-blue-200",
    badge: "bg-blue-100 text-blue-800 border border-blue-300",
    label: "Direservasi",
  },
  CLOSED: {
    card: "bg-stone-100 border-stone-200",
    badge: "bg-stone-100 text-stone-500 border border-stone-200",
    label: "Ditutup",
  },
};

// ── Kebab dropdown ─────────────────────────────────────────────────────────────

function KebabMenu({
  table,
  onEdit,
  onDelete,
}: {
  table: FloorMapTable;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setTransitionError(null);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function transition(newStatus: TableStatus) {
    setLoading(true);
    setTransitionError(null);
    try {
      const res = await fetch(`/api/merchant/tables/${table.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setTransitionError(data.error ?? "Gagal mengubah status");
      }
    } catch {
      setTransitionError("Koneksi gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen((p) => !p); setTransitionError(null); }}
        disabled={loading}
        className="p-1 rounded hover:bg-stone-100 text-stone-500 disabled:opacity-50"
        aria-label="Aksi meja"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <MoreVertical size={16} />}
      </button>

      {open && (
        <div className="absolute right-0 top-7 z-50 min-w-[180px] bg-white border border-stone-200 rounded-lg shadow-lg py-1 text-sm">
          {transitionError && (
            <p className="text-xs text-red-600 px-3 py-2 border-b border-stone-100">
              {transitionError}
            </p>
          )}
          {table.status === "DIRTY" && (
            <button
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-stone-50 text-green-700"
              onClick={() => transition("AVAILABLE")}
            >
              <CheckCircle size={15} /> Tandai Bersih
            </button>
          )}
          {table.status === "AVAILABLE" && (
            <button
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-stone-50"
              onClick={() => transition("RESERVED")}
            >
              <Bookmark size={15} /> Reservasi
            </button>
          )}
          {(table.status === "AVAILABLE" || table.status === "DIRTY") && (
            <button
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-stone-50"
              onClick={() => transition("CLOSED")}
            >
              <Lock size={15} /> Tutup Meja
            </button>
          )}
          {(table.status === "CLOSED" || table.status === "RESERVED") && (
            <button
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-stone-50 text-green-700"
              onClick={() => transition("AVAILABLE")}
            >
              <Unlock size={15} /> Buka Meja
            </button>
          )}
          <div className="border-t border-stone-100 my-1" />
          <button
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-stone-50"
            onClick={() => { setOpen(false); onEdit(); }}
          >
            <Pencil size={15} /> Edit Meja
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-stone-50 text-red-600 disabled:opacity-40"
            disabled={table.status !== "AVAILABLE"}
            onClick={() => { setOpen(false); onDelete(); }}
          >
            <Trash2 size={15} /> Hapus
          </button>
        </div>
      )}
    </div>
  );
}

// ── Table form modal (create + edit) ──────────────────────────────────────────

interface TableFormModalProps {
  branchId: string;
  table?: FloorMapTable;
  onClose: () => void;
}

function TableFormModal({ branchId, table, onClose }: TableFormModalProps) {
  const router = useRouter();
  const [name, setName] = useState(table?.name ?? "");
  const [capacity, setCapacity] = useState<string>(table?.capacity?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = {
        ...(table ? {} : { branchId }),
        name: name.trim(),
        capacity: capacity ? parseInt(capacity, 10) : null,
      };
      const res = table
        ? await fetch(`/api/merchant/tables/${table.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/merchant/tables", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Gagal menyimpan meja");
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-900">
            {table ? "Edit Meja" : "Tambah Meja"}
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Nama Meja <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              placeholder="cth. Meja 1, VIP-A"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Kapasitas <span className="text-stone-400 font-normal">(opsional)</span>
            </label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              min={1}
              max={999}
              placeholder="Jumlah kursi"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-stone-300 rounded-lg py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete confirm ─────────────────────────────────────────────────────────────

function DeleteConfirm({ table, onClose }: { table: FloorMapTable; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/merchant/tables/${table.id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Gagal menghapus meja");
      }
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h3 className="font-semibold text-stone-900 mb-2">Hapus Meja?</h3>
        <p className="text-sm text-stone-600 mb-4">
          Meja <strong>{table.name}</strong> akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
        </p>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 border border-stone-300 rounded-lg py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Batal
          </button>
          <button
            onClick={confirm}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Menghapus…" : "Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Table card ─────────────────────────────────────────────────────────────────

function TableCard({
  table,
  onQrClick,
  onOrderClick,
}: {
  table: FloorMapTable;
  onQrClick: () => void;
  onOrderClick: () => void;
}) {
  const cfg = STATUS[table.status];
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className={`border rounded-xl p-3 flex flex-col gap-2 ${cfg.card}`}>
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <p className="font-semibold text-stone-900 truncate text-sm leading-tight">{table.name}</p>
            {table.capacity && (
              <p className="text-xs text-stone-500">{table.capacity} kursi</p>
            )}
          </div>
          <KebabMenu
            table={table}
            onEdit={() => setEditOpen(true)}
            onDelete={() => setDeleteOpen(true)}
          />
        </div>

        <span className={`self-start text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>
          {cfg.label}
        </span>

        <div className="flex gap-1.5 mt-auto pt-1">
          <button
            onClick={onQrClick}
            className="flex-1 flex items-center justify-center gap-1 border border-stone-300 rounded-lg py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
            title="Lihat QR Code"
          >
            <QrCode size={13} /> QR
          </button>
          {(table.status === "AVAILABLE" || table.status === "OCCUPIED") && (
            <button
              onClick={onOrderClick}
              className="flex-1 flex items-center justify-center gap-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-1.5 text-xs font-medium"
              title="Pesan untuk meja ini"
            >
              <ShoppingBag size={13} /> Pesan
            </button>
          )}
        </div>
      </div>

      {editOpen && (
        <TableFormModal
          branchId={table.branchId}
          table={table}
          onClose={() => setEditOpen(false)}
        />
      )}
      {deleteOpen && (
        <DeleteConfirm table={table} onClose={() => setDeleteOpen(false)} />
      )}
    </>
  );
}

// ── Main floor map export ──────────────────────────────────────────────────────

export function FloorMap({ branchId, tables, onQrClick, onOrderClick }: FloorMapProps) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-stone-500">{tables.length} meja</p>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-3 py-2 text-sm font-medium"
        >
          <Plus size={15} /> Tambah Meja
        </button>
      </div>

      {tables.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-lg font-medium mb-1">Belum ada meja</p>
          <p className="text-sm">Tambah meja pertama untuk mulai menerima pesanan QR.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {tables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onQrClick={() => onQrClick(table.id, table.name)}
              onOrderClick={() => onOrderClick(table.id, table.name, table.branchId)}
            />
          ))}
        </div>
      )}

      {addOpen && (
        <TableFormModal branchId={branchId} onClose={() => setAddOpen(false)} />
      )}
    </div>
  );
}
