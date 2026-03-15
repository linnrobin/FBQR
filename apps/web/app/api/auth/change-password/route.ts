/**
 * POST /api/auth/change-password
 *
 * Forces a SystemAdmin to set a new password when mustChangePassword = true.
 * Also available for voluntary password changes (mustChangePassword = false).
 *
 * Requires an active FBQRSYS admin session.
 * Updates passwordHash and clears mustChangePassword flag atomically.
 *
 * Body: { currentPassword: string, newPassword: string }
 * Response 200: { success: true }
 * Response 400: { error: string }
 * Response 401: { error: "unauthorized" }
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@repo/database";
import bcrypt from "bcryptjs";

const bodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .max(128),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.userType !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "invalid_input" },
      { status: 400 }
    );
  }

  const admin = await prisma.systemAdmin.findUnique({
    where: { id: session.user.id },
  });
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const currentOk = await bcrypt.compare(
    parsed.data.currentPassword,
    admin.passwordHash
  );
  if (!currentOk) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 400 }
    );
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.systemAdmin.update({
    where: { id: admin.id },
    data: {
      passwordHash: newHash,
      mustChangePassword: false,
    },
  });

  return NextResponse.json({ success: true });
}
