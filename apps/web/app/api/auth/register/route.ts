/**
 * POST /api/auth/register — self-service merchant registration
 *
 * Creates Merchant + Restaurant + Branch (default "Pusat") in one transaction.
 * Sends a signed email-verification link (24h expiry, jose HS256).
 * Returns HTTP 201 — does NOT auto-log in. Merchant must verify email then log in.
 *
 * Body: { businessName, email, password, agreeToTerms }
 * Response 201: { message: string }
 * Response 400: { error: string }
 * Response 409: { error: "Email sudah terdaftar" }
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@repo/database";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { Resend } from "resend";

const bodySchema = z.object({
  businessName: z.string().min(1, "Nama usaha wajib diisi").max(100),
  email: z.string().email("Email tidak valid"),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .max(128, "Password terlalu panjang"),
  agreeToTerms: z.literal(true, {
    errorMap: () => ({ message: "Anda harus menyetujui Syarat & Ketentuan" }),
  }),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "invalid_input" },
      { status: 400 }
    );
  }

  const { businessName, email, password } = parsed.data;

  // Check email uniqueness
  const existing = await prisma.merchant.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email sudah terdaftar" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const slug = `${businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-${Date.now()}`;

  // Create Merchant + Restaurant + Branch in one transaction
  const merchant = await prisma.merchant.create({
    data: {
      email,
      passwordHash,
      status: "TRIAL",
      trialEndsAt,
      onboardingStep: 0,
      restaurant: {
        create: {
          name: businessName,
          slug,
          branches: {
            create: {
              name: "Pusat",
              branchCode: "PST",
            },
          },
        },
      },
    },
    select: { id: true, email: true },
  });

  // Generate email verification token (24h expiry, jose HS256)
  const secret = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET ?? "dev-secret-change-in-production"
  );
  const token = await new SignJWT({ sub: merchant.id, email: merchant.email, purpose: "email-verify" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);

  // Send verification email
  const webUrl =
    process.env.NEXT_PUBLIC_WEB_APP_URL ?? "http://localhost:3000";
  const verifyUrl = `${webUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const resend = new Resend(resendKey);
    const from = process.env.EMAIL_FROM ?? "noreply@fbqr.app";
    await resend.emails.send({
      from,
      to: merchant.email,
      subject: "Verifikasi email FBQR Anda",
      html: `
        <p>Halo,</p>
        <p>Terima kasih telah mendaftar di FBQR. Klik tombol di bawah untuk memverifikasi email Anda:</p>
        <p><a href="${verifyUrl}" style="background:#E8622A;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Verifikasi Email</a></p>
        <p>Link ini berlaku selama 24 jam.</p>
        <p>Jika Anda tidak mendaftar di FBQR, abaikan email ini.</p>
      `,
    });
  } else {
    // Dev fallback — log to console
    console.log("[register] Email verification URL (dev):", verifyUrl);
  }

  return NextResponse.json(
    { message: "Email verifikasi telah dikirim. Silakan cek inbox Anda." },
    { status: 201 }
  );
}
