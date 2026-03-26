/**
 * POST /api/fbqrsys/merchants/[merchantId]/suspend
 * Suspend or unsuspend a merchant account.
 * Requires: merchants:suspend
 *
 * Body: { action: "suspend" | "unsuspend", reason?: string }
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

type Params = { merchantId: string };

const suspendSchema = z.object({
  action: z.enum(["suspend", "unsuspend"]),
  reason: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const session = await requireSystemAdmin();
  const permissions = await getSystemAdminPermissions(session.user.id);
  if (!hasPermission(permissions, "merchants:suspend")) {
    return NextResponse.json(forbiddenResponse("merchants:suspend"), {
      status: 403,
    });
  }

  const { merchantId } = await params;
  const body = await req.json();
  const parsed = suspendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { action, reason } = parsed.data;

  const existing = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true, status: true },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Merchant tidak ditemukan" },
      { status: 404 }
    );
  }

  if (action === "suspend" && existing.status === "SUSPENDED") {
    return NextResponse.json(
      { error: "Merchant sudah ditangguhkan" },
      { status: 409 }
    );
  }
  if (action === "unsuspend" && existing.status !== "SUSPENDED") {
    return NextResponse.json(
      { error: "Merchant tidak dalam status ditangguhkan" },
      { status: 409 }
    );
  }

  const updateData =
    action === "suspend"
      ? {
          status: "SUSPENDED" as const,
          suspendedAt: new Date(),
          suspendedReason: reason ?? "MANUAL_ADMIN",
          suspendedByAdminId: session.user.id,
        }
      : {
          status: "ACTIVE" as const,
          suspendedAt: null,
          suspendedReason: null,
          suspendedByAdminId: null,
        };

  const merchant = await prisma.merchant.update({
    where: { id: merchantId },
    data: updateData,
    select: { id: true, status: true, suspendedAt: true, suspendedReason: true },
  });

  return NextResponse.json({ merchant });
}
