/**
 * Next.js middleware — route protection for FBQR apps/web
 *
 * Route groups and their auth requirements:
 *   /fbqrsys/*  — Requires NextAuth session with userType = "SYSTEM_ADMIN"
 *                 mustChangePassword = true → redirect to /fbqrsys/change-password
 *   /merchant/* — Requires NextAuth session with userType = "MERCHANT"
 *   /kitchen/*  — Requires valid fbqr_staff_session cookie (staff PIN session)
 *
 * Public routes (no auth required):
 *   /fbqrsys/login, /merchant/login, /kitchen/login
 *   /api/auth/* (NextAuth endpoints)
 *   /api/cron/* (protected by CRON_SECRET header, not session)
 *   /api/health
 */
import { auth } from "@/auth";
import { verifyStaffJwt } from "@/lib/auth/staff-jwt";
import { NextResponse, type NextRequest } from "next/server";

export default auth(async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── FBQRSYS routes ──────────────────────────────────────────────────────────
  if (pathname.startsWith("/fbqrsys")) {
    // Public FBQRSYS pages
    if (
      pathname === "/fbqrsys/login" ||
      pathname.startsWith("/fbqrsys/login/")
    ) {
      return NextResponse.next();
    }

    // @ts-expect-error — req.auth is added by the auth() wrapper
    const session = req.auth;
    if (!session || session.user?.userType !== "SYSTEM_ADMIN") {
      const loginUrl = new URL("/fbqrsys/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Force password change — allow only /fbqrsys/change-password
    if (
      session.user.mustChangePassword &&
      pathname !== "/fbqrsys/change-password"
    ) {
      return NextResponse.redirect(
        new URL("/fbqrsys/change-password", req.url)
      );
    }

    return NextResponse.next();
  }

  // ── Merchant routes ─────────────────────────────────────────────────────────
  if (pathname.startsWith("/merchant")) {
    if (
      pathname === "/merchant/login" ||
      pathname.startsWith("/merchant/login/")
    ) {
      return NextResponse.next();
    }

    // @ts-expect-error — req.auth is added by the auth() wrapper
    const session = req.auth;
    if (!session || session.user?.userType !== "MERCHANT") {
      const loginUrl = new URL("/merchant/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // ── Kitchen routes (staff PIN sessions) ────────────────────────────────────
  if (pathname.startsWith("/kitchen")) {
    if (
      pathname === "/kitchen/login" ||
      pathname.startsWith("/kitchen/login/")
    ) {
      return NextResponse.next();
    }

    const staffCookie = req.cookies.get("fbqr_staff_session");
    if (!staffCookie) {
      return NextResponse.redirect(new URL("/kitchen/login", req.url));
    }

    const staffSession = await verifyStaffJwt(staffCookie.value);
    if (!staffSession) {
      // Cookie present but expired or tampered — clear it and redirect
      const loginUrl = new URL("/kitchen/login", req.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete("fbqr_staff_session");
      return response;
    }

    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  // Match all routes except Next.js internals and static assets
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
