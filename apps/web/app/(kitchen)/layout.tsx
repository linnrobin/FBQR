/**
 * Kitchen display layout — dark theme applied via Tailwind dark class.
 * Route protection is handled by middleware.ts (fbqr_staff_session cookie check).
 * Includes kitchen PWA manifest + service worker registration.
 */
import type { Metadata } from "next";
import { KitchenPwaRegister } from "@/components/kitchen/pwa-register";

export const metadata: Metadata = {
  title: {
    default: "Kitchen Display",
    template: "%s | Kitchen",
  },
  manifest: "/manifest-kitchen.json",
};

export default function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark">
      {children}
      <KitchenPwaRegister />
    </div>
  );
}
