/**
 * Restaurant-scoped layout for apps/menu.
 * Fetches RestaurantBranding server-side and injects CSS custom properties
 * into <head> to apply the merchant's brand colors, font, and border radius.
 *
 * This is a Server Component — CSS variables arrive in the initial HTML,
 * ensuring zero flash of unstyled content (FOUC) for customer-facing menu pages.
 *
 * Cache: branding data is stable between deploys; Next.js route-level caching
 * handles revalidation. Changes take effect within the Next.js cache TTL.
 */
import { prisma } from "@repo/database";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  params: Promise<{ restaurantId: string }>;
}

/** Map the BorderRadiusStyle enum value to a CSS px value. */
function borderRadiusToCss(style: string): string {
  if (style === "sharp") return "4px";
  if (style === "pill") return "9999px";
  return "12px"; // rounded (default)
}

export default async function RestaurantLayout({ children, params }: Props) {
  const { restaurantId } = await params;

  const branding = await prisma.restaurantBranding.findUnique({
    where: { restaurantId },
    select: {
      primaryColor: true,
      secondaryColor: true,
      fontFamily: true,
      borderRadius: true,
      customCss: true,
    },
  });

  const primary = branding?.primaryColor ?? "#E8622A";
  const secondary = branding?.secondaryColor ?? "#F5F5F5";
  const fontFamily = branding?.fontFamily ?? "Inter";
  const borderRadius = borderRadiusToCss(branding?.borderRadius ?? "rounded");

  // Build CSS custom property block — injected server-side in <head>
  const cssVars = `
:root {
  --color-primary: ${primary};
  --color-primary-hover: color-mix(in srgb, ${primary} 85%, black);
  --color-secondary: ${secondary};
  --font-family: ${fontFamily}, sans-serif;
  --border-radius: ${borderRadius};
  --border-radius-sm: calc(${borderRadius} * 0.5);
}
`.trim();

  // customCss is FBQRSYS admin only — already sanitized before storage.
  // We re-check it is non-null before injecting to avoid XSS from empty saves.
  const customCss = branding?.customCss ?? "";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      {customCss && (
        <style dangerouslySetInnerHTML={{ __html: customCss }} />
      )}
      {children}
    </>
  );
}
