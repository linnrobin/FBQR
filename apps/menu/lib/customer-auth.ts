/**
 * Customer authentication helpers for apps/menu.
 *
 * Uses jose (HS256 JWT) stored as an httpOnly cookie named `fbqr_customer_session`.
 * Distinct from the QR session cookie `fbqr_session_id`.
 *
 * Cookie is scoped to menu.fbqr.app (or localhost:3001 in dev).
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";

export const CUSTOMER_COOKIE = "fbqr_customer_session";
export const CUSTOMER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface CustomerJwtPayload extends JWTPayload {
  customerId: string;
  email: string;
}

function getSecret(): Uint8Array {
  const rawSecret = process.env.NEXTAUTH_SECRET;
  if (!rawSecret) {
    throw new Error("NEXTAUTH_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(`customer:${rawSecret}`);
}

/** Sign a customer JWT. */
export async function signCustomerJwt(
  payload: Omit<CustomerJwtPayload, keyof JWTPayload>
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${CUSTOMER_SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

/** Verify and decode a customer JWT. Returns null on failure. */
export async function verifyCustomerJwt(
  token: string
): Promise<CustomerJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as CustomerJwtPayload;
  } catch {
    return null;
  }
}

/** Read and verify the customer cookie from the incoming request. Returns null if missing/invalid. */
export async function getCustomerSession(): Promise<CustomerJwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  return verifyCustomerJwt(token);
}

/** Sign a short-lived (24h) email verification JWT. */
export async function signEmailVerifyJwt(customerId: string, email: string): Promise<string> {
  return new SignJWT({ customerId, email, purpose: "email_verify" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSecret());
}

/** Verify email verification JWT. Returns { customerId, email } or null. */
export async function verifyEmailVerifyJwt(
  token: string
): Promise<{ customerId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.purpose !== "email_verify") return null;
    return { customerId: payload.customerId as string, email: payload.email as string };
  } catch {
    return null;
  }
}
