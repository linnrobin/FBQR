"use client";

/**
 * KitchenPwaRegister — registers the service worker for the kitchen display PWA.
 *
 * Mounted in (kitchen)/layout.tsx.
 * Shows an "Add to Home Screen" banner on iOS Safari for optimal full-screen experience.
 */

import { useEffect, useState } from "react";

export function KitchenPwaRegister() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Register SW (shared with merchant — same sw.js)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // SW registration failure is non-fatal
      });
    }

    // iOS "Add to Home Screen" banner — only show in Safari, not already standalone
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const dismissed = sessionStorage.getItem("kitchen-ios-banner-dismissed");

    if (isIos && !isStandalone && !dismissed) {
      setShowBanner(true);
    }
  }, []);

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-stone-800 border border-stone-700 rounded-xl p-4 shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-100">
            Tambahkan ke Layar Utama
          </p>
          <p className="text-xs text-stone-400 mt-1">
            Untuk pengalaman layar penuh tanpa browser: ketuk{" "}
            <span className="text-stone-200">⎙</span> lalu pilih{" "}
            <span className="text-stone-200">"Add to Home Screen"</span>.
          </p>
        </div>
        <button
          onClick={() => {
            sessionStorage.setItem("kitchen-ios-banner-dismissed", "1");
            setShowBanner(false);
          }}
          className="text-stone-400 hover:text-stone-200 text-xs px-2 py-1 rounded bg-stone-700 flex-shrink-0"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}
