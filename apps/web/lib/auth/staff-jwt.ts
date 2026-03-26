/**
 * Staff JWT utilities for PIN-based sessions.
 *
 * Staff authenticate with a 4–6 digit PIN (not email/password).
 * Sessions are device-local, stored in the `fbqr_staff_session` cookie.
 * Default TTL: 4 hours (inactivity timeout per ADR note in architecture.md).
 *
 * Uses `jose` for edge-runtime compatibility (middleware can verify without
 * importing Node-only `jsonwebtoken`).
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

/** TTL for staff sessions: 4 hours in seconds */
export const STAFF_SESSION_TTL_SECONDS = 4 * 60 * 60;

export interface StaffSessionPayload extends JWTPayload {
  staffId: string;
  name: string;
  restaurantId: string;
  branchId: string | null;
  /** Permission keys e.g. ["orders:view", "orders:manage"] */
  permissions: string[];
}

function getSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  return new TextEncoder().encode(`staff-session:${secret}`);
}

/**
 * Create a signed JWT for a staff session.
 */
export async function signStaffJwt(
  payload: Omit<StaffSessionPayload, keyof JWTPayload>
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${STAFF_SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

/**
 * Verify a staff session JWT.
 * Returns the decoded payload or null if invalid / expired.
 */
export async function verifyStaffJwt(
  token: string
): Promise<StaffSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as StaffSessionPayload;
  } catch {
    return null;
  }
}
