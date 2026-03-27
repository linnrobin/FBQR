"use client";

/**
 * Merchant Settings Client — tabbed form for MerchantSettings.
 *
 * Tabs (all PATCH /api/merchant/settings, each tab saves independently):
 *   Operasi      — ordering pause toggle + message
 *   Pembayaran   — payment mode, timeout, order limits, rounding
 *   Sesi Meja    — session timeout, dirty-state
 *   Dapur        — kitchen alerts, auto-complete, print toggles
 *   Notifikasi   — push + email notification toggles
 *   Fitur AI     — AI recommendation toggles
 *   Promosi      — promotion stacking toggle
 *
 * Stubs (link out or coming-soon):
 *   Branding     — redirects to /merchant/branding (Step 8)
 *   Loyalty      — Step 25
 */
import { useState } from "react";
import Link from "next/link";
import {
  Settings,
  CreditCard,
  LayoutGrid,
  ChefHat,
  Bell,
  Sparkles,
  Tag,
  Palette,
  Star,
  CheckCircle,
  ChevronRight,
  Loader2,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PushNotifications {
  newOrder: boolean;
  waiterCall: boolean;
  lowStock: boolean;
  billingReminder: boolean;
}

interface EmailNotifications {
  dailySummary: boolean;
  billingInvoice: boolean;
  lowStock: boolean;
}

interface MerchantSettings {
  paymentMode: "PAY_FIRST" | "PAY_AT_CASHIER";
  paymentTimeoutMinutes: number;
  maxPendingOrders: number;
  maxOrderValueIDR: number;
  maxActiveOrders: number | null;
  eodCashCleanupHour: number;
  roundingRule: "NONE" | "ROUND_50" | "ROUND_100";
  orderingPaused: boolean;
  orderingPausedMessage: string | null;
  enableDirtyState: boolean;
  tableSessionTimeoutMinutes: number;
  preparingAlertMinutes: number;
  autoCompleteReadyMinutes: number | null;
  autoPrintKitchenTicket: boolean;
  autoPrintReceipt: boolean;
  pushNotifications: PushNotifications;
  emailNotifications: EmailNotifications;
  aiShowBestsellers: boolean;
  aiPersonalized: boolean;
  aiUpsell: boolean;
  aiTimeBased: boolean;
  allowPromotionStacking: boolean;
}

interface SettingsClientProps {
  initialSettings: Partial<MerchantSettings> | null;
}

// ── Defaults (mirror Prisma schema defaults) ───────────────────────────────────

const DEFAULTS: MerchantSettings = {
  paymentMode: "PAY_FIRST",
  paymentTimeoutMinutes: 15,
  maxPendingOrders: 3,
  maxOrderValueIDR: 5000000,
  maxActiveOrders: null,
  eodCashCleanupHour: 3,
  roundingRule: "NONE",
  orderingPaused: false,
  orderingPausedMessage: null,
  enableDirtyState: false,
  tableSessionTimeoutMinutes: 120,
  preparingAlertMinutes: 45,
  autoCompleteReadyMinutes: null,
  autoPrintKitchenTicket: true,
  autoPrintReceipt: true,
  pushNotifications: { newOrder: true, waiterCall: true, lowStock: false, billingReminder: true },
  emailNotifications: { dailySummary: false, billingInvoice: true, lowStock: false },
  aiShowBestsellers: true,
  aiPersonalized: false,
  aiUpsell: true,
  aiTimeBased: true,
  allowPromotionStacking: false,
};

// ── Tab config ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: "operasi",    label: "Operasi",    icon: Settings },
  { id: "pembayaran", label: "Pembayaran", icon: CreditCard },
  { id: "sesi",       label: "Sesi Meja",  icon: LayoutGrid },
  { id: "dapur",      label: "Dapur",      icon: ChefHat },
  { id: "notifikasi", label: "Notifikasi", icon: Bell },
  { id: "ai",         label: "Fitur AI",   icon: Sparkles },
  { id: "promosi",    label: "Promosi",    icon: Tag },
] as const;

type TabId = typeof TABS[number]["id"];

// ── Shared primitives ──────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50 ${
        checked ? "bg-orange-500" : "bg-stone-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function FieldRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-stone-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-900">{label}</p>
        {description && <p className="text-xs text-stone-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  unit,
  nullable,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  unit?: string;
  nullable?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          if (nullable && v === "") { onChange(null); return; }
          const n = parseInt(v, 10);
          if (!isNaN(n)) onChange(n);
        }}
        min={min}
        max={max}
        placeholder={nullable ? "Otomatis" : undefined}
        className="w-24 border border-stone-300 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500"
      />
      {unit && <span className="text-sm text-stone-500">{unit}</span>}
    </div>
  );
}

function SaveBar({
  saving,
  saved,
  error,
  onSave,
}: {
  saving: boolean;
  saved: boolean;
  error: string | null;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center justify-between pt-4 mt-2 border-t border-stone-100">
      <div className="text-sm">
        {error && <span className="text-red-600">{error}</span>}
        {saved && !error && (
          <span className="text-green-600 flex items-center gap-1">
            <CheckCircle size={14} /> Tersimpan
          </span>
        )}
      </div>
      <button
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium"
      >
        {saving ? <><Loader2 size={14} className="animate-spin" /> Menyimpan…</> : "Simpan"}
      </button>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function SettingsClient({ initialSettings }: SettingsClientProps) {
  const merged: MerchantSettings = { ...DEFAULTS, ...initialSettings };

  const [activeTab, setActiveTab] = useState<TabId>("operasi");
  const [s, setS] = useState<MerchantSettings>(merged);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function upd<K extends keyof MerchantSettings>(key: K, value: MerchantSettings[K]) {
    setS((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function updPush(key: keyof PushNotifications, value: boolean) {
    setS((prev) => ({ ...prev, pushNotifications: { ...prev.pushNotifications, [key]: value } }));
    setSaved(false);
  }

  function updEmail(key: keyof EmailNotifications, value: boolean) {
    setS((prev) => ({ ...prev, emailNotifications: { ...prev.emailNotifications, [key]: value } }));
    setSaved(false);
  }

  async function save(fields: Partial<MerchantSettings>) {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/merchant/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Gagal menyimpan pengaturan");
        return;
      }
      setSaved(true);
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  // ── Tab content renderers ──────────────────────────────────────────────────

  function renderOperasi() {
    return (
      <div>
        <p className="text-xs text-stone-500 mb-4">
          Kendalikan apakah restoran Anda sedang menerima pesanan baru.
        </p>
        <FieldRow label="Jeda Pesanan" description="Blokir pesanan baru dari semua meja sementara.">
          <Toggle checked={s.orderingPaused} onChange={(v) => upd("orderingPaused", v)} />
        </FieldRow>
        {s.orderingPaused && (
          <FieldRow label="Pesan Jeda" description="Pesan yang ditampilkan ke pelanggan saat pesanan dijeda.">
            <input
              type="text"
              value={s.orderingPausedMessage ?? ""}
              onChange={(e) => upd("orderingPausedMessage", e.target.value || null)}
              maxLength={200}
              placeholder="Kami sedang istirahat sebentar…"
              className="w-64 border border-stone-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </FieldRow>
        )}
        <SaveBar saving={saving} saved={saved} error={error}
          onSave={() => save({ orderingPaused: s.orderingPaused, orderingPausedMessage: s.orderingPausedMessage })}
        />
      </div>
    );
  }

  function renderPembayaran() {
    return (
      <div>
        <p className="text-xs text-stone-500 mb-4">
          Mode pembayaran dan batas pesanan berlaku untuk semua cabang.
        </p>
        <FieldRow label="Mode Pembayaran" description="Tentukan kapan pelanggan harus membayar.">
          <select
            value={s.paymentMode}
            onChange={(e) => upd("paymentMode", e.target.value as MerchantSettings["paymentMode"])}
            className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="PAY_FIRST">Bayar Dulu (PAY_FIRST)</option>
            <option value="PAY_AT_CASHIER">Bayar di Kasir (PAY_AT_CASHIER)</option>
          </select>
        </FieldRow>
        <FieldRow label="Batas Waktu Pembayaran" description="Waktu maksimal pelanggan menyelesaikan pembayaran sebelum pesanan dibatalkan.">
          <NumberInput value={s.paymentTimeoutMinutes} onChange={(v) => upd("paymentTimeoutMinutes", v ?? 15)} min={5} max={60} unit="menit" />
        </FieldRow>
        <FieldRow label="Maks. Pesanan Pending" description="Tolak pesanan baru jika sudah ada sebanyak ini pesanan yang menunggu konfirmasi.">
          <NumberInput value={s.maxPendingOrders} onChange={(v) => upd("maxPendingOrders", v ?? 3)} min={1} max={100} unit="pesanan" />
        </FieldRow>
        <FieldRow label="Maks. Nilai Pesanan" description="Tolak pesanan dengan nilai melebihi batas ini (IDR).">
          <NumberInput value={s.maxOrderValueIDR} onChange={(v) => upd("maxOrderValueIDR", v ?? 5000000)} min={1000} unit="IDR" />
        </FieldRow>
        <FieldRow label="Maks. Pesanan Aktif" description="Batasi pesanan aktif bersamaan. Kosongkan untuk tanpa batas.">
          <NumberInput value={s.maxActiveOrders} onChange={(v) => upd("maxActiveOrders", v)} min={1} max={999} unit="pesanan" nullable />
        </FieldRow>
        <FieldRow label="Pembersihan EOD (PENDING_CASH)" description="Jam WIB untuk membatalkan pesanan PENDING_CASH yang belum lunas (0–23).">
          <NumberInput value={s.eodCashCleanupHour} onChange={(v) => upd("eodCashCleanupHour", v ?? 3)} min={0} max={23} unit="WIB" />
        </FieldRow>
        <FieldRow label="Pembulatan Tunai" description="Bulatkan total tagihan ke kelipatan tertentu untuk kembalian tunai.">
          <select
            value={s.roundingRule}
            onChange={(e) => upd("roundingRule", e.target.value as MerchantSettings["roundingRule"])}
            className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="NONE">Tidak Ada</option>
            <option value="ROUND_50">Rp 50</option>
            <option value="ROUND_100">Rp 100</option>
          </select>
        </FieldRow>
        <SaveBar saving={saving} saved={saved} error={error}
          onSave={() => save({
            paymentMode: s.paymentMode,
            paymentTimeoutMinutes: s.paymentTimeoutMinutes,
            maxPendingOrders: s.maxPendingOrders,
            maxOrderValueIDR: s.maxOrderValueIDR,
            maxActiveOrders: s.maxActiveOrders,
            eodCashCleanupHour: s.eodCashCleanupHour,
            roundingRule: s.roundingRule,
          })}
        />
      </div>
    );
  }

  function renderSesi() {
    return (
      <div>
        <p className="text-xs text-stone-500 mb-4">
          Konfigurasi sesi meja pelanggan dan status kebersihan meja.
        </p>
        <FieldRow label="Batas Waktu Sesi" description="Sesi meja pelanggan otomatis berakhir setelah tidak ada aktivitas selama durasi ini.">
          <NumberInput value={s.tableSessionTimeoutMinutes} onChange={(v) => upd("tableSessionTimeoutMinutes", v ?? 120)} min={15} max={1440} unit="menit" />
        </FieldRow>
        <FieldRow label="Status Kotor (DIRTY)" description="Aktifkan agar meja berubah ke status 'Perlu Dibersihkan' setelah sesi berakhir. Kasir harus menandai bersih secara manual.">
          <Toggle checked={s.enableDirtyState} onChange={(v) => upd("enableDirtyState", v)} />
        </FieldRow>
        <SaveBar saving={saving} saved={saved} error={error}
          onSave={() => save({ tableSessionTimeoutMinutes: s.tableSessionTimeoutMinutes, enableDirtyState: s.enableDirtyState })}
        />
      </div>
    );
  }

  function renderDapur() {
    return (
      <div>
        <p className="text-xs text-stone-500 mb-4">
          Peringatan dapur dan pengaturan printer tiket.
        </p>
        <FieldRow label="Peringatan Pesanan Lama" description="Tampilkan peringatan di KDS jika pesanan sudah dalam status PREPARING lebih dari durasi ini.">
          <NumberInput value={s.preparingAlertMinutes} onChange={(v) => upd("preparingAlertMinutes", v ?? 45)} min={5} max={240} unit="menit" />
        </FieldRow>
        <FieldRow label="Auto-Selesai READY" description="Otomatis ubah pesanan READY → COMPLETED setelah durasi ini. Kosongkan untuk manual saja.">
          <NumberInput value={s.autoCompleteReadyMinutes} onChange={(v) => upd("autoCompleteReadyMinutes", v)} min={1} max={120} unit="menit" nullable />
        </FieldRow>
        <FieldRow label="Cetak Tiket Dapur Otomatis" description="Otomatis cetak tiket dapur saat pesanan dikonfirmasi.">
          <Toggle checked={s.autoPrintKitchenTicket} onChange={(v) => upd("autoPrintKitchenTicket", v)} />
        </FieldRow>
        <FieldRow label="Cetak Struk Otomatis" description="Otomatis cetak struk saat pesanan selesai atau dibayar.">
          <Toggle checked={s.autoPrintReceipt} onChange={(v) => upd("autoPrintReceipt", v)} />
        </FieldRow>
        <SaveBar saving={saving} saved={saved} error={error}
          onSave={() => save({
            preparingAlertMinutes: s.preparingAlertMinutes,
            autoCompleteReadyMinutes: s.autoCompleteReadyMinutes,
            autoPrintKitchenTicket: s.autoPrintKitchenTicket,
            autoPrintReceipt: s.autoPrintReceipt,
          })}
        />
      </div>
    );
  }

  function renderNotifikasi() {
    return (
      <div>
        <p className="text-xs text-stone-500 mb-4">
          Kelola notifikasi yang diterima staf dan pemilik.
        </p>
        <p className="text-xs font-semibold text-stone-700 uppercase tracking-wide mb-2">Push Notification</p>
        <FieldRow label="Pesanan Baru" description="Notifikasi saat pesanan baru masuk.">
          <Toggle checked={s.pushNotifications.newOrder} onChange={(v) => updPush("newOrder", v)} />
        </FieldRow>
        <FieldRow label="Panggilan Pelayan" description="Notifikasi saat pelanggan menekan tombol panggil pelayan.">
          <Toggle checked={s.pushNotifications.waiterCall} onChange={(v) => updPush("waiterCall", v)} />
        </FieldRow>
        <FieldRow label="Stok Rendah" description="Notifikasi saat stok item mendekati habis.">
          <Toggle checked={s.pushNotifications.lowStock} onChange={(v) => updPush("lowStock", v)} />
        </FieldRow>
        <FieldRow label="Pengingat Tagihan" description="Notifikasi pengingat perpanjangan langganan.">
          <Toggle checked={s.pushNotifications.billingReminder} onChange={(v) => updPush("billingReminder", v)} />
        </FieldRow>
        <p className="text-xs font-semibold text-stone-700 uppercase tracking-wide mt-4 mb-2">Email</p>
        <FieldRow label="Ringkasan Harian" description="Email ringkasan penjualan setiap hari.">
          <Toggle checked={s.emailNotifications.dailySummary} onChange={(v) => updEmail("dailySummary", v)} />
        </FieldRow>
        <FieldRow label="Invoice Tagihan" description="Email invoice langganan saat diterbitkan.">
          <Toggle checked={s.emailNotifications.billingInvoice} onChange={(v) => updEmail("billingInvoice", v)} />
        </FieldRow>
        <FieldRow label="Stok Rendah (Email)" description="Email saat stok item mendekati habis.">
          <Toggle checked={s.emailNotifications.lowStock} onChange={(v) => updEmail("lowStock", v)} />
        </FieldRow>
        <SaveBar saving={saving} saved={saved} error={error}
          onSave={() => save({ pushNotifications: s.pushNotifications, emailNotifications: s.emailNotifications })}
        />
      </div>
    );
  }

  function renderAI() {
    return (
      <div>
        <p className="text-xs text-stone-500 mb-4">
          Fitur rekomendasi AI ditampilkan di aplikasi menu pelanggan.
        </p>
        <FieldRow label="Tampilkan Bestseller" description="Tandai item terlaris di menu pelanggan.">
          <Toggle checked={s.aiShowBestsellers} onChange={(v) => upd("aiShowBestsellers", v)} />
        </FieldRow>
        <FieldRow label="Rekomendasi Personal" description="Tampilkan rekomendasi berdasarkan riwayat pesanan pelanggan.">
          <Toggle checked={s.aiPersonalized} onChange={(v) => upd("aiPersonalized", v)} />
        </FieldRow>
        <FieldRow label="Upsell Otomatis" description="Tampilkan saran item tambahan saat pelanggan menambah ke keranjang.">
          <Toggle checked={s.aiUpsell} onChange={(v) => upd("aiUpsell", v)} />
        </FieldRow>
        <FieldRow label="Rekomendasi Berbasis Waktu" description="Tampilkan rekomendasi berbeda sesuai waktu (pagi, siang, malam).">
          <Toggle checked={s.aiTimeBased} onChange={(v) => upd("aiTimeBased", v)} />
        </FieldRow>
        <SaveBar saving={saving} saved={saved} error={error}
          onSave={() => save({
            aiShowBestsellers: s.aiShowBestsellers,
            aiPersonalized: s.aiPersonalized,
            aiUpsell: s.aiUpsell,
            aiTimeBased: s.aiTimeBased,
          })}
        />
      </div>
    );
  }

  function renderPromosi() {
    return (
      <div>
        <p className="text-xs text-stone-500 mb-4">
          Aturan penerapan promosi di pesanan.
        </p>
        <FieldRow label="Izinkan Gabung Promo" description="Izinkan beberapa kode promo diterapkan sekaligus dalam satu pesanan.">
          <Toggle checked={s.allowPromotionStacking} onChange={(v) => upd("allowPromotionStacking", v)} />
        </FieldRow>
        <SaveBar saving={saving} saved={saved} error={error}
          onSave={() => save({ allowPromotionStacking: s.allowPromotionStacking })}
        />
      </div>
    );
  }

  const TAB_CONTENT: Record<TabId, () => React.ReactNode> = {
    operasi: renderOperasi,
    pembayaran: renderPembayaran,
    sesi: renderSesi,
    dapur: renderDapur,
    notifikasi: renderNotifikasi,
    ai: renderAI,
    promosi: renderPromosi,
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold text-stone-900 mb-6">Pengaturan</h1>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* ── Sidebar nav ── */}
        <nav className="sm:w-48 flex-shrink-0">
          <ul className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0">
            {TABS.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  onClick={() => { setActiveTab(id); setSaved(false); setError(null); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left whitespace-nowrap transition-colors ${
                    activeTab === id
                      ? "bg-orange-50 text-orange-700"
                      : "text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              </li>
            ))}

            {/* Branding link (already built in Step 8) */}
            <li>
              <Link
                href="/merchant/branding"
                className="w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100 whitespace-nowrap"
              >
                <span className="flex items-center gap-2.5"><Palette size={15} /> Branding</span>
                <ChevronRight size={13} className="text-stone-400" />
              </Link>
            </li>

            {/* Coming-soon stubs */}
            {[{ icon: Star, label: "Loyalty" }].map(({ icon: Icon, label }) => (
              <li key={label}>
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-stone-400 cursor-not-allowed">
                  <Icon size={15} />
                  {label}
                  <span className="ml-auto text-[10px] bg-stone-100 text-stone-400 px-1.5 py-0.5 rounded">Segera</span>
                </div>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── Tab content ── */}
        <div className="flex-1 bg-white rounded-xl border border-stone-200 p-5 min-w-0">
          {TAB_CONTENT[activeTab]()}
        </div>
      </div>
    </div>
  );
}
