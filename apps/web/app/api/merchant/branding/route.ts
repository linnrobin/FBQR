/**
 * Merchant branding API — GET and PATCH restaurant branding settings.
 * Route: /api/merchant/branding
 *
 * GET  — Fetch current branding for the authenticated merchant's restaurant.
 * PATCH — Upsert branding settings. Returns WCAG contrast warnings if colors
 *         fail 4.5:1 ratio, but DOES NOT block the save (warn-only per spec).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";
import { z } from "zod";

const FONT_FAMILIES = [
  "Inter",
  "Poppins",
  "Lato",
  "Playfair Display",
  "Montserrat",
  "Nunito",
  "Raleway",
  "Source Sans Pro",
] as const;

const BrandingSchema = z.object({
  logoUrl: z.string().url().nullable().optional(),
  bannerUrl: z.string().url().nullable().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a 6-digit hex color")
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a 6-digit hex color")
    .optional(),
  fontFamily: z.enum(FONT_FAMILIES).optional(),
  borderRadius: z.enum(["sharp", "rounded", "pill"]).optional(),
  menuLayout: z.enum(["GRID", "LIST", "BUNDLE", "SPOTLIGHT"]).optional(),
  customCss: z.string().max(10000).nullable().optional(),
});

// ── WCAG Contrast helpers ─────────────────────────────────────────────────────

function hexToLinear(hex: string): number {
  const n = parseInt(hex, 16) / 255;
  return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
}

function relativeLuminance(color: string): number {
  const r = hexToLinear(color.slice(1, 3));
  const g = hexToLinear(color.slice(3, 5));
  const b = hexToLinear(color.slice(5, 7));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(c1: string, c2: string): number {
  const l1 = relativeLuminance(c1);
  const l2 = relativeLuminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getWcagWarnings(
  primaryColor: string,
  secondaryColor: string
): string[] {
  const warnings: string[] = [];
  const WHITE = "#FFFFFF";
  const SURFACE = "#FAFAF9";
  const MIN_RATIO = 4.5;

  const primaryOnSurface = contrastRatio(primaryColor, SURFACE);
  if (primaryOnSurface < MIN_RATIO) {
    warnings.push(
      `Warna utama (${primaryColor}) pada latar putih: rasio kontras ${primaryOnSurface.toFixed(2)}:1 (minimum ${MIN_RATIO}:1 WCAG AA)`
    );
  }

  const whiteOnPrimary = contrastRatio(WHITE, primaryColor);
  if (whiteOnPrimary < MIN_RATIO) {
    warnings.push(
      `Teks putih pada tombol warna utama (${primaryColor}): rasio kontras ${whiteOnPrimary.toFixed(2)}:1 (minimum ${MIN_RATIO}:1 WCAG AA)`
    );
  }

  const secondaryOnSurface = contrastRatio(secondaryColor, SURFACE);
  if (secondaryOnSurface < MIN_RATIO) {
    warnings.push(
      `Warna sekunder (${secondaryColor}) pada latar putih: rasio kontras ${secondaryOnSurface.toFixed(2)}:1 (minimum ${MIN_RATIO}:1 WCAG AA)`
    );
  }

  return warnings;
}

// ── Route handlers ────────────────────────────────────────────────────────────

export async function GET() {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const branding = await prisma.restaurantBranding.findUnique({
    where: { restaurantId },
  });

  return NextResponse.json({ branding });
}

export async function PATCH(req: NextRequest) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = BrandingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Build the upsert payload — only include fields that were provided
  const updateData: Record<string, unknown> = {};
  if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
  if (data.bannerUrl !== undefined) updateData.bannerUrl = data.bannerUrl;
  if (data.primaryColor !== undefined) updateData.primaryColor = data.primaryColor;
  if (data.secondaryColor !== undefined) updateData.secondaryColor = data.secondaryColor;
  if (data.fontFamily !== undefined) updateData.fontFamily = data.fontFamily;
  if (data.borderRadius !== undefined) updateData.borderRadius = data.borderRadius;
  if (data.menuLayout !== undefined) updateData.menuLayout = data.menuLayout;
  if (data.customCss !== undefined) updateData.customCss = data.customCss;

  const branding = await prisma.restaurantBranding.upsert({
    where: { restaurantId },
    update: updateData,
    create: {
      restaurantId,
      ...updateData,
    },
  });

  // Compute WCAG warnings for the final colors (warn-only, never block)
  const finalPrimary = (data.primaryColor ?? branding.primaryColor) as string;
  const finalSecondary = (data.secondaryColor ?? branding.secondaryColor) as string;
  const wcagWarnings = getWcagWarnings(finalPrimary, finalSecondary);

  return NextResponse.json({
    branding,
    wcagWarnings: wcagWarnings.length > 0 ? wcagWarnings : undefined,
  });
}
