/**
 * PATCH /api/fbqrsys/merchants/[merchantId]/subscription
 * Actions: change plan, extend trial, toggle auto-renew
 *
 * Requires: billing:manage
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireSystemAdmin } from "@/lib/auth/session";
import {
  getSystemAdminPermissions,
  hasPermission,
  forbiddenResponse,
} from "@/lib/auth/rbac";
import { z } from "zod";
import { addDays } from "date-fns";

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("change_plan"),
    planId: z.string().uuid(),
    cycle: z.enum(["MONTHLY", "ANNUAL"]),
  }),
  z.object({
    action: z.literal("extend_trial"),
    days: z.number().int().min(1).max(365),
  }),
  z.object({
    action: z.literal("toggle_auto_renew"),
    autoRenew: z.boolean(),
  }),
  z.object({
    action: z.literal("set_grace_period"),
    gracePeriodDays: z.number().int().min(0).max(90),
  }),
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> }
) {
  const session = await requireSystemAdmin();
  const permissions = await getSystemAdminPermissions(session.user.id);
  if (!hasPermission(permissions, "billing:manage")) {
    return NextResponse.json(forbiddenResponse("billing:manage"), {
      status: 403,
    });
  }

  const { merchantId } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: { subscription: true },
  });

  if (!merchant) {
    return NextResponse.json({ error: "MERCHANT_NOT_FOUND" }, { status: 404 });
  }

  const data = parsed.data;

  if (data.action === "change_plan") {
    if (!merchant.subscription) {
      // Create subscription if none exists
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: data.planId },
      });
      if (!plan) {
        return NextResponse.json({ error: "PLAN_NOT_FOUND" }, { status: 404 });
      }
      const now = new Date();
      const periodEnd =
        data.cycle === "ANNUAL"
          ? addDays(now, 365)
          : addDays(now, 30);
      const subscription = await prisma.merchantSubscription.create({
        data: {
          merchantId,
          planId: data.planId,
          cycle: data.cycle,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });
      // Activate merchant if still TRIAL
      if (merchant.status === "TRIAL") {
        await prisma.merchant.update({
          where: { id: merchantId },
          data: { status: "ACTIVE" },
        });
      }
      return NextResponse.json({ subscription });
    }

    const subscription = await prisma.merchantSubscription.update({
      where: { merchantId },
      data: { planId: data.planId, cycle: data.cycle },
    });
    return NextResponse.json({ subscription });
  }

  if (data.action === "extend_trial") {
    const currentTrialEnd = merchant.trialEndsAt ?? new Date();
    const newTrialEnd = addDays(currentTrialEnd, data.days);
    await prisma.merchant.update({
      where: { id: merchantId },
      data: { trialEndsAt: newTrialEnd, status: "TRIAL" },
    });
    return NextResponse.json({ trialEndsAt: newTrialEnd });
  }

  if (data.action === "toggle_auto_renew") {
    if (!merchant.subscription) {
      return NextResponse.json(
        { error: "NO_SUBSCRIPTION" },
        { status: 400 }
      );
    }
    const subscription = await prisma.merchantSubscription.update({
      where: { merchantId },
      data: { autoRenew: data.autoRenew },
    });
    return NextResponse.json({ subscription });
  }

  if (data.action === "set_grace_period") {
    if (!merchant.subscription) {
      return NextResponse.json(
        { error: "NO_SUBSCRIPTION" },
        { status: 400 }
      );
    }
    const subscription = await prisma.merchantSubscription.update({
      where: { merchantId },
      data: { gracePeriodDays: data.gracePeriodDays },
    });
    return NextResponse.json({ subscription });
  }

  return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
}
