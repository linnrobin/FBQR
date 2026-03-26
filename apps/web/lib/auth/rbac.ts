/**
 * RBAC permission engine — Step 4
 *
 * Two permission namespaces:
 *   MerchantPermission — controls staff access to merchant-pos and kitchen features
 *   SystemPermission   — controls FBQRSYS admin access to platform admin functions
 *
 * Permission resolution by actor type:
 *   Merchant owner (NextAuth MERCHANT session)
 *     → always granted all merchant permissions (owner has full access by design)
 *   Staff (fbqr_staff_session cookie JWT)
 *     → permissions embedded in the JWT at PIN login time (from MerchantRole assignments)
 *   SystemAdmin (NextAuth SYSTEM_ADMIN session)
 *     → permissions loaded from DB via SystemRoleAssignment → SystemRole
 *
 * Usage patterns:
 *
 *   1. In a Server Component or Server Action inside /(fbqrsys):
 *      const session = await requireSystemAdmin();           // from session.ts
 *      await requireSystemPermission(session.user.id, 'merchants:create');
 *
 *   2. In a /(kitchen) or /(merchant) API route handler (staff):
 *      const staffSession = await getStaffSession(cookieStore);
 *      if (!staffSession) return forbidden();
 *      requireStaffPermission(staffSession, 'orders:manage');
 *
 *   3. Checking permission without side effects (e.g. to conditionally render UI):
 *      const allowed = hasPermission(staffSession.permissions, 'reports:read');
 *
 * See docs/merchant.md § RBAC, docs/platform-owner.md § FBQRSYS Permissions.
 * See docs/architecture.md ADR-005.
 */

import { prisma } from "@repo/database";
import { redirect } from "next/navigation";
import { verifyStaffJwt } from "@/lib/auth/staff-jwt";
import type { StaffSessionPayload } from "@/lib/auth/staff-jwt";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

// Re-export permission types for convenience so callers import from one place
export type {
  MerchantPermission,
  SystemPermission,
} from "@repo/config/role-templates";

import type { MerchantPermission, SystemPermission } from "@repo/config/role-templates";

// =============================================================================
// CORE UTILITY
// =============================================================================

/**
 * Check whether a permission set includes the required permission.
 * Pure function — no side effects.
 */
export function hasPermission(
  userPermissions: string[],
  permission: string
): boolean {
  return userPermissions.includes(permission);
}

// =============================================================================
// STAFF (PIN SESSION) GATES
// =============================================================================

/**
 * Error thrown when a staff member lacks a required merchant permission.
 * API route handlers catch this and return HTTP 403.
 */
export class ForbiddenError extends Error {
  readonly permission: string;
  constructor(permission: string) {
    super(`Forbidden: missing permission '${permission}'`);
    this.name = "ForbiddenError";
    this.permission = permission;
  }
}

/**
 * Assert that the staff session includes the required merchant permission.
 * Throws ForbiddenError if the permission is missing.
 *
 * Use in API route handlers (catch → return 403) or Server Components (catch → redirect).
 */
export function requireStaffPermission(
  staff: StaffSessionPayload,
  permission: MerchantPermission
): void {
  if (!hasPermission(staff.permissions, permission)) {
    throw new ForbiddenError(permission);
  }
}

/**
 * Parse and verify the fbqr_staff_session cookie from the cookie store.
 * Returns the staff payload or null if the cookie is absent/invalid.
 *
 * Usage in Route Handlers:
 *   import { cookies } from 'next/headers';
 *   const staffSession = await getStaffSession(await cookies());
 */
export async function getStaffSession(
  cookieStore: ReadonlyRequestCookies
): Promise<StaffSessionPayload | null> {
  const cookie = cookieStore.get("fbqr_staff_session");
  if (!cookie) return null;
  return verifyStaffJwt(cookie.value);
}

// =============================================================================
// MERCHANT OWNER HELPERS
// =============================================================================

/**
 * Return true if the session is a merchant owner (who always has full access).
 * Use this as a short-circuit before checking specific permissions.
 */
export function isMerchantOwner(userType: string): boolean {
  return userType === "MERCHANT";
}

// =============================================================================
// SYSTEM ADMIN (FBQRSYS) GATES
// =============================================================================

/**
 * Load the union of all permissions granted to a SystemAdmin through their
 * SystemRoleAssignment records.
 *
 * Returns an empty array if the admin has no roles assigned.
 * No caching in Phase 1 — DB round-trip on each call.
 */
export async function getSystemAdminPermissions(
  adminId: string
): Promise<string[]> {
  const assignments = await prisma.systemRoleAssignment.findMany({
    where: { systemAdminId: adminId },
    include: { systemRole: { select: { permissions: true } } },
  });

  const permissions = new Set<string>();
  for (const assignment of assignments) {
    for (const perm of assignment.systemRole.permissions) {
      permissions.add(perm);
    }
  }
  return Array.from(permissions);
}

/**
 * Require a SystemAdmin to hold a specific FBQRSYS permission.
 * Redirects to /fbqrsys/login if the admin lacks the permission.
 *
 * For use in Server Components and Server Actions inside /(fbqrsys) routes.
 * API Route handlers should use getSystemAdminPermissions() + hasPermission()
 * and return NextResponse.json({error:'forbidden'}, {status:403}) instead.
 */
export async function requireSystemPermission(
  adminId: string,
  permission: SystemPermission
): Promise<void> {
  const permissions = await getSystemAdminPermissions(adminId);
  if (!hasPermission(permissions, permission)) {
    redirect("/fbqrsys/login");
  }
}

// =============================================================================
// CONVENIENCE RESPONSE HELPERS (for API route handlers)
// =============================================================================

/**
 * Standard 403 JSON response for API routes.
 * Import NextResponse at the call site — this helper just builds the body object.
 */
export function forbiddenResponse(permission?: string) {
  return {
    error: "forbidden",
    ...(permission && { required_permission: permission }),
  };
}
