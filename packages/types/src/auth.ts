/**
 * Auth-related types shared between apps/web and NextAuth.js config.
 * See docs/architecture.md § Authentication Model.
 */

export type AuthUserRole = "SYSTEM_ADMIN" | "MERCHANT_OWNER" | "STAFF";

export interface SessionUser {
  id: string;
  email: string;
  role: AuthUserRole;
  /** Present for MERCHANT_OWNER and STAFF */
  merchantId?: string;
  restaurantId?: string;
  /** Present for STAFF — scoped to branch */
  branchId?: string;
  /** Display name */
  name?: string;
}

/** PIN session payload stored in a short-lived JWT */
export interface PinSession {
  staffId: string;
  merchantId: string;
  restaurantId: string;
  branchId: string;
  permissions: string[];
  /** Unix seconds — expiry time */
  exp: number;
}
