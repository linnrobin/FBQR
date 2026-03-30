/**
 * GET /api/cron/pii-deletion
 * PII deletion cron — runs daily at 02:00 WIB (19:00 UTC).
 * Schedule: vercel.json { "path": "/api/cron/pii-deletion", "schedule": "0 19 * * *" }
 *
 * UU PDP compliance: anonymizes Customer PII for accounts where deletionRequestedAt
 * was set more than 30 days ago and status != 'DELETED'.
 *
 * STEP 1 — Find customers past the 30-day SLA window
 * STEP 2 — For each customer: send confirmation email, then anonymize PII in-place
 * STEP 3 — Log run to CronRunLog
 *
 * Spec: docs/platform-owner.md § PII Deletion Cron Specification
 * Legal basis: UU No. 27/2022 (UU PDP) Article 35 — 30-day erasure SLA
 *
 * IMPORTANT: Email is sent BEFORE anonymizing so we still have the original address.
 * If email send fails, deletion still proceeds (logged to errorMessage in CronRunLog).
 * Order rows are RETAINED (7-year Indonesian commercial law retention).
 */
import { validateCronSecret, unauthorizedCronResponse } from "@/lib/cron";
import { prisma } from "@repo/database";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM ?? "noreply@fbqr.app";

async function sendDeletionConfirmation(to: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[pii-deletion-cron] sendEmail stub (no RESEND_API_KEY) to=${to}`);
    return;
  }
  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: "Konfirmasi penghapusan data akun FBQR",
      html: `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#1c1917;line-height:1.6;max-width:600px;margin:0 auto;padding:24px">
<h2>Data akun Anda telah dihapus</h2>
<p>Sesuai dengan permintaan penghapusan data yang Anda ajukan dan ketentuan UU No. 27/2022 (UU PDP),
informasi pribadi Anda (nama, email, nomor telepon) telah dianonimkan dari sistem FBQR.</p>
<p>Data transaksi (pesanan dan pembayaran) dipertahankan selama 7 tahun sesuai kewajiban hukum
komersial Indonesia, namun tidak lagi dapat dikaitkan dengan identitas Anda.</p>
<p>Jika Anda memiliki pertanyaan, hubungi: <a href="mailto:support@fbqr.app">support@fbqr.app</a></p>
<hr style="margin-top:32px;border:none;border-top:1px solid #e7e5e4">
<p style="color:#a8a29e;font-size:12px">FBQR Platform &mdash; support@fbqr.app</p>
</body></html>`,
    });
  } catch (err) {
    console.error("[pii-deletion-cron] sendEmail failed:", err);
  }
}

export async function GET(req: Request) {
  if (!validateCronSecret(req)) return unauthorizedCronResponse();

  const startedAt = new Date();
  let affectedRows = 0;
  const errors: string[] = [];

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ── STEP 1: Find customers past the 30-day SLA ────────────────────────────
    const pendingDeletions = await prisma.customer.findMany({
      where: {
        deletionRequestedAt: { not: null, lte: thirtyDaysAgo },
        status: { not: "DELETED" },
      },
      select: {
        id: true,
        email: true,
        deletionRequestedAt: true,
      },
    });

    // ── STEP 2: Anonymize each customer ───────────────────────────────────────
    for (const customer of pendingDeletions) {
      try {
        // Send confirmation email BEFORE anonymizing (while we still have the address)
        if (customer.email) {
          await sendDeletionConfirmation(customer.email);
        }

        // Anonymize PII in-place — do NOT delete the row (Order FK integrity)
        await prisma.$transaction([
          prisma.customer.update({
            where: { id: customer.id },
            data: {
              email: `deleted-${customer.id}@deleted.fbqr.app`,
              name: "Deleted User",
              phone: null,
              hashedPassword: null,
              status: "DELETED",
              deletedAt: now,
            },
          }),
          // Detach sessions — they become anonymous
          prisma.customerSession.updateMany({
            where: { customerId: customer.id },
            data: { customerId: null },
          }),
          // Zero out loyalty balances (points are personal data tied to identity)
          prisma.merchantLoyaltyBalance.updateMany({
            where: { customerId: customer.id },
            data: { balance: 0, totalEarned: 0 },
          }),
          prisma.auditLog.create({
            data: {
              action: "DELETE",
              entity: "Customer",
              entityId: customer.id,
              actorType: "SYSTEM",
              actorName: "System",
              newValue: {
                reason: "PII_DELETION_REQUEST",
                requestedAt: customer.deletionRequestedAt?.toISOString(),
                deletedAt: now.toISOString(),
              },
            },
          }),
        ]);

        affectedRows++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[pii-deletion-cron] failed for customer ${customer.id}:`, msg);
        errors.push(`customer:${customer.id}: ${msg}`);
      }
    }

    // ── STEP 3: Log run ───────────────────────────────────────────────────────
    await prisma.cronRunLog.create({
      data: {
        jobName: "pii-deletion",
        startedAt,
        completedAt: new Date(),
        status: errors.length > 0 ? "PARTIAL" : "SUCCESS",
        affectedRows,
        errorMessage: errors.length > 0 ? errors.join("; ") : null,
      },
    });

    return Response.json({ ok: true, affectedRows, errors: errors.length });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[pii-deletion-cron] error:", errorMessage);

    await prisma.cronRunLog
      .create({
        data: {
          jobName: "pii-deletion",
          startedAt,
          completedAt: new Date(),
          status: "FAILED",
          affectedRows,
          errorMessage,
        },
      })
      .catch(() => {});

    return Response.json(
      { error: "CRON_FAILED", message: errorMessage },
      { status: 500 }
    );
  }
}
