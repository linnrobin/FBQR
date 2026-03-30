/**
 * GET /api/auth/customer/verify-email?token=...
 * Verifies a customer's email address via a signed JWT link.
 * Redirects to /account on success.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { verifyEmailVerifyJwt } from "@/lib/customer-auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";

  const payload = await verifyEmailVerifyJwt(token);
  if (!payload) {
    return new NextResponse(
      "<html><body><p>Link verifikasi tidak valid atau sudah kadaluarsa.</p></body></html>",
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  await prisma.customer.updateMany({
    where: { id: payload.customerId, email: payload.email, emailVerifiedAt: null },
    data: { emailVerifiedAt: new Date() },
  });

  return NextResponse.redirect(
    new URL("/account?verified=1", req.nextUrl.origin)
  );
}
