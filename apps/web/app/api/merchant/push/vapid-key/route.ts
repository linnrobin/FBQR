/**
 * GET /api/merchant/push/vapid-key — Returns the VAPID public key for browser push subscription.
 *
 * No authentication required — the public key is safe to expose.
 */
import { NextResponse } from "next/server";

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json({ error: "Push notifications not configured" }, { status: 503 });
  }
  return NextResponse.json({ publicKey });
}
