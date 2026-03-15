/**
 * NextAuth v5 type augmentation.
 * Extends the default Session and JWT types with FBQR-specific fields.
 */
import type { DefaultSession, DefaultJWT } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      userType: "SYSTEM_ADMIN" | "MERCHANT";
      // SystemAdmin only
      mustChangePassword?: boolean;
      // Merchant only
      merchantStatus?: string;
      restaurantId?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    userType?: "SYSTEM_ADMIN" | "MERCHANT";
    mustChangePassword?: boolean;
    merchantStatus?: string;
    restaurantId?: string | null;
  }
}
