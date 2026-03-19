/**
 * POST /api/auth/pin
 *
 * Authenticates a staff member by PIN for the kitchen/POS display.
 * Queries all active staff for the given restaurant, attempts bcrypt comparison
 * for each until a match is found (avoids timing attacks via constant-time compare).
 *
 * On success: sets `fbqr_staff_session` HTTP-only cookie (4h TTL) and returns
 * staff info. The cookie is then verified in middleware for /(kitchen) routes.
 *
 * Body: { restaurantId: string, pin: string }
 * Response 200: { staffId, name, restaurantId, branchId, permissions }
 * Response 401: { error: "invalid_credentials" }
 * Response 400: { error: "invalid_input" }
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@repo/database";
import { verifyPin } from "@/lib/auth/pin";
import { signStaffJwt, STAFF_SESSION_TTL_SECONDS } from "@/lib/auth/staff-jwt";

const bodySchema = z.object({
  restaurantId: z.string().uuid(),
  pin: z.string().regex(/^\d{4,6}$/),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { restaurantId, pin } = parsed.data;

  // Load all active staff for this restaurant (not deleted)
  const staffList = await prisma.staff.findMany({
    where: {
      restaurantId,
      isActive: true,
      deletedAt: null,
    },
    include: {
      roleAssignments: {
        include: {
          merchantRole: { select: { permissions: true } },
        },
      },
    },
  });

  // Try each staff member — first match wins
  let matchedStaff: (typeof staffList)[number] | null = null;
  for (const staff of staffList) {
    const match = await verifyPin(pin, staff.pinHash);
    if (match) {
      matchedStaff = staff;
      break;
    }
  }

  if (!matchedStaff) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  // Collect permissions from all assigned roles
  const permissions = Array.from(
    new Set(
      matchedStaff.roleAssignments.flatMap((ra) => ra.merchantRole.permissions)
    )
  );

  const token = await signStaffJwt({
    staffId: matchedStaff.id,
    name: matchedStaff.name,
    restaurantId: matchedStaff.restaurantId,
    branchId: matchedStaff.branchId,
    permissions,
  });

  const response = NextResponse.json({
    staffId: matchedStaff.id,
    name: matchedStaff.name,
    restaurantId: matchedStaff.restaurantId,
    branchId: matchedStaff.branchId,
    permissions,
  });

  response.cookies.set("fbqr_staff_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STAFF_SESSION_TTL_SECONDS,
  });

  return response;
}
