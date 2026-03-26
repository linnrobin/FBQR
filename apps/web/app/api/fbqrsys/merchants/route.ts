/**
 * GET  /api/fbqrsys/merchants — list merchants (with filter/pagination)
 * POST /api/fbqrsys/merchants — create a new merchant account
 *
 * GET requires: merchants:read
 * POST requires: merchants:create
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireSystemAdmin } from "@/lib/auth/session";
import {
  getSystemAdminPermissions,
  hasPermission,
  forbiddenResponse,
} from "@/lib/auth/rbac";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { startOfMonth, endOfMonth } from "date-fns";

// =============================================================================
// GET — merchant list
// =============================================================================

export async function GET(req: NextRequest) {
  const session = await requireSystemAdmin();
  const permissions = await getSystemAdminPermissions(session.user.id);
  if (!hasPermission(permissions, "merchants:read")) {
    return NextResponse.json(forbiddenResponse("merchants:read"), {
      status: 403,
    });
  }

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const planId = searchParams.get("planId") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = 25;

  // Build the filter object incrementally to avoid Prisma optional-type issues
  const statusFilter =
    status && status !== "ALL"
      ? { status: status as "ACTIVE" | "TRIAL" | "SUSPENDED" | "CANCELLED" }
      : {};
  const planFilter =
    planId && planId !== "ALL" ? { subscription: { planId } } : {};
  const searchFilter = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" as const } },
          {
            restaurant: {
              name: { contains: search, mode: "insensitive" as const },
            },
          },
        ],
      }
    : {};

  const where = { ...statusFilter, ...planFilter, ...searchFilter };

  const [merchants, total] = await Promise.all([
    prisma.merchant.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        restaurant: { select: { id: true, name: true } },
        subscription: {
          include: {
            plan: { select: { id: true, name: true } },
          },
        },
        assignedAdmin: { select: { id: true, email: true } },
      },
    }),
    prisma.merchant.count({ where }),
  ]);

  return NextResponse.json({
    merchants,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// =============================================================================
// POST — create merchant
// =============================================================================

const createMerchantSchema = z.object({
  restaurantName: z.string().min(1, "Nama restoran wajib diisi"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  cuisineType: z.string().optional(),
  phone: z.string().optional(),
  planId: z.string().min(1, "Plan wajib dipilih"),
  billingCycle: z.enum(["MONTHLY", "ANNUAL"]),
  isTrial: z.boolean().default(true),
  trialDays: z.number().int().min(1).max(90).optional(),
  multiBranchEnabled: z.boolean().default(false),
  branchLimit: z.number().int().min(1).optional(),
  notes: z.string().optional(),
  assignedToAdminId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireSystemAdmin();
  const permissions = await getSystemAdminPermissions(session.user.id);
  if (!hasPermission(permissions, "merchants:create")) {
    return NextResponse.json(forbiddenResponse("merchants:create"), {
      status: 403,
    });
  }

  const body = await req.json();
  const parsed = createMerchantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const {
    restaurantName,
    email,
    password,
    cuisineType,
    phone,
    planId,
    billingCycle,
    isTrial,
    trialDays,
    multiBranchEnabled,
    branchLimit,
    notes,
    assignedToAdminId,
  } = parsed.data;

  // Check email uniqueness
  const existing = await prisma.merchant.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email sudah terdaftar" },
      { status: 409 }
    );
  }

  // Validate plan
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: planId },
  });
  if (!plan) {
    return NextResponse.json({ error: "Plan tidak ditemukan" }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();
  const trialDuration = trialDays ?? 14;
  const trialEndsAt = isTrial
    ? new Date(now.getTime() + trialDuration * 24 * 60 * 60 * 1000)
    : null;

  const periodStart = startOfMonth(now);
  const periodEnd = endOfMonth(now);

  const merchant = await prisma.merchant.create({
    data: {
      email,
      passwordHash,
      status: isTrial ? "TRIAL" : "ACTIVE",
      trialEndsAt,
      multiBranchEnabled,
      branchLimit: branchLimit ?? 1,
      notes: notes ?? null,
      assignedToAdminId: assignedToAdminId ?? null,
      restaurant: {
        create: {
          name: restaurantName,
          slug: `${restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}`,
          cuisineType: cuisineType ?? null,
          phone: phone ?? null,
        },
      },
      subscription: {
        create: {
          planId,
          cycle: billingCycle,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          autoRenew: true,
        },
      },
    },
    include: {
      restaurant: { select: { id: true, name: true } },
      subscription: { include: { plan: { select: { name: true } } } },
    },
  });

  return NextResponse.json({ merchant }, { status: 201 });
}
