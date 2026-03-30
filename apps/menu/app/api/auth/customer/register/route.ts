/**
 * POST /api/auth/customer/register
 *
 * Creates a new Customer account (email + password).
 * Sends a verification email; points are only credited after emailVerifiedAt is set.
 * In development (NODE_ENV !== "production") and when RESEND_API_KEY is absent,
 * the account is auto-verified for ease of testing.
 *
 * Body: { email, password, name? }
 * Response 201: { customerId, email, emailVerified: boolean }
 * Response 409: email already registered
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@repo/database";
import bcrypt from "bcryptjs";
import {
  signCustomerJwt,
  signEmailVerifyJwt,
  CUSTOMER_COOKIE,
  CUSTOMER_SESSION_TTL_SECONDS,
} from "@/lib/customer-auth";

const schema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(100).optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9]{8,15}$/, "Format nomor tidak valid")
    .optional()
    .nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, name, phone } = parsed.data;

    const existing = await prisma.customer.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email sudah terdaftar" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Auto-verify in development or when Resend is not configured
    const autoVerify =
      process.env.NODE_ENV !== "production" ||
      !process.env.RESEND_API_KEY;

    const customer = await prisma.customer.create({
      data: {
        email,
        hashedPassword,
        name: name ?? null,
        phone: phone ?? null,
        emailVerifiedAt: autoVerify ? new Date() : null,
      },
      select: { id: true, email: true, name: true, emailVerifiedAt: true },
    });

    // Send verification email when in production with Resend configured
    if (!autoVerify) {
      const verifyToken = await signEmailVerifyJwt(customer.id, email);
      const verifyUrl = `${process.env.NEXT_PUBLIC_MENU_APP_URL ?? ""}/api/auth/customer/verify-email?token=${verifyToken}`;
      // Fire-and-forget — don't block registration on email delivery
      sendVerificationEmail(email, customer.name, verifyUrl).catch((err) =>
        console.error("[register] email send failed:", err)
      );
    }

    // Log the customer in immediately after registration
    const jwtToken = await signCustomerJwt({ customerId: customer.id, email });
    const res = NextResponse.json(
      {
        customerId: customer.id,
        email: customer.email,
        name: customer.name,
        emailVerified: !!customer.emailVerifiedAt,
      },
      { status: 201 }
    );
    res.cookies.set(CUSTOMER_COOKIE, jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: CUSTOMER_SESSION_TTL_SECONDS,
    });
    return res;
  } catch (err) {
    console.error("[POST /api/auth/customer/register]", err);
    return NextResponse.json({ error: "Terjadi kesalahan." }, { status: 500 });
  }
}

async function sendVerificationEmail(
  email: string,
  name: string | null,
  verifyUrl: string
) {
  if (!process.env.RESEND_API_KEY) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "noreply@fbqr.app",
      to: email,
      subject: "Verifikasi email kamu — FBQR",
      html: `<p>Halo${name ? ` ${name}` : ""},</p><p>Klik link berikut untuk verifikasi email kamu:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>Link berlaku 24 jam.</p>`,
    }),
  });
}
