/**
 * Merchant POS layout — restaurant owner routes.
 * Route protection is handled by middleware.ts.
 *
 * Renders the sidebar shell for authenticated merchant pages.
 * Login and onboarding pages override this with fixed full-screen layouts.
 * Includes PWA manifest link and service worker registration.
 */
import type { Metadata } from "next";
import { MerchantSidebar } from "@/components/merchant/sidebar";
import { PwaRegister } from "@/components/merchant/pwa-register";

export const metadata: Metadata = {
  title: {
    default: "Merchant Portal",
    template: "%s | Merchant Portal",
  },
  manifest: "/manifest.json",
};

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-stone-50">
      <MerchantSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <PwaRegister />
    </div>
  );
}
