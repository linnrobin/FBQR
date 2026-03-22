/**
 * Restaurant Branding Settings — merchant-pos.
 * Route: /merchant/branding
 *
 * Allows merchants to configure logo, banner, colors, font, border radius, and
 * default menu layout. Changes are applied server-side to apps/menu via CSS
 * custom properties injected in the SSR layout (no rebuild needed).
 *
 * WCAG 2.1 AA contrast is validated on save — warns but does not block.
 */
import { redirect } from "next/navigation";
import { requireMerchant } from "@/lib/auth/session";
import { prisma } from "@repo/database";
import type { Metadata } from "next";
import { BrandingClient } from "./branding-client";

export const metadata: Metadata = { title: "Branding & Tampilan" };

export default async function BrandingPage() {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;

  if (!restaurantId) {
    redirect("/merchant/onboarding/step-1");
  }

  const branding = await prisma.restaurantBranding.findUnique({
    where: { restaurantId },
  });

  return (
    <BrandingClient
      initialBranding={
        branding
          ? {
              logoUrl: branding.logoUrl ?? "",
              bannerUrl: branding.bannerUrl ?? "",
              primaryColor: branding.primaryColor,
              secondaryColor: branding.secondaryColor,
              fontFamily: branding.fontFamily,
              borderRadius: branding.borderRadius,
              menuLayout: branding.menuLayout,
            }
          : {
              logoUrl: "",
              bannerUrl: "",
              primaryColor: "#E8622A",
              secondaryColor: "#F5F5F5",
              fontFamily: "Inter",
              borderRadius: "rounded",
              menuLayout: "GRID",
            }
      }
    />
  );
}
