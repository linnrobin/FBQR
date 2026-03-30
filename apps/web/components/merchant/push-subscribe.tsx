"use client";

/**
 * PushSubscribe — browser-side Web Push subscription component.
 *
 * Mounts once in (merchant)/layout.tsx. Handles:
 * 1. Service Worker registration check
 * 2. Notification permission request
 * 3. Push subscription creation + save to server
 * 4. iOS "Add to Home Screen" banner (Web Push requires PWA install on iOS)
 * 5. Subscription cleanup on unsubscribe
 *
 * The component renders nothing visible by default. The iOS banner renders
 * conditionally as a fixed bottom strip.
 */

import { useEffect, useState } from "react";
import { X } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PushSubscribe() {
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [iosBannerDismissed, setIosBannerDismissed] = useState(false);

  useEffect(() => {
    // Show iOS banner once per session if on iOS Safari outside of standalone mode
    if (isIos() && !isInStandaloneMode()) {
      const dismissed = sessionStorage.getItem("fbqr-ios-push-banner-dismissed");
      if (!dismissed) setShowIosBanner(true);
    }

    // Skip push subscription if not supported or already denied
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      return;
    }

    if (Notification.permission === "denied") return;

    subscribe();
  }, []);

  async function subscribe() {
    try {
      const reg = await navigator.serviceWorker.ready;

      // Check if already subscribed
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        // Ensure the server has this subscription saved
        await saveSubscription(existing);
        return;
      }

      // Request permission (will no-op if already granted)
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      // Fetch VAPID public key
      const keyRes = await fetch("/api/merchant/push/vapid-key");
      if (!keyRes.ok) return; // Push not configured — silently skip

      const { publicKey } = (await keyRes.json()) as { publicKey: string };

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      await saveSubscription(subscription);
    } catch (err) {
      // Permission denied or SW not available — silently skip
      console.debug("[PushSubscribe] subscribe error (non-fatal)", err);
    }
  }

  async function saveSubscription(sub: PushSubscription) {
    const json = sub.toJSON();
    if (!json.endpoint || !json.keys) return;

    await fetch("/api/merchant/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      }),
    }).catch(() => {
      // Non-fatal — next load will retry
    });
  }

  function dismissIosBanner() {
    setShowIosBanner(false);
    setIosBannerDismissed(true);
    sessionStorage.setItem("fbqr-ios-push-banner-dismissed", "1");
  }

  if (!showIosBanner || iosBannerDismissed) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-0 left-0 right-0 z-50 bg-stone-800 text-white px-4 py-3 flex items-start gap-3 text-sm shadow-lg"
    >
      <span className="flex-1 leading-snug">
        Untuk notifikasi pesanan di iPhone/iPad: ketuk{" "}
        <strong>Bagikan</strong> → <strong>Tambahkan ke Layar Utama</strong>.
      </span>
      <button
        onClick={dismissIosBanner}
        className="shrink-0 mt-0.5 p-0.5 rounded hover:bg-stone-600"
        aria-label="Tutup"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
