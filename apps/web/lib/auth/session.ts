/**
 * Server-side session helpers for NextAuth (email+password) sessions.
 * For staff PIN sessions, use verifyStaffJwt from staff-jwt.ts.
 * For permission checks, use requirePermission() from rbac.ts.
 */
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

export type SystemAdminSession = Session & {
  user: {
    userType: "SYSTEM_ADMIN";
    id: string;
    email: string;
    mustChangePassword: boolean;
  };
};

export type MerchantSession = Session & {
  user: {
    userType: "MERCHANT";
    id: string;
    email: string;
    restaurantId: string | null;
    merchantStatus: string;
  };
};

/**
 * Require a FBQRSYS admin session. Redirects to /fbqrsys/login if not authenticated.
 * Call in Server Components or Route Handlers inside (fbqrsys) routes.
 */
export async function requireSystemAdmin(): Promise<SystemAdminSession> {
  const session = await auth();
  if (!session || session.user?.userType !== "SYSTEM_ADMIN") {
    redirect("/fbqrsys/login");
  }
  return session as SystemAdminSession;
}

/**
 * Require a merchant session. Redirects to /merchant/login if not authenticated.
 * Call in Server Components or Route Handlers inside (merchant) routes.
 */
export async function requireMerchant(): Promise<MerchantSession> {
  const session = await auth();
  if (!session || session.user?.userType !== "MERCHANT") {
    redirect("/merchant/login");
  }
  return session as MerchantSession;
}

/**
 * Get the current session without redirecting.
 * Returns null if there is no active session.
 * Useful for optionally checking the session in layouts and shared components.
 */
export async function getSession(): Promise<Session | null> {
  return auth();
}
