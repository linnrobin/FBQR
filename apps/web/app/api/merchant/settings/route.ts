/**
 * Merchant settings API — GET and PATCH.
 * Route: /api/merchant/settings
 *
 * GET  — Returns current MerchantSettings for the restaurant.
 * PATCH — Updates specific settings fields (orderingPaused, orderingPausedMessage, etc.)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";
import { z } from "zod";

const UpdateSettingsSchema = z.object({
  orderingPaused: z.boolean().optional(),
  orderingPausedMessage: z.string().max(200).nullable().optional(),
  paymentMode: z.enum(["PAY_FIRST", "PAY_AT_CASHIER", "BOTH"]).optional(),
  enableDirtyState: z.boolean().optional(),
  tableSessionTimeoutMinutes: z.number().int().min(15).max(1440).optional(),
  paymentTimeoutMinutes: z.number().int().min(5).max(60).optional(),
});

export async function GET(_req: NextRequest) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const settings = await prisma.merchantSettings.findUnique({
    where: { restaurantId },
  });

  return NextResponse.json({ settings: settings ?? null });
}

export async function PATCH(req: NextRequest) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = UpdateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const settings = await prisma.merchantSettings.upsert({
    where: { restaurantId },
    update: parsed.data,
    create: {
      restaurantId,
      ...parsed.data,
    },
  });

  return NextResponse.json({ settings });
}
