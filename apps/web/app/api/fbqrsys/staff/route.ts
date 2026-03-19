/**
 * GET  /api/fbqrsys/staff — list SystemAdmin accounts
 * POST /api/fbqrsys/staff — create a new SystemAdmin (invite flow)
 *
 * Both require: admins:manage
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

export async function GET() {
  const session = await requireSystemAdmin();
  const permissions = await getSystemAdminPermissions(session.user.id);
  if (!hasPermission(permissions, "admins:manage")) {
    return NextResponse.json(forbiddenResponse("admins:manage"), {
      status: 403,
    });
  }

  const staff = await prisma.systemAdmin.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      createdAt: true,
      mustChangePassword: true,
      createdByAdminId: true,
      createdBy: { select: { email: true } },
      roleAssignments: {
        include: { systemRole: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json({ staff });
}

const createStaffSchema = z.object({
  email: z.string().email("Email tidak valid"),
  /** Temporary password — staff will be prompted to change on first login */
  password: z.string().min(8, "Password minimal 8 karakter"),
  roleId: z.string().min(1, "Role wajib dipilih"),
});

export async function POST(req: NextRequest) {
  const session = await requireSystemAdmin();
  const permissions = await getSystemAdminPermissions(session.user.id);
  if (!hasPermission(permissions, "admins:manage")) {
    return NextResponse.json(forbiddenResponse("admins:manage"), {
      status: 403,
    });
  }

  const body = await req.json();
  const parsed = createStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { email, password, roleId } = parsed.data;

  const existing = await prisma.systemAdmin.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email sudah terdaftar" },
      { status: 409 }
    );
  }

  const role = await prisma.systemRole.findUnique({ where: { id: roleId } });
  if (!role) {
    return NextResponse.json({ error: "Role tidak ditemukan" }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.systemAdmin.create({
    data: {
      email,
      passwordHash,
      mustChangePassword: true,
      createdByAdminId: session.user.id,
      roleAssignments: {
        create: { systemRoleId: roleId },
      },
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
      mustChangePassword: true,
      roleAssignments: {
        include: { systemRole: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json({ admin }, { status: 201 });
}
