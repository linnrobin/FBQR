/**
 * GET   /api/fbqrsys/settings — get PlatformSettings singleton
 * PATCH /api/fbqrsys/settings — update PlatformSettings
 *
 * GET requires: settings:manage OR reports:read
 * PATCH requires: settings:manage
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireSystemAdmin } from "@/lib/auth/session";
import {
  getSystemAdminPermissions,
  hasPermission,
  forbiddenResponse,
} from "@/lib/auth/rbac";
import { z } from "zod";

export async function GET() {
  const session = await requireSystemAdmin();
  const permissions = await getSystemAdminPermissions(session.user.id);
  if (
    !hasPermission(permissions, "settings:manage") &&
    !hasPermission(permissions, "reports:read")
  ) {
    return NextResponse.json(forbiddenResponse("settings:manage"), {
      status: 403,
    });
  }

  const settings = await prisma.platformSettings.findUnique({
    where: { id: 1 },
  });

  return NextResponse.json({ settings });
}

const updateSettingsSchema = z.object({
  supportEmail: z.string().email().optional(),
  supportWhatsapp: z.string().optional(),
  supportResponseMessage: z.string().optional(),
  platformName: z.string().optional(),
  platformTagline: z.string().optional(),
  platformLogoUrl: z.string().url().nullable().optional(),
  trialDurationDays: z.number().int().min(1).max(90).optional(),
  gracePeriodDays: z.number().int().min(0).max(30).optional(),
  ownerAlertEmail: z.string().email().nullable().optional(),
  ownerAlertWhatsapp: z.string().nullable().optional(),
  aiRecommendationsEnabled: z.boolean().optional(),
  tosUrl: z.string().url().nullable().optional(),
  privacyPolicyUrl: z.string().url().nullable().optional(),
  dpoEmail: z.string().email().nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await requireSystemAdmin();
  const permissions = await getSystemAdminPermissions(session.user.id);
  if (!hasPermission(permissions, "settings:manage")) {
    return NextResponse.json(forbiddenResponse("settings:manage"), {
      status: 403,
    });
  }

  const body = await req.json();
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // Use type assertion to satisfy Prisma's exactOptionalPropertyTypes.
  // Zod output with optional fields is compatible at runtime; TS disagrees due to exactOptionalPropertyTypes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData = parsed.data as any;
  const settings = await prisma.platformSettings.upsert({
    where: { id: 1 },
    update: updateData,
    create: { id: 1, ...updateData },
  });

  return NextResponse.json({ settings });
}
