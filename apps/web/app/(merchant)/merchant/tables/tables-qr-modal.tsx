"use client";

/**
 * QR Code Modal — view, download, print, and rotate token.
 * Route trigger: [QR] button on table card or list row.
 *
 * Fetches QR data URL from GET /api/merchant/tables/[tableId]/qr.
 * Rotation calls POST /api/merchant/tables/[tableId]/rotate-token.
 */
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, Download, Printer, RefreshCw, Loader2, AlertCircle } from "lucide-react";

interface QrData {
  qrDataUrl: string;
  qrUrl: string;
  tableName: string;
}

interface QrModalProps {
  tableId: string;
  tableName: string;
  onClose: () => void;
}

export function QrModal({ tableId, tableName, onClose }: QrModalProps) {
  const router = useRouter();
  const [qrData, setQrData] = useState<QrData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [rotateConfirm, setRotateConfirm] = useState(false);

  const fetchQr = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/merchant/tables/${tableId}/qr`);
      if (!res.ok) throw new Error("Gagal memuat QR code");
      const data = await res.json();
      setQrData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  useEffect(() => { fetchQr(); }, [fetchQr]);

  // Close on backdrop click
  function onBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  function downloadPng() {
    if (!qrData) return;
    const a = document.createElement("a");
    a.href = qrData.qrDataUrl;
    a.download = `qr-${tableName.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  }

  function print() {
    if (!qrData) return;
    const win = window.open("", "_blank", "width=600,height=700");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code – ${tableName}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 40px; }
            img { width: 240px; height: 240px; }
            p { margin: 8px 0; color: #444; font-size: 14px; }
            h2 { margin: 0 0 16px; font-size: 20px; }
          </style>
        </head>
        <body>
          <h2>${tableName}</h2>
          <img src="${qrData.qrDataUrl}" alt="QR Code" />
          <p>${qrData.qrUrl}</p>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }

  async function rotateToken() {
    setRotating(true);
    setRotateConfirm(false);
    try {
      const res = await fetch(`/api/merchant/tables/${tableId}/rotate-token`, { method: "POST" });
      if (!res.ok) throw new Error("Gagal mengganti token");
      router.refresh();
      await fetchQr();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setRotating(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onBackdrop}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-900">QR Code — {tableName}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 size={32} className="animate-spin text-stone-400" />
              <p className="text-sm text-stone-500">Memuat QR code…</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <AlertCircle size={32} className="text-red-400" />
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={fetchQr}
                className="text-sm text-orange-600 hover:underline"
              >
                Coba lagi
              </button>
            </div>
          )}

          {qrData && !loading && (
            <div className="flex flex-col items-center gap-4">
              {/* QR image */}
              <div className="border-2 border-stone-200 rounded-xl p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrData.qrDataUrl}
                  alt={`QR code untuk ${tableName}`}
                  width={240}
                  height={240}
                  className="block"
                />
              </div>

              {/* URL */}
              <p className="font-mono text-xs text-stone-500 text-center break-all max-w-xs">
                {qrData.qrUrl}
              </p>

              {/* Table name label */}
              <p className="text-sm text-stone-500">{tableName}</p>

              {/* Action buttons */}
              <div className="flex gap-2 w-full">
                <button
                  onClick={downloadPng}
                  className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2.5 text-sm font-medium"
                >
                  <Download size={15} /> Unduh PNG
                </button>
                <button
                  onClick={print}
                  className="flex-1 flex items-center justify-center gap-2 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg py-2.5 text-sm font-medium"
                >
                  <Printer size={15} /> Cetak
                </button>
              </div>

              {/* Rotate token */}
              <div className="w-full pt-2 border-t border-stone-100 text-center">
                {!rotateConfirm ? (
                  <button
                    onClick={() => setRotateConfirm(true)}
                    disabled={rotating}
                    className="text-sm text-stone-400 hover:text-red-600 inline-flex items-center gap-1"
                  >
                    {rotating ? (
                      <><Loader2 size={13} className="animate-spin" /> Mengganti token…</>
                    ) : (
                      <><RefreshCw size={13} /> Rotasi Token</>
                    )}
                  </button>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-left">
                    <p className="font-semibold text-amber-800 text-sm mb-1">Ganti QR Code?</p>
                    <p className="text-xs text-amber-700 mb-3">
                      QR code lama akan langsung tidak berlaku. Pelanggan yang sudah scan QR lama perlu scan QR baru.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setRotateConfirm(false)}
                        className="flex-1 border border-stone-300 rounded-lg py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
                      >
                        Batal
                      </button>
                      <button
                        onClick={rotateToken}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-1.5 text-xs font-medium"
                      >
                        Ganti QR
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
