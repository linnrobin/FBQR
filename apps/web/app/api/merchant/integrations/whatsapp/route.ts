/**
 * GET    /api/merchant/integrations/whatsapp — get WA integration config (masked token)
 * POST   /api/merchant/integrations/whatsapp — create or update WA integration
 * DELETE /api/merchant/integrations/whatsapp — remove (deactivate) WA integration
 *
 * Requires: settings:manage
 *
 * Credentials stored in MerchantIntegration.credentials JSON:
 *   { "token": "<fonnte_token>", "senderNumber": "<E.164 phone>" }
 * Token is masked in GET response (last 4 chars only) for security.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { auditLog, getRequestMeta } from "@/lib/audit";
import { z } from "zod";

const UpsertSchema = z.object({
  token: z.string().min(10, "Token Fonnte tidak valid"),
  senderNumber: z
    .string()
    .regex(/^\+?[0-9]{8,15}$/, "Nomor pengirim harus berformat E.164 (contoh: +6281234567890)")
    .optional()
    .nullable(),
});

export async function GET() {
  const session = await requireMerchant();
  if (!hasPermission(session.user.permissions, "settings:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const integration = await prisma.merchantIntegration.findFirst({
    where: { merchantId: session.user.merchantId, type: "WHATSAPP" },
    select: { id: true, isActive: true, createdAt: true, credentials: true },
  });

  if (!integration) {
    return NextResponse.json({ integration: null });
  }

  const creds = integration.credentials as Record<string, unknown>;
  const maskedToken =
    typeof creds.token === "string" && creds.token.length >= 4
      ? `${"*".repeat(creds.token.length - 4)}${creds.token.slice(-4)}`
      : "****";

  return NextResponse.json({
    integration: {
      id: integration.id,
      isActive: integration.isActive,
      createdAt: integration.createdAt,
      senderNumber: creds.senderNumber ?? null,
      maskedToken,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await requireMerchant();
  if (!hasPermission(session.user.permissions, "settings:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = UpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  }

  const { token, senderNumber } = parsed.data;
  const credentials = { token, ...(senderNumber ? { senderNumber } : {}) };

  const existing = await prisma.merchantIntegration.findFirst({
    where: { merchantId: session.user.merchantId, type: "WHATSAPP" },
    select: { id: true },
  });

  let integration;
  if (existing) {
    integration = await prisma.merchantIntegration.update({
      where: { id: existing.id },
      data: { credentials, isActive: true, updatedAt: new Date() },
    });
  } else {
    integration = await prisma.merchantIntegration.create({
      data: {
        merchantId: session.user.merchantId,
        type: "WHATSAPP",
        credentials,
        isActive: true,
      },
    });
  }

  await auditLog({
    actorType: "staff",
    actorId: session.user.id,
    actorName: session.user.name ?? session.user.email ?? "Unknown",
    action: existing ? "UPDATE" : "CREATE",
    entity: "MerchantIntegration",
    entityId: integration.id,
    restaurantId: session.user.restaurantId ?? undefined,
    newValue: { type: "WHATSAPP", isActive: true, senderNumber },
    ...(await getRequestMeta(req)),
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await requireMerchant();
  if (!hasPermission(session.user.permissions, "settings:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.merchantIntegration.findFirst({
    where: { merchantId: session.user.merchantId, type: "WHATSAPP" },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Integrasi tidak ditemukan" }, { status: 404 });
  }

  await prisma.merchantIntegration.update({
    where: { id: existing.id },
    data: { isActive: false },
  });

  await auditLog({
    actorType: "staff",
    actorId: session.user.id,
    actorName: session.user.name ?? session.user.email ?? "Unknown",
    action: "DELETE",
    entity: "MerchantIntegration",
    entityId: existing.id,
    restaurantId: session.user.restaurantId ?? undefined,
    newValue: { type: "WHATSAPP", isActive: false },
    ...(await getRequestMeta(req)),
  });

  return NextResponse.json({ success: true });
}
