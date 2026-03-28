/**
 * GET /api/auth/verify-email?token=...
 *
 * Verifies the email-verification JWT, sets Merchant.emailVerifiedAt,
 * then redirects to /merchant/login?verified=1.
 *
 * Tokens are signed with NEXTAUTH_SECRET (HS256, 24h expiry).
 * Idempotent — re-verifying an already-verified account is a no-op.
 */
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@repo/database";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/merchant/login?error=invalid_token", req.url)
    );
  }

  const rawSecret = process.env.NEXTAUTH_SECRET;
  if (!rawSecret) {
    console.error("[verify-email] NEXTAUTH_SECRET is not set");
    return NextResponse.redirect(
      new URL("/merchant/login?error=invalid_token", req.url)
    );
  }
  const secret = new TextEncoder().encode(rawSecret);

  let payload: { sub?: string; purpose?: string };
  try {
    const { payload: p } = await jwtVerify(token, secret);
    payload = p as { sub?: string; purpose?: string };
  } catch {
    return NextResponse.redirect(
      new URL("/merchant/login?error=invalid_token", req.url)
    );
  }

  if (payload.purpose !== "email-verify" || !payload.sub) {
    return NextResponse.redirect(
      new URL("/merchant/login?error=invalid_token", req.url)
    );
  }

  const merchant = await prisma.merchant.findUnique({
    where: { id: payload.sub },
    select: { id: true, emailVerifiedAt: true },
  });

  if (!merchant) {
    return NextResponse.redirect(
      new URL("/merchant/login?error=invalid_token", req.url)
    );
  }

  // Idempotent — if already verified just redirect
  if (!merchant.emailVerifiedAt) {
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: { emailVerifiedAt: new Date() },
    });
  }

  return NextResponse.redirect(
    new URL("/merchant/login?verified=1", req.url)
  );
}
