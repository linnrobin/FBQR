/**
 * GET /api/cron/billing
 * Billing cron — runs daily at 00:01 WIB (17:01 UTC).
 * Schedule: vercel.json { "path": "/api/cron/billing", "schedule": "1 17 * * *" }
 *
 * STEP 1 — Send 7-day renewal reminder emails
 * STEP 2 — Attempt auto-renewal for subscriptions due today (creates PENDING invoices)
 * STEP 3 — Expire trials that have passed trialEndsAt
 * STEP 4 — Send 3-day renewal reminders
 * STEP 5 — Win-back email sequence for cancelled merchants
 *
 * Spec: docs/platform-owner.md § Billing Cron Full Specification
 * Idempotency guards documented inline.
 */
import { validateCronSecret, unauthorizedCronResponse } from "@/lib/cron";
import { prisma } from "@repo/database";
import { addDays, addMonths, addYears } from "date-fns";

// ---------------------------------------------------------------------------
// Email helper (stub — real integration added when Resend is wired up)
// ---------------------------------------------------------------------------
async function sendEmail(
  to: string,
  template: string,
  data: Record<string, unknown>
) {
  // TODO: integrate Resend when email notifications step is implemented
  console.log(`[billing-cron] sendEmail to=${to} template=${template}`, data);
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
  if (!validateCronSecret(req)) return unauthorizedCronResponse();

  const startedAt = new Date();
  let affectedRows = 0;

  try {
    const platformSettings = await prisma.platformSettings.findUnique({
      where: { id: 1 },
      select: { gracePeriodDays: true },
    });
    const platformGraceDays = platformSettings?.gracePeriodDays ?? 7;
    const now = new Date();

    // -----------------------------------------------------------------------
    // STEP 1 — 7-day renewal reminders
    // Idempotency: reminderSentAt IS NULL — only sends once per billing cycle
    // -----------------------------------------------------------------------
    const sevenDaysOut = addDays(now, 7);
    const reminderCandidates = await prisma.merchantSubscription.findMany({
      where: {
        currentPeriodEnd: { gte: now, lte: sevenDaysOut },
        autoRenew: true,
        reminderSentAt: null,
        merchant: { status: "ACTIVE" },
      },
      include: {
        merchant: { select: { id: true, email: true } },
        plan: { select: { name: true } },
      },
    });

    for (const sub of reminderCandidates) {
      await sendEmail(sub.merchant.email, "renewal-reminder-7d", {
        planName: sub.plan.name,
        renewalDate: sub.currentPeriodEnd.toISOString(),
      });
      await prisma.merchantSubscription.update({
        where: { id: sub.id },
        data: { reminderSentAt: now },
      });
      affectedRows++;
    }

    // -----------------------------------------------------------------------
    // STEP 4 — 3-day renewal reminders
    // Idempotency: reminderSentAt3d IS NULL
    // -----------------------------------------------------------------------
    const threeDaysOut = addDays(now, 3);
    const reminder3dCandidates = await prisma.merchantSubscription.findMany({
      where: {
        currentPeriodEnd: { gte: now, lte: threeDaysOut },
        autoRenew: true,
        reminderSentAt3d: null,
        merchant: { status: "ACTIVE" },
      },
      include: {
        merchant: { select: { id: true, email: true } },
        plan: { select: { name: true } },
      },
    });

    for (const sub of reminder3dCandidates) {
      await sendEmail(sub.merchant.email, "renewal-reminder-3d", {
        planName: sub.plan.name,
        renewalDate: sub.currentPeriodEnd.toISOString(),
      });
      await prisma.merchantSubscription.update({
        where: { id: sub.id },
        data: { reminderSentAt3d: now },
      });
      affectedRows++;
    }

    // -----------------------------------------------------------------------
    // STEP 2 — Auto-renewal: subscriptions whose period has ended
    // Phase 1: creates PENDING invoice + advances period.
    // Phase 2: replace with Midtrans auto-charge when payment integration lands.
    // Idempotency: unique constraint (merchantId, periodStart) on invoice
    // -----------------------------------------------------------------------
    const renewalCandidates = await prisma.merchantSubscription.findMany({
      where: {
        currentPeriodEnd: { lte: now },
        autoRenew: true,
        merchant: { status: "ACTIVE" },
      },
      include: {
        merchant: { select: { id: true, email: true } },
        plan: {
          select: {
            id: true,
            name: true,
            priceMonthly: true,
            priceAnnual: true,
          },
        },
      },
    });

    for (const sub of renewalCandidates) {
      const amount =
        sub.cycle === "ANNUAL"
          ? sub.plan.priceAnnual
          : sub.plan.priceMonthly;
      const tax = Math.round(amount * 0.11); // PPN 11%
      const total = amount + tax;
      const periodStart = sub.currentPeriodEnd;
      const periodEnd =
        sub.cycle === "ANNUAL"
          ? addYears(periodStart, 1)
          : addMonths(periodStart, 1);
      const dueAt = addDays(now, 7);

      // Invoice number: FBQR-{YYYYMM}-{first8charsOfMerchantId}
      const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
      const invoiceNumber = `FBQR-${yyyymm}-${sub.merchantId.slice(0, 8).toUpperCase()}`;

      try {
        await prisma.$transaction(async (tx) => {
          // Unique constraint on (merchantId, periodStart) guards against double-fire
          await tx.merchantBillingInvoice.create({
            data: {
              merchantId: sub.merchantId,
              subscriptionId: sub.id,
              invoiceNumber,
              periodStart,
              periodEnd,
              amount,
              tax,
              total,
              status: "PENDING",
              dueAt,
              currency: "IDR",
            },
          });

          // Advance period + reset reminder flags for next cycle
          await tx.merchantSubscription.update({
            where: { id: sub.id },
            data: {
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              lastRenewalAt: now,
              failedAttempts: 0,
              reminderSentAt: null,
              reminderSentAt3d: null,
            },
          });

          await tx.auditLog.create({
            data: {
              action: "CREATE",
              entity: "MerchantBillingInvoice",
              entityId: invoiceNumber,
              actorType: "SYSTEM",
              actorName: "System",
              newValue: {
                merchantId: sub.merchantId,
                amount,
                periodStart: periodStart.toISOString(),
                periodEnd: periodEnd.toISOString(),
              },
            },
          });
        });

        await sendEmail(sub.merchant.email, "invoice-issued", {
          invoiceNumber,
          planName: sub.plan.name,
          total,
          dueAt: dueAt.toISOString(),
        });

        affectedRows++;
      } catch (err: unknown) {
        // Duplicate invoice — already processed (idempotency guard)
        if (
          err instanceof Error &&
          (err.message.includes("Unique constraint") ||
            err.message.includes("unique"))
        ) {
          continue;
        }

        // Unexpected failure — treat as failed renewal attempt
        const newFailed = (sub.failedAttempts ?? 0) + 1;
        await prisma.merchantSubscription.update({
          where: { id: sub.id },
          data: { failedAttempts: newFailed },
        });

        await sendEmail(sub.merchant.email, "payment-failed", {
          planName: sub.plan.name,
          failedAttempts: newFailed,
        });

        // Suspend when failed attempts reach grace threshold
        const effectiveGrace = sub.gracePeriodDays ?? platformGraceDays;
        if (newFailed >= effectiveGrace) {
          await prisma.$transaction(async (tx) => {
            await tx.merchant.update({
              where: { id: sub.merchantId },
              data: {
                status: "SUSPENDED",
                suspendedAt: now,
                suspendedReason: "AUTO_BILLING_FAILURE",
              },
            });
            await tx.auditLog.create({
              data: {
                action: "SUSPEND",
                entity: "Merchant",
                entityId: sub.merchantId,
                actorType: "SYSTEM",
                actorName: "System",
                newValue: {
                  reason: "AUTO_BILLING_FAILURE",
                  failedAttempts: newFailed,
                },
              },
            });
          });
          await sendEmail(sub.merchant.email, "account-suspended-billing", {
            failedAttempts: newFailed,
          });
        }

        affectedRows++;
      }
    }

    // -----------------------------------------------------------------------
    // STEP 3 — Expire trials past trialEndsAt
    // Idempotency: WHERE status = 'TRIAL' is inherently idempotent
    // -----------------------------------------------------------------------
    const expiredTrials = await prisma.merchant.findMany({
      where: {
        status: "TRIAL",
        trialEndsAt: { lt: now },
      },
      select: { id: true, email: true },
    });

    for (const merchant of expiredTrials) {
      await prisma.$transaction(async (tx) => {
        await tx.merchant.update({
          where: { id: merchant.id },
          data: {
            status: "SUSPENDED",
            suspendedAt: now,
            suspendedReason: "TRIAL_EXPIRED",
          },
        });
        await tx.auditLog.create({
          data: {
            action: "SUSPEND",
            entity: "Merchant",
            entityId: merchant.id,
            actorType: "SYSTEM",
            actorName: "System",
            newValue: { reason: "TRIAL_EXPIRED" },
          },
        });
      });
      await sendEmail(merchant.email, "trial-expired", {});
      affectedRows++;
    }

    // -----------------------------------------------------------------------
    // STEP 5 — Win-back email sequence for CANCELLED merchants
    // Spec: docs/platform-owner.md § Win-back Email Sequence
    // Day 30 email is mandatory regardless of winBackOptOut (UU PDP legal notice)
    // -----------------------------------------------------------------------
    const cancelledMerchants = await prisma.merchant.findMany({
      where: {
        status: "CANCELLED",
        cancellationReason: { not: null },
        winBackEmailsSentCount: { lt: 4 },
      },
      include: {
        subscription: { select: { cancelledAt: true } },
      },
    });

    for (const merchant of cancelledMerchants) {
      const cancelledAt =
        merchant.subscription?.cancelledAt ?? merchant.updatedAt;
      const daysSince = Math.floor(
        (now.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      const sent = merchant.winBackEmailsSentCount;

      // Day 1 — all cancelled merchants
      if (sent === 0 && daysSince >= 1) {
        await sendEmail(merchant.email, "winback-day1", {
          cancellationReason: merchant.cancellationReason,
        });
        await prisma.merchant.update({
          where: { id: merchant.id },
          data: { winBackEmailsSentCount: 1 },
        });
        affectedRows++;
        continue;
      }

      // Day 7 — skip RESTAURANT_CLOSED and opted-out merchants
      if (
        sent === 1 &&
        daysSince >= 7 &&
        merchant.cancellationReason !== "RESTAURANT_CLOSED" &&
        !merchant.winBackOptOut
      ) {
        await sendEmail(merchant.email, "winback-day7", {
          cancellationReason: merchant.cancellationReason,
        });
        await prisma.merchant.update({
          where: { id: merchant.id },
          data: { winBackEmailsSentCount: 2 },
        });
        affectedRows++;
        continue;
      }

      // Day 14 — skip RESTAURANT_CLOSED and opted-out
      if (
        sent === 2 &&
        daysSince >= 14 &&
        merchant.cancellationReason !== "RESTAURANT_CLOSED" &&
        !merchant.winBackOptOut
      ) {
        await sendEmail(merchant.email, "winback-day14", {});
        await prisma.merchant.update({
          where: { id: merchant.id },
          data: { winBackEmailsSentCount: 3 },
        });
        affectedRows++;
        continue;
      }

      // Day 30 — mandatory data deletion notice (UU PDP, cannot be suppressed)
      if (sent === 3 && daysSince >= 30) {
        await sendEmail(merchant.email, "winback-day30-data-deletion", {});
        await prisma.merchant.update({
          where: { id: merchant.id },
          data: { winBackEmailsSentCount: 4 },
        });
        affectedRows++;
        continue;
      }
    }

    // -----------------------------------------------------------------------
    // Log run
    // -----------------------------------------------------------------------
    await prisma.cronRunLog.create({
      data: {
        jobName: "billing",
        startedAt,
        completedAt: new Date(),
        status: "SUCCESS",
        affectedRows,
      },
    });

    return Response.json({ ok: true, affectedRows });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[billing-cron] error:", errorMessage);

    await prisma.cronRunLog.create({
      data: {
        jobName: "billing",
        startedAt,
        completedAt: new Date(),
        status: "FAILED",
        affectedRows,
        errorMessage,
      },
    });

    return Response.json(
      { error: "CRON_FAILED", message: errorMessage },
      { status: 500 }
    );
  }
}
