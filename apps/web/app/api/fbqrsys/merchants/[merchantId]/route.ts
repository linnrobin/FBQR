/**
 * GET   /api/fbqrsys/merchants/[merchantId] — get merchant detail
 * PATCH /api/fbqrsys/merchants/[merchantId] — update merchant
 *
 * GET requires: merchants:read
 * PATCH requires: merchants:update
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const session = await requireSystemAdmin();
  const permissions = await getSystemAdminPermissions(session.user.id);
  if (!hasPermission(permissions, "merchants:read")) {
    return NextResponse.json(forbiddenResponse("merchants:read"), {
      status: 403,
    });
  }

  const { merchantId } = await params;

  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: {
      restaurant: {
        include: {
          branding: true,
          settings: true,
          branches: {
            select: {
              id: true,
              name: true,
              address: true,
              _count: { select: { tables: true } },
            },
          },
        },
      },
      subscription: {
        include: {
          plan: true,
          invoices: {
            orderBy: { createdAt: "desc" },
            take: 12,
          },
        },
      },
      assignedAdmin: { select: { id: true, email: true } },
    },
  });

  if (!merchant) {
    return NextResponse.json(
      { error: "Merchant tidak ditemukan" },
      { status: 404 }
    );
  }

  return NextResponse.json({ merchant });
}

const updateMerchantSchema = z.object({
  notes: z.string().optional(),
  assignedToAdminId: z.string().nullable().optional(),
  multiBranchEnabled: z.boolean().optional(),
  branchLimit: z.number().int().min(1).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const session = await requireSystemAdmin();
  const permissions = await getSystemAdminPermissions(session.user.id);
  if (!hasPermission(permissions, "merchants:update")) {
    return NextResponse.json(forbiddenResponse("merchants:update"), {
      status: 403,
    });
  }

  const { merchantId } = await params;
  const body = await req.json();
  const parsed = updateMerchantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { notes, assignedToAdminId, multiBranchEnabled, branchLimit } =
    parsed.data;

  const merchant = await prisma.merchant.update({
    where: { id: merchantId },
    data: {
      ...(notes !== undefined ? { notes } : {}),
      ...(assignedToAdminId !== undefined
        ? { assignedToAdminId }
        : {}),
      ...(multiBranchEnabled !== undefined ? { multiBranchEnabled } : {}),
      ...(branchLimit !== undefined ? { branchLimit } : {}),
    },
  });

  return NextResponse.json({ merchant });
}
