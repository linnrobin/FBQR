/**
 * Session creation/resume route handler.
 * Route: GET /api/menu/session
 *
 * Called by the table menu page when no valid fbqr_session_id cookie is found.
 * Re-validates the HMAC signature, creates or resumes a CustomerSession,
 * sets the httpOnly session cookie, and redirects back to the menu page.
 *
 * Query params: restaurantId, tableId, tableToken, sig, exp
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@repo/database";
import { verifyQrSig, isQrExpired, buildSignedMenuUrl } from "@/lib/qr-auth";
import crypto from "crypto";

const SESSION_COOKIE = "fbqr_session_id";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const restaurantId = searchParams.get("restaurantId");
  const tableId = searchParams.get("tableId");
  const tableToken = searchParams.get("tableToken");
  const sig = searchParams.get("sig");
  const expStr = searchParams.get("exp");

  if (!restaurantId || !tableId || !tableToken || !sig || !expStr) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const exp = parseInt(expStr, 10);
  if (isNaN(exp) || isQrExpired(exp) || !verifyQrSig(tableToken, exp, sig)) {
    // Expired or invalid — redirect to the static redirect handler for a fresh URL
    const base = process.env.NEXT_PUBLIC_MENU_APP_URL ?? "http://localhost:3001";
    return NextResponse.redirect(new URL(`/r/${tableToken}`, base), { status: 302 });
  }

  // Load table + verify path params match DB record (ADR-015 security assertion)
  const table = await prisma.table.findUnique({
    where: { qrToken: tableToken },
    select: {
      id: true,
      branchId: true,
      branch: { select: { restaurantId: true } },
    },
  });

  if (
    !table ||
    table.id !== tableId ||
    table.branch.restaurantId !== restaurantId
  ) {
    return NextResponse.json({ error: "Invalid QR" }, { status: 400 });
  }

  // Get session timeout from settings
  const settings = await prisma.merchantSettings.findUnique({
    where: { restaurantId },
    select: { tableSessionTimeoutMinutes: true },
  });
  const timeoutMinutes = settings?.tableSessionTimeoutMinutes ?? 120;

  // Try to resume an existing ACTIVE session for this table
  const cookieStore = await cookies();
  const existingCookieValue = cookieStore.get(SESSION_COOKIE)?.value;

  let sessionCookieValue: string;

  if (existingCookieValue) {
    const existing = await prisma.customerSession.findFirst({
      where: {
        sessionCookie: existingCookieValue,
        tableId,
        status: "ACTIVE",
      },
      select: { id: true, sessionCookie: true, expiresAt: true },
    });

    if (existing && existing.expiresAt > new Date()) {
      // Resume — reuse existing cookie value
      sessionCookieValue = existing.sessionCookie;
    } else {
      // Expired or not found — create new
      sessionCookieValue = await createSession(
        restaurantId,
        tableId,
        table.branchId,
        timeoutMinutes,
        req
      );
    }
  } else {
    sessionCookieValue = await createSession(
      restaurantId,
      tableId,
      table.branchId,
      timeoutMinutes,
      req
    );
  }

  // Set session cookie + redirect to menu
  const menuUrl = buildSignedMenuUrl(restaurantId, tableId, tableToken);
  const res = NextResponse.redirect(menuUrl, { status: 302 });
  res.cookies.set(SESSION_COOKIE, sessionCookieValue, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: timeoutMinutes * 60,
  });

  return res;
}

async function createSession(
  restaurantId: string,
  tableId: string,
  branchId: string,
  timeoutMinutes: number,
  req: NextRequest
): Promise<string> {
  const sessionCookie = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);
  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = req.headers.get("user-agent") ?? "unknown";

  await prisma.customerSession.create({
    data: {
      restaurantId,
      branchId,
      tableId,
      sessionCookie,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  return sessionCookie;
}
