/**
 * POST /api/auth/customer/login
 *
 * Authenticates a customer with email + password.
 * Sets the fbqr_customer_session httpOnly cookie on success.
 *
 * Body: { email, password }
 * Response 200: { customerId, email, name, emailVerified }
 * Response 401: invalid credentials
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@repo/database";
import bcrypt from "bcryptjs";
import {
  signCustomerJwt,
  CUSTOMER_COOKIE,
  CUSTOMER_SESSION_TTL_SECONDS,
} from "@/lib/customer-auth";

const schema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const { email, password } = parsed.data;

    const customer = await prisma.customer.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        hashedPassword: true,
        emailVerifiedAt: true,
        status: true,
      },
    });

    if (!customer || !customer.hashedPassword) {
      return NextResponse.json(
        { error: "Email atau kata sandi salah" },
        { status: 401 }
      );
    }

    if (customer.status === "DELETED") {
      return NextResponse.json(
        { error: "Akun tidak ditemukan" },
        { status: 401 }
      );
    }

    const match = await bcrypt.compare(password, customer.hashedPassword);
    if (!match) {
      return NextResponse.json(
        { error: "Email atau kata sandi salah" },
        { status: 401 }
      );
    }

    const token = await signCustomerJwt({ customerId: customer.id, email: customer.email! });

    const res = NextResponse.json({
      customerId: customer.id,
      email: customer.email,
      name: customer.name,
      emailVerified: !!customer.emailVerifiedAt,
    });
    res.cookies.set(CUSTOMER_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: CUSTOMER_SESSION_TTL_SECONDS,
    });
    return res;
  } catch (err) {
    console.error("[POST /api/auth/customer/login]", err);
    return NextResponse.json({ error: "Terjadi kesalahan." }, { status: 500 });
  }
}
