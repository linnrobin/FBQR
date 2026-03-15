/**
 * NextAuth v5 (Auth.js) configuration — Step 3
 *
 * Two Credentials providers:
 *   "fbqrsys"  — email + password for SystemAdmin (FBQRSYS platform admins)
 *   "merchant" — email + password for Merchant (restaurant owner accounts)
 *
 * Session strategy: JWT (stateless, no DB session table required).
 * Staff PIN auth uses a separate cookie-based flow — see lib/auth/staff-jwt.ts.
 *
 * See docs/architecture.md § Authentication Model and ADR-005.
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@repo/database";
import bcrypt from "bcryptjs";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    /**
     * FBQRSYS admin authentication.
     * Blocks login if mustChangePassword was somehow bypassed (should not happen via normal flow).
     */
    Credentials({
      id: "fbqrsys",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const admin = await prisma.systemAdmin.findUnique({
          where: { email: parsed.data.email },
        });
        if (!admin) return null;

        const ok = await bcrypt.compare(
          parsed.data.password,
          admin.passwordHash
        );
        if (!ok) return null;

        return {
          id: admin.id,
          email: admin.email,
          userType: "SYSTEM_ADMIN" as const,
          mustChangePassword: admin.mustChangePassword,
        };
      },
    }),

    /**
     * Merchant (restaurant owner) authentication.
     * Rejects SUSPENDED and CANCELLED accounts.
     */
    Credentials({
      id: "merchant",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const merchant = await prisma.merchant.findUnique({
          where: { email: parsed.data.email },
          include: { restaurant: { select: { id: true } } },
        });
        if (!merchant) return null;

        if (
          merchant.status === "SUSPENDED" ||
          merchant.status === "CANCELLED"
        ) {
          return null;
        }

        const ok = await bcrypt.compare(
          parsed.data.password,
          merchant.passwordHash
        );
        if (!ok) return null;

        return {
          id: merchant.id,
          email: merchant.email,
          userType: "MERCHANT" as const,
          merchantStatus: merchant.status,
          restaurantId: merchant.restaurant?.id ?? null,
        };
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        // Persist extra fields into the JWT on first sign-in
        const u = user as {
          userType: "SYSTEM_ADMIN" | "MERCHANT";
          mustChangePassword?: boolean;
          merchantStatus?: string;
          restaurantId?: string | null;
        };
        token.userType = u.userType;
        if (u.userType === "SYSTEM_ADMIN") {
          token.mustChangePassword = u.mustChangePassword ?? false;
        }
        if (u.userType === "MERCHANT") {
          token.merchantStatus = u.merchantStatus;
          token.restaurantId = u.restaurantId ?? null;
        }
      }
      return token;
    },

    session({ session, token }) {
      if (token.userType === "SYSTEM_ADMIN") {
        session.user.userType = "SYSTEM_ADMIN";
        session.user.mustChangePassword =
          (token.mustChangePassword as boolean) ?? false;
      }
      if (token.userType === "MERCHANT") {
        session.user.userType = "MERCHANT";
        session.user.merchantStatus = token.merchantStatus as string;
        session.user.restaurantId =
          (token.restaurantId as string | null) ?? null;
      }
      return session;
    },
  },

  pages: {
    // nextauth redirects to this URL when a session is required.
    // Middleware overrides this per route-group (fbqrsys vs merchant).
    signIn: "/fbqrsys/login",
    error: "/fbqrsys/login",
  },
});
