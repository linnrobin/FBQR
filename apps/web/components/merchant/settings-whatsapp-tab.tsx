"use client";

/**
 * Settings — WhatsApp Business Integration tab (Step 27).
 *
 * Allows merchants to:
 *   1. Connect their Fonnte account (API token + optional sender number)
 *   2. Toggle which events trigger a WA notification
 *   3. Disconnect the integration
 *
 * API:
 *   GET/POST/DELETE /api/merchant/integrations/whatsapp — integration CRUD
 *   PATCH /api/merchant/settings { waNotifications } — event toggles
 */

import { useState, useEffect } from "react";
import { Loader2, CheckCircle, Smartphone, ExternalLink, Trash2, AlertCircle } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface WaIntegration {
  id: string;
  isActive: boolean;
  createdAt: string;
  senderNumber: string | null;
  maskedToken: string;
}

interface WaNotifications {
  orderReady: boolean;
  invoiceSent: boolean;
  newOrder: boolean;
}

interface SettingsWhatsappTabProps {
  initialWaNotifications: WaNotifications;
  onWaNotificationsChange: (v: WaNotifications) => void;
}

// ── Toggle primitive ───────────────────────────────────────────────────────────

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

// ── Main component ─────────────────────────────────────────────────────────────

export function SettingsWhatsappTab({
  initialWaNotifications,
  onWaNotificationsChange,
}: SettingsWhatsappTabProps) {
  const [integration, setIntegration] = useState<WaIntegration | null | "loading">("loading");
  const [token, setToken] = useState("");
  const [senderNumber, setSenderNumber] = useState("");

  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectSuccess, setConnectSuccess] = useState(false);

  const [disconnecting, setDisconnecting] = useState(false);

  const [waPrefs, setWaPrefs] = useState<WaNotifications>(initialWaNotifications);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savedPrefs, setSavedPrefs] = useState(false);
  const [prefsError, setPrefsError] = useState<string | null>(null);

  // ── Load integration ───────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/merchant/integrations/whatsapp")
      .then((r) => r.json())
      .then((data: { integration: WaIntegration | null }) => setIntegration(data.integration))
      .catch(() => setIntegration(null));
  }, []);

  // ── Connect ────────────────────────────────────────────────────────────────

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setConnecting(true);
    setConnectError(null);
    setConnectSuccess(false);

    try {
      const res = await fetch("/api/merchant/integrations/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, senderNumber: senderNumber || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setConnectError(data.error ?? "Gagal menyimpan integrasi");
        return;
      }
      setConnectSuccess(true);
      setToken("");
      setSenderNumber("");
      // Reload integration info
      const refreshed = await fetch("/api/merchant/integrations/whatsapp").then((r) => r.json()) as { integration: WaIntegration | null };
      setIntegration(refreshed.integration);
    } catch {
      setConnectError("Koneksi gagal. Coba lagi.");
    } finally {
      setConnecting(false);
    }
  }

  // ── Disconnect ─────────────────────────────────────────────────────────────

  async function handleDisconnect() {
    if (!confirm("Hapus integrasi WhatsApp? Notifikasi WA akan berhenti dikirim.")) return;
    setDisconnecting(true);
    try {
      await fetch("/api/merchant/integrations/whatsapp", { method: "DELETE" });
      setIntegration(null);
    } catch {
      // non-fatal
    } finally {
      setDisconnecting(false);
    }
  }

  // ── Save notification prefs ────────────────────────────────────────────────

  async function handleSavePrefs() {
    setSavingPrefs(true);
    setSavedPrefs(false);
    setPrefsError(null);
    try {
      const res = await fetch("/api/merchant/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waNotifications: waPrefs }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setPrefsError(d.error ?? "Gagal menyimpan");
        return;
      }
      setSavedPrefs(true);
      onWaNotificationsChange(waPrefs);
    } catch {
      setPrefsError("Koneksi gagal. Coba lagi.");
    } finally {
      setSavingPrefs(false);
    }
  }

  function updPref(key: keyof WaNotifications, value: boolean) {
    setWaPrefs((p) => ({ ...p, [key]: value }));
    setSavedPrefs(false);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header description */}
      <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-xl">
        <div className="flex items-start gap-3">
          <Smartphone size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">WhatsApp Business via Fonnte</p>
            <p className="text-xs text-green-700 mt-1">
              Hubungkan akun{" "}
              <a
                href="https://fonnte.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline inline-flex items-center gap-0.5"
              >
                Fonnte <ExternalLink size={11} />
              </a>{" "}
              Anda untuk mengirim notifikasi WhatsApp otomatis ke pelanggan — pesanan siap, struk
              digital, dan lainnya.
            </p>
          </div>
        </div>
      </div>

      {/* Connection status */}
      {integration === "loading" ? (
        <div className="flex items-center gap-2 text-stone-500 text-sm py-4">
          <Loader2 size={16} className="animate-spin" /> Memuat…
        </div>
      ) : integration && integration.isActive ? (
        /* ── Connected state ── */
        <div className="mb-6 p-4 bg-stone-50 rounded-xl border border-stone-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-stone-900 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                Terhubung
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                Token: <span className="font-mono">{integration.maskedToken}</span>
                {integration.senderNumber && (
                  <> &nbsp;·&nbsp; Nomor: {integration.senderNumber}</>
                )}
              </p>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="flex items-center gap-1.5 text-red-600 hover:text-red-700 text-sm disabled:opacity-50"
            >
              {disconnecting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              Putuskan
            </button>
          </div>

          {/* Re-configure button */}
          <button
            onClick={() => setIntegration(null)}
            className="mt-3 text-xs text-orange-600 hover:text-orange-700 underline"
          >
            Perbarui token / nomor pengirim
          </button>
        </div>
      ) : (
        /* ── Not connected — show setup form ── */
        <form onSubmit={handleConnect} className="mb-6 space-y-4">
          <p className="text-xs font-semibold text-stone-700 uppercase tracking-wide">
            Hubungkan Fonnte
          </p>
          <div>
            <label className="block text-xs text-stone-600 mb-1">
              Token Perangkat Fonnte <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => { setToken(e.target.value); setConnectError(null); }}
              placeholder="Token dari dashboard Fonnte"
              required
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-stone-400 mt-1">
              Dapatkan token di{" "}
              <a
                href="https://fonnte.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 underline"
              >
                fonnte.com/dashboard
              </a>{" "}
              → Perangkat → Token.
            </p>
          </div>
          <div>
            <label className="block text-xs text-stone-600 mb-1">
              Nomor Pengirim (opsional)
            </label>
            <input
              type="tel"
              value={senderNumber}
              onChange={(e) => setSenderNumber(e.target.value)}
              placeholder="+6281234567890"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-stone-400 mt-1">
              Format E.164. Biarkan kosong untuk menggunakan default perangkat Fonnte.
            </p>
          </div>
          {connectError && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle size={14} /> {connectError}
            </div>
          )}
          {connectSuccess && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle size={14} /> Integrasi berhasil disimpan!
            </div>
          )}
          <button
            type="submit"
            disabled={connecting || !token}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            {connecting ? <><Loader2 size={14} className="animate-spin" /> Menyimpan…</> : "Hubungkan"}
          </button>
        </form>
      )}

      {/* Notification event toggles (shown regardless of connection status) */}
      <div>
        <p className="text-xs font-semibold text-stone-700 uppercase tracking-wide mb-2">
          Notifikasi WhatsApp
        </p>
        <FieldRow
          label="Pesanan Siap"
          description="Kirim WA ke pelanggan saat pesanan mereka berstatus SIAP. Membutuhkan nomor HP pelanggan terdaftar."
        >
          <Toggle checked={waPrefs.orderReady} onChange={(v) => updPref("orderReady", v)} />
        </FieldRow>
        <FieldRow
          label="Struk Digital"
          description="Kirim link struk PDF ke pelanggan setelah pembayaran berhasil."
        >
          <Toggle checked={waPrefs.invoiceSent} onChange={(v) => updPref("invoiceSent", v)} />
        </FieldRow>
        <FieldRow
          label="Pesanan Baru (ke pemilik)"
          description="Kirim WA ke pemilik restoran saat ada pesanan baru. Nomor pemilik diambil dari profil merchant."
        >
          <Toggle checked={waPrefs.newOrder} onChange={(v) => updPref("newOrder", v)} />
        </FieldRow>

        <div className="flex items-center justify-between pt-4 mt-2 border-t border-stone-100">
          <div className="text-sm">
            {prefsError && <span className="text-red-600">{prefsError}</span>}
            {savedPrefs && !prefsError && (
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle size={14} /> Tersimpan
              </span>
            )}
          </div>
          <button
            onClick={handleSavePrefs}
            disabled={savingPrefs}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            {savingPrefs ? <><Loader2 size={14} className="animate-spin" /> Menyimpan…</> : "Simpan Pengaturan"}
          </button>
        </div>
      </div>
    </div>
  );
}
