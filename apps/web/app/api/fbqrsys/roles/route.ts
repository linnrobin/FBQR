/**
 * GET  /api/fbqrsys/roles  — list all SystemRole records
 * POST /api/fbqrsys/roles  — create a new SystemRole
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
import { z } from "zod";
import { SYSTEM_PERMISSIONS } from "@repo/config/role-templates";

export async function GET() {
  const session = await requireSystemAdmin();
  const permissions = await getSystemAdminPermissions(session.user.id);
  if (!hasPermission(permissions, "admins:manage")) {
    return NextResponse.json(forbiddenResponse("admins:manage"), {
      status: 403,
    });
  }

  const roles = await prisma.systemRole.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { assignments: true } } },
  });

  return NextResponse.json({ roles, availablePermissions: SYSTEM_PERMISSIONS });
}

const createRoleSchema = z.object({
  name: z.string().min(1, "Nama role wajib diisi"),
  permissions: z
    .array(z.string())
    .min(1, "Role harus memiliki minimal satu permission"),
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
  const parsed = createRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const role = await prisma.systemRole.create({
    data: parsed.data,
  });

  return NextResponse.json({ role }, { status: 201 });
}
