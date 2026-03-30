/**
 * POST /api/merchant/push/subscribe — Save a browser push subscription.
 * DELETE /api/merchant/push/subscribe — Remove a push subscription by endpoint.
 *
 * Accepts either:
 *   - Merchant owner session (restaurantId from session)
 *   - Staff PIN session (restaurantId from staffSession)
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@repo/database";
import { getSession } from "@/lib/auth/session";
import { getStaffSession } from "@/lib/auth/rbac";

interface SubscribeBody {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  branchId?: string;
}

async function getRestaurantId(): Promise<{ restaurantId: string; staffId?: string } | null> {
  const cookieStore = await cookies();

  // Try staff PIN session first
  const staffSession = await getStaffSession(cookieStore);
  if (staffSession) {
    return { restaurantId: staffSession.restaurantId, staffId: staffSession.staffId };
  }

  // Fall back to merchant owner session
  const session = await getSession();
  if (session?.user?.userType === "MERCHANT") {
    const restaurantId = (session.user as { restaurantId?: string }).restaurantId;
    if (restaurantId) return { restaurantId };
  }

  return null;
}

export async function POST(req: NextRequest) {
  const auth = await getRestaurantId();
  if (!auth) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = (await req.json()) as SubscribeBody;
  const { endpoint, keys, branchId } = body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "endpoint, keys.p256dh, and keys.auth are required" }, { status: 400 });
  }

  const userAgent = req.headers.get("user-agent") ?? null;

  await prisma.staffPushSubscription.upsert({
    where: { endpoint },
    update: {
      p256dh: keys.p256dh,
      auth: keys.auth,
      branchId: branchId ?? null,
      staffId: auth.staffId ?? null,
      userAgent,
    },
    create: {
      restaurantId: auth.restaurantId,
      staffId: auth.staffId ?? null,
      branchId: branchId ?? null,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await getRestaurantId();
  if (!auth) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = (await req.json()) as { endpoint: string };
  const { endpoint } = body;

  if (!endpoint) {
    return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
  }

  await prisma.staffPushSubscription
    .delete({ where: { endpoint, restaurantId: auth.restaurantId } })
    .catch(() => {
      // Not found — already deleted; ignore
    });

  return NextResponse.json({ ok: true });
}
