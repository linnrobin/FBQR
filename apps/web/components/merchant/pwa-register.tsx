"use client";

/**
 * Registers the FBQR Merchant PWA service worker.
 * Include this component in the merchant layout.
 *
 * Also shows a dismissible iOS "Add to Home Screen" banner
 * so staff can get Web Push notifications on iPhone/iPad.
 */
import { useEffect, useState } from "react";

export function PwaRegister() {
  const [showIosBanner, setShowIosBanner] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/merchant/" })
        .catch((err) => console.error("[SW] Registration failed:", err));
    }

    // Detect iOS Safari (not in standalone mode)
    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isInStandalone =
      "standalone" in window.navigator &&
      (window.navigator as { standalone?: boolean }).standalone === true;
    const dismissed = sessionStorage.getItem("fbqr-ios-banner-dismissed");

    if (isIos && !isInStandalone && !dismissed) {
      setShowIosBanner(true);
    }
  }, []);

  function dismiss() {
    sessionStorage.setItem("fbqr-ios-banner-dismissed", "1");
    setShowIosBanner(false);
  }

  if (!showIosBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-orange-600 text-white px-4 py-3 flex items-start gap-3 shadow-lg">
      <span className="text-lg shrink-0">📱</span>
      <p className="text-sm flex-1">
        <strong>Tambahkan ke Layar Utama</strong> untuk menerima notifikasi pesanan di iPhone/iPad.
        Buka di Safari → Bagikan → Tambah ke Layar Utama.
      </p>
      <button
        onClick={dismiss}
        className="shrink-0 text-orange-200 hover:text-white text-sm font-medium"
      >
        Tutup
      </button>
    </div>
  );
}
