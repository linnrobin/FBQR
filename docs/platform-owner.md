# FBQR — Platform Owner (FBQRSYS) Reference

> **For AI agents:** Read this file when building Steps 5–6 (FBQRSYS merchant management UI, subscription & billing) or Step 24 (audit log). Also covers platform-level business decisions that affect architecture. Cross-reference `docs/architecture.md` for ADRs and `docs/data-models.md` for schema details.

---

## FBQRSYS — What It Is

FBQRSYS is the platform super-admin system. It is used by Robin (the FBQR platform owner) and any FBQRSYS staff he creates. It is **never white-labeled** and always shows FBQR's own identity — merchants log in to their own `merchant-pos`, not FBQRSYS.

FBQRSYS responsibilities:
- Create and manage merchant accounts
- Set subscription plans and billing
- Suspend/unsuspend merchants for non-payment or policy violations
- Enable multi-branch access for qualifying merchants (EOI process)
- View platform-wide analytics and revenue
- Manage FBQRSYS staff accounts and their permissions

---

## FBQRSYS Permissions & Roles

### System-Defined Permissions

| Permission | Description |
|---|---|
| `merchants:create` | Create new merchant accounts |
| `merchants:read` | View merchant list and details |
| `merchants:update` | Edit merchant details and settings |
| `merchants:delete` | Deactivate or delete merchant accounts |
| `merchants:suspend` | Manually lock or unlock a merchant account |
| `reports:read` | View platform-level reports |
| `settings:manage` | Modify platform-level settings |
| `admins:manage` | Create/manage other FBQRSYS staff accounts |
| `billing:manage` | Manage subscription plans, view/edit merchant billing, send invoices |

### Role Templates (suggestions only — owner can rename/modify)

| Suggested Name | Default Permissions |
|---|---|
| Platform Owner | All |
| Merchant Manager | `merchants:create`, `merchants:read`, `merchants:update` |
| Billing Admin | `billing:manage`, `merchants:read`, `merchants:suspend` |
| Analyst | `reports:read`, `merchants:read` |
| Support Staff | `merchants:read` |

Templates are hardcoded JSON in `packages/config/roleTemplates.ts` — not database records. See `docs/architecture.md` ADR-005.

### Creating FBQRSYS Staff

Only the seeded Platform Owner (`SystemAdmin` with all permissions) can create additional `SystemAdmin` records. A staff management UI must be built in Step 5. The flow:

1. Platform Owner goes to **FBQRSYS → Settings → Staff**
2. Enters name + email → system sends a "set your password" link (Resend, password-reset flow with first-time flag)
3. Owner selects a Role (from existing `SystemRole` records or creates a new one)
4. New staff account is created with `SystemRoleAssignment` linking them to that role

> **FBQRSYS staff operations the UI must support:**
> - Add notes to a merchant account ("called Pak Budi, away until March 15") — add `notes: string?` to the `Merchant` model in Phase 1 Prisma
> - Bulk suspend overdue merchants (checkbox multi-select + bulk action)
> - Saved filters (e.g. "Pro merchants renewing in 14 days with prior payment failure")
> - Export merchant list to CSV (for sales outreach and accounting)
> - Assign merchant follow-ups to a staff member (add `assignedToAdminId: string?` FK → SystemAdmin to Merchant model)

---

## Merchant Subscription & Billing

> **Distinct from customer invoices.** `MerchantBillingInvoice` is FBQR billing the merchant for their subscription. `Invoice` is the merchant billing their customer for a meal. These are completely separate models, flows, and PDF templates.

### Subscription Plans

Plans are configurable from FBQRSYS (not hardcoded in schema — stored in `SubscriptionPlan`). Example structure:

| Tier | Typical Limits | Billing |
|---|---|---|
| Trial | Limited tables, basic features, no branding | Free, time-limited (e.g. 14 days) |
| Starter | 1 branch, up to 10 tables, no AI, no loyalty | Monthly or yearly |
| Pro | Multiple branches, unlimited tables, full AI, full branding, loyalty | Monthly or yearly |
| Enterprise | Custom limits, dedicated support, custom contract | Custom |

> Exact tier names, prices, and feature limits are set by the FBQRSYS owner in the admin panel. Do not hardcode plan details.

### Revenue Model Decision

**FBQR is purely subscription-based.** There is no transaction fee on top of Midtrans. This is an intentional decision:

- Merchants pay Midtrans directly (0.7% QRIS). FBQR does not take a cut of each transaction.
- FBQR charges merchants a flat monthly/annual subscription fee for access to the platform.
- This model is transparent to merchants ("I pay Rp X/month, no surprises per order") and simpler to implement (no need to act as a payment intermediary, no BI payment license required).

**Why not transaction fee (marketplace model):**
- Requires FBQR to act as a payment intermediary → Bank Indonesia PJSP licensing required → regulatory overhead unsuitable for a bootstrapped product
- Creates merchant suspicion ("the more I earn, the more FBQR takes")
- Complex to implement: settlement splits, reconciliation, float management

**Revenue growth path:** As the merchant base grows, consider a Pro+ tier with transaction-fee pricing for high-volume chains who prefer variable costs over fixed subscription. This is a Phase 3 product decision, not a Phase 1 implementation concern.

### Merchant Onboarding Flow (Platform Side)

```
FBQRSYS admin creates Merchant account (email + temp password)
    │  OR
    Merchant self-registers at /register (see Self-Service section in docs/merchant.md)
    │
    ▼
Merchant receives email → sets own password → logs in (status: TRIAL)
    │
    ▼
Merchant sees trial banner + feature restrictions
    │
    ▼
Merchant chooses a plan → pays → status → ACTIVE
    │
    OR FBQRSYS admin manually assigns a plan (for enterprise / negotiated deals)
```

### Billing Cycle & Invoice Flow

```
Subscription period starts
    │
    ▼
7 days before renewal → email to merchant: "Your subscription renews on {date}"
    │
    ▼
3 days before → reminder email
    │
    ▼
Renewal date → payment attempted (auto-charge via saved method, or manual invoice)
    │
    ├── Payment SUCCESS → generate MerchantBillingInvoice (PDF) → email to merchant → status: ACTIVE
    │
    └── Payment FAILED → grace period (configurable, e.g. 3 days)
            │
            ▼
        Grace period email: "Payment failed. Please update your payment method."
            │
            ├── Merchant pays → ACTIVE
            │
            └── Grace period expired → status: SUSPENDED (auto-lock, logged in AuditLog)
```

### Vercel Cron — Tier Requirements

**Vercel Hobby (free):** Maximum 1 cron invocation per day. Suitable only for the daily billing cron.

**Vercel Pro ($20/mo) — required from Step 15 onward** for sub-daily cron intervals:

| Cron Job | Frequency | Vercel Tier Required |
|---|---|---|
| Daily billing (billing reminders, renewal, trial expiry) | Daily `00:01 WIB` | Hobby (free) |
| Order expiry (PENDING → EXPIRED after timeout) | Every 1 min (Pro) / 5 min (Hobby) | **Pro recommended** |
| `autoResetAvailability` (reset items to available at midnight) | Daily `00:05 WIB` | Hobby (free) |
| QueueCounter pruning (delete rows older than 30 days) | Daily `00:02 WIB` | Hobby (free) |
| Session cleanup (expire stale CustomerSessions + fix ghost-occupied tables) | Daily `01:00 WIB` | Hobby (free) |
| EOD PENDING_CASH cleanup (safety-net batch cancel) | Nightly `eodCashCleanupHour WIB` (default 03:00) | Hobby (free) |

> **Action:** Upgrade to Vercel Pro before implementing Step 15 (payment integration). Budget ~$20/mo.
> The order-expiry cron is not optional — without it, PENDING orders from abandoned payment sessions accumulate indefinitely, block table sessions, and inflate stock hold counts.

**All cron routes must validate the `CRON_SECRET` header before executing:**
```ts
// apps/web/app/api/cron/[job]/route.ts
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  // ... cron logic
}
```

**`vercel.json` cron configuration:**
```json
{
  "crons": [
    { "path": "/api/cron/billing",              "schedule": "1 17 * * *"  },
    { "path": "/api/cron/order-expiry",         "schedule": "*/1 * * * *" },
    { "path": "/api/cron/availability-reset",   "schedule": "5 17 * * *"  },
    { "path": "/api/cron/queue-counter-prune",  "schedule": "2 17 * * *"  },
    { "path": "/api/cron/session-cleanup",      "schedule": "0 18 * * *"  },
    { "path": "/api/cron/eod-cash-cleanup",     "schedule": "0 20 * * *"  }
  ]
}
```
> Vercel Cron runs in UTC. `00:01 WIB` = `17:01 UTC` (WIB = UTC+7).

---

### Billing Cron Full Specification

The billing cron runs daily via Vercel Cron. This is the most revenue-critical scheduled job.

```
Every day at 00:01 Asia/Jakarta:

STEP 1 — Send renewal reminder emails
  SELECT ms.*, m.email, m.id
  FROM MerchantSubscription ms
  JOIN Merchant m ON m.id = ms.merchantId
  WHERE ms.currentPeriodEnd BETWEEN NOW() AND NOW() + INTERVAL '7 days'
    AND ms.autoRenew = true
    AND m.status = 'ACTIVE'
    AND ms.reminderSentAt IS NULL  -- deduplicate: only send once

  FOR EACH result:
    Send email via Resend: "Your subscription renews on {date}"
    UPDATE MerchantSubscription SET reminderSentAt = NOW() WHERE id = ms.id

STEP 2 — Attempt auto-renewal for subscriptions due today
  SELECT ms.*, m.id, m.email
  FROM MerchantSubscription ms
  JOIN Merchant m ON m.id = ms.merchantId
  WHERE ms.currentPeriodEnd <= NOW()
    AND ms.autoRenew = true
    AND m.status = 'ACTIVE'

  FOR EACH result:
    Attempt charge via Midtrans (or bank transfer instruction):
    ├── SUCCESS:
    │     BEGIN TRANSACTION
    │       UPDATE MerchantSubscription SET
    │         currentPeriodEnd = currentPeriodEnd + interval(billingCycle),
    │         lastRenewalAt = NOW(),
    │         failedAttempts = 0,
    │         reminderSentAt = NULL,       -- ← REQUIRED: reset so next cycle's reminders fire
    │         reminderSentAt3d = NULL      -- ← REQUIRED: reset so 3-day reminder fires next cycle
    │       INSERT MerchantBillingInvoice(status: PAID, paidAt: NOW(), ...)
    │       AuditLog(action: CREATE, entity: MerchantBillingInvoice, actorType: SYSTEM)
    │     COMMIT
    │     Send invoice PDF via Resend
    │
    └── FAILED:
          UPDATE MerchantSubscription SET failedAttempts = failedAttempts + 1
          INSERT MerchantBillingInvoice(status: OVERDUE, ...)
          Send "Payment failed" email to merchant
          IF failedAttempts >= gracePeriodDays:
            UPDATE Merchant SET status = 'SUSPENDED', suspendedAt = NOW(),
              suspendedReason = 'AUTO_BILLING_FAILURE'
            AuditLog(action: SUSPEND, entity: Merchant, actorType: SYSTEM)
            Send suspension notification email to merchant
            Send alert to FBQRSYS admin (see Platform Notifications section)

STEP 3 — Expire trials that have passed trialEndsAt
  UPDATE Merchant SET status = 'SUSPENDED'
  WHERE status = 'TRIAL'
    AND trialEndsAt < NOW()
  RETURNING id, email

  FOR EACH result:
    Send "Trial expired — upgrade to continue" email
    AuditLog(action: SUSPEND, entity: Merchant, actorType: SYSTEM)

STEP 4 — Send 3-day-before reminders (subset of STEP 1 for closer window)
  [Same logic as STEP 1 but for 3-day window, using a separate reminderSentAt3d field]
```

**Idempotency guard:** The billing cron must be safe to run twice (Vercel Cron can double-fire). Guards:
- `reminderSentAt IS NULL` prevents double email sends
- `MerchantBillingInvoice` has a unique constraint on `(merchantId, periodStart)` — duplicate INSERT fails silently
- `UPDATE Merchant SET status = 'SUSPENDED' WHERE status = 'TRIAL'` is idempotent

**Schema additions for billing cron:**

| Model | Field | Notes |
|---|---|---|
| `MerchantSubscription` | `reminderSentAt` | datetime? — 7-day reminder sent |
| `MerchantSubscription` | `reminderSentAt3d` | datetime? — 3-day reminder sent |
| `MerchantSubscription` | `failedAttempts` | int default 0 — consecutive payment failures |
| `MerchantSubscription` | `lastRenewalAt` | datetime? — last successful renewal |
| `MerchantSubscription` | `gracePeriodDays` | int default 3 — configurable per merchant |
| `MerchantBillingInvoice` | `status` | enum: `PENDING \| PAID \| OVERDUE \| CANCELLED` |
| `MerchantBillingInvoice` | `periodStart` | datetime — subscription period start (for uniqueness) |

### Order Expiry Cron Specification

Runs on a short interval to transition PENDING orders past their payment timeout to EXPIRED.

> **Vercel plan note:** Vercel Hobby supports only daily/hourly crons. **Vercel Pro** supports 1-minute intervals. Recommended: run every **1 minute** on Pro. If constrained to Hobby, a 5-minute interval is acceptable because the default `paymentTimeoutMinutes` is 15 minutes — worst-case expiry lag is 5 minutes, which is tolerable. **Upgrade to Vercel Pro before Step 15 (payment integration).** Budget ~$20/mo.

```
Every 5 minutes (UTC — no timezone conversion; runs globally at UTC intervals):

STEP 1 — Expire timed-out PENDING orders (PAY_FIRST only)
  SELECT o.id, o.customerSessionId
  FROM Order o
  JOIN Payment p ON p.orderId = o.id
  JOIN MerchantSettings ms ON ms.restaurantId = o.restaurantId
  WHERE o.status = 'PENDING'
    AND p.method != 'CASH'                          -- never expire cash orders
    AND o.createdAt < NOW() - (ms.paymentTimeoutMinutes * INTERVAL '1 minute')

  FOR EACH result:
    BEGIN TRANSACTION
      UPDATE Order SET status = 'EXPIRED' WHERE id = o.id AND status = 'PENDING'
      -- if affectedRows = 0: already processed (race condition guard)
      UPDATE Payment SET status = 'EXPIRED' WHERE orderId = o.id AND status = 'PENDING'
      INSERT OrderEvent(fromStatus: PENDING, toStatus: EXPIRED, actorType: SYSTEM)
      INSERT AuditLog(action: UPDATE, entity: Order, actorType: SYSTEM)
    COMMIT

STEP 2 — Log run to CronRunLog
  INSERT CronRunLog(jobName: 'order-expiry', startedAt, completedAt, status, affectedRows)
```

**Idempotency:** `WHERE status = 'PENDING'` atomic update means double-runs are safe.
**Default `paymentTimeoutMinutes`:** 15 minutes. Also passed as `custom_expiry` to Midtrans at order creation so Midtrans expires the payment session at the same time — keeps FBQR and Midtrans in sync.

### autoResetAvailability Cron Specification

Runs daily at `00:05 WIB` (`17:05 UTC`). Resets items that were manually marked unavailable for the day.

```
Daily at 00:05 WIB:

STEP 1 — Reset available items
  UPDATE MenuItem
  SET isAvailable = true
  WHERE autoResetAvailability = true
    AND isAvailable = false
    AND stockCount IS NULL          -- constraint: autoResetAvailability ignored when stockCount is set

  Returns affected rows for CronRunLog.

STEP 2 — Log run to CronRunLog
```

**Constraint reminder:** If `stockCount IS NOT NULL` AND `autoResetAvailability = true`, the API must return a validation error at save time — these flags are mutually exclusive. The cron skips `stockCount IS NOT NULL` rows as an additional guard.

### QueueCounter Daily Reset & Pruning Cron Specification

Runs daily at `00:02 WIB` (`17:02 UTC`), immediately after the `autoResetAvailability` cron. Ensures a fresh counter row exists for each branch for the new day, and prunes old counter rows to prevent unbounded table growth.

> **`QueueCounter` is not auto-reset** — a new counter row is created lazily on the first order of each day (by the Order creation API, via `SELECT FOR UPDATE`). This cron is only needed for **pruning** old rows. It does NOT need to pre-create rows (the lazy creation in the Order API handles that).

```
Daily at 00:02 WIB:

STEP 1 — Prune QueueCounter rows older than 30 days
  DELETE FROM QueueCounter
  WHERE date < (CURRENT_DATE AT TIME ZONE 'Asia/Jakarta') - INTERVAL '30 days'
  RETURNING branchId, date

  -- Note: 30-day window retains enough history for monthly reporting queries.
  -- CURRENT_DATE AT TIME ZONE 'Asia/Jakarta' ensures we compare WIB dates, not UTC dates.

STEP 2 — Log run to CronRunLog
  INSERT CronRunLog(jobName: 'queue-counter-prune', startedAt, completedAt, status, affectedRows)
```

**Idempotency:** `DELETE WHERE date < ...` is inherently idempotent — re-running deletes nothing if already pruned.

**Scale note:** At ~365 rows/branch/year, with 100 branches this is 36,500 rows/year. Without pruning, this grows indefinitely. The 30-day retention window balances history depth against storage growth.

**`vercel.json` addition:**
```json
{ "path": "/api/cron/queue-counter-prune", "schedule": "2 17 * * *" }
```

### Session Cleanup Cron Specification

Runs daily at `01:00 WIB` (`18:00 UTC`). **Leak-recovery fallback only** — not the primary mechanism.

> **Important:** WaiterRequest auto-resolve is synchronous in application code (see `docs/data-models.md` and `docs/customer.md`). This cron only catches requests that slipped through due to a server crash or uncaught exception during session close. It must not be relied upon as the normal resolution path.

```
Daily at 01:00 WIB:

STEP 1 — Expire stale ACTIVE CustomerSessions past their TTL
  UPDATE CustomerSession
  SET status = 'EXPIRED'
  WHERE status = 'ACTIVE'
    AND expiresAt < NOW()
  RETURNING tableId, restaurantId   -- capture for STEP 1b

STEP 1b — Update Table.status for newly expired sessions
  -- Without this step, tables stay OCCUPIED indefinitely after session timeout:
  -- staff see ghost-occupied tables on the floor map and cannot reassign them.
  --
  -- Only updates OCCUPIED tables. If t.status = AVAILABLE (customer scanned QR but
  -- never placed an order), the table is already in the correct state — skip it.
  -- This prevents erroneously touching RESERVED or CLOSED tables.
  UPDATE "Table" t
  SET status = CASE
    WHEN ms.enableDirtyState = true THEN 'DIRTY'
    ELSE 'AVAILABLE'
  END
  FROM CustomerSession cs
  JOIN Branch b ON b.id = t.branchId
  JOIN Restaurant r ON r.id = b.restaurantId
  JOIN MerchantSettings ms ON ms.restaurantId = r.id
  WHERE t.id = cs.tableId
    AND cs.restaurantId = r.id                         -- explicit cross-restaurant safety guard
    AND cs.status = 'EXPIRED'
    AND cs.updatedAt >= NOW() - INTERVAL '5 minutes'   -- only rows just expired in STEP 1
    AND t.status = 'OCCUPIED'

STEP 2 — Resolve leaked WaiterRequests (fallback only — normally handled synchronously at session close)
  UPDATE WaiterRequest
  SET resolvedAt = NOW()
  WHERE resolvedAt IS NULL
    AND tableId IN (
      SELECT tableId FROM CustomerSession
      WHERE status IN ('EXPIRED', 'COMPLETED')
        AND updatedAt < NOW() - INTERVAL '1 hour'
    )

STEP 3 — Log run to CronRunLog
```

### EOD PENDING_CASH Cleanup Cron Specification

Runs nightly at `03:00 WIB` (`20:00 UTC`), or at the hour configured in `MerchantSettings.eodCashCleanupHour` (default: 3). Two-part process: an operator-triggered "Close Register" flow followed by a safety-net batch cleanup.

#### Close Register Button (manual trigger, per-branch)

A "Close Register" button in `apps/web/(kitchen)` allows a cashier to initiate end-of-day cash reconciliation:

```
Cashier clicks "Close Register" for their branch:

STEP 1 — Load all PENDING_CASH orders for this branch
  SELECT o.id, o.totalAmount, o.customerNote, cs.tableId
  FROM Order o
  JOIN CustomerSession cs ON cs.id = o.customerSessionId
  JOIN Payment p ON p.orderId = o.id
  WHERE o.branchId = $branchId
    AND p.method = 'CASH'
    AND o.status = 'PENDING'
    AND p.status = 'PENDING_CASH'
  ORDER BY o.createdAt ASC

  → Display each order as a card:
      Table {number} | {itemCount} items | Rp {totalAmount}
      [Mark as Paid] [Cancel Order]

STEP 2 — For each order the cashier processes:
  ├── [Mark as Paid]:
  │     BEGIN TRANSACTION
  │       UPDATE Payment SET status = 'SUCCESS' WHERE orderId = o.id
  │       UPDATE Order SET status = 'CONFIRMED' WHERE id = o.id AND status = 'PENDING'
  │       INSERT OrderEvent(fromStatus: PENDING, toStatus: CONFIRMED, actorType: STAFF)
  │       INSERT AuditLog(action: UPDATE, entity: Order, actorType: STAFF)
  │     COMMIT
  │     → Order sent to kitchen (Supabase Realtime broadcast on channel orders:{branchId})
  │
  └── [Cancel Order]:
        BEGIN TRANSACTION
          UPDATE Payment SET status = 'FAILED' WHERE orderId = o.id
          UPDATE Order SET status = 'CANCELLED', cancelledAt = NOW()
            WHERE id = o.id AND status = 'PENDING'
          INSERT OrderEvent(fromStatus: PENDING, toStatus: CANCELLED, actorType: STAFF)
          INSERT AuditLog(action: CANCEL, entity: Order, actorType: STAFF)
        COMMIT
        → Restore stockCount for any item where stockCount IS NOT NULL:
            UPDATE MenuItem SET stockCount = stockCount + qty WHERE id = $itemId

STEP 3 — Log run to CronRunLog
```

#### Safety-Net Batch Cleanup Cron (automatic, nightly)

Runs after `eodCashCleanupHour` to batch-cancel any PENDING_CASH orders that were not manually processed. This is a fallback — the Close Register button is the preferred path.

```
Nightly at eodCashCleanupHour WIB (default 03:00):

STEP 1 — Batch-cancel stale PENDING_CASH orders
  SELECT o.id
  FROM Order o
  JOIN Payment p ON p.orderId = o.id
  WHERE o.status = 'PENDING'
    AND p.method = 'CASH'
    AND p.status = 'PENDING_CASH'
    AND o.createdAt < NOW() - INTERVAL '12 hours'  -- safety: never cancel same-day orders

  FOR EACH result:
    BEGIN TRANSACTION
      UPDATE Payment SET status = 'FAILED' WHERE orderId = o.id
      UPDATE Order SET status = 'CANCELLED', cancelledAt = NOW()
        WHERE id = o.id AND status = 'PENDING'
      INSERT OrderEvent(fromStatus: PENDING, toStatus: CANCELLED, actorType: SYSTEM,
        actorNote: 'EOD cash cleanup — not confirmed before close of business')
      INSERT AuditLog(action: CANCEL, entity: Order, actorType: SYSTEM)
    COMMIT
    → Restore stockCount: UPDATE MenuItem SET stockCount = stockCount + qty
        WHERE id = $itemId AND stockCount IS NOT NULL

STEP 2 — Log run to CronRunLog
  INSERT CronRunLog(jobName: 'eod-cash-cleanup', startedAt, completedAt, status, affectedRows)
```

**Idempotency:** `WHERE status = 'PENDING'` atomic update prevents double-cancellation. If the cron fires twice, the second pass finds no matching rows.

### FBQRSYS Admin Controls (Billing)

Available to users with `billing:manage` + `merchants:suspend` permissions:

| Action | Description |
|---|---|
| View all merchant subscriptions | Filter by status, plan, renewal date |
| Manually suspend | Lock a merchant account regardless of billing status |
| Manually unsuspend / override | Unlock a suspended merchant (e.g. dispute resolution) |
| Send billing invoice | Manually trigger invoice generation and email |
| Extend trial | Give a merchant more trial time |
| Change plan | Move merchant to a different plan |
| View billing history | All `MerchantBillingInvoice` records for a merchant |
| Generate platform revenue report | Total MRR, churn, new activations, by plan tier |

### MerchantBillingInvoice Format

```
FBQR Invoice
Invoice #: FBQR-{YYYYMM}-{merchantId}
Date: {issueDate}
Due: {dueDate}

Bill To:
  {merchantName}
  {merchantEmail}
  NPWP: {merchant.taxId if set}

Description: FBQR {PlanName} Subscription — {period}
Amount: Rp {amount}
Tax (PPN 11%): Rp {tax}
Total: Rp {total}

Payment: {method} — {status}
```

> **FBQR's own Faktur Pajak obligation:** FBQR as a SaaS business collecting subscription fees from merchants must issue a **Faktur Pajak** (Indonesian VAT invoice) to merchants that are legal entities (PT, CV) and request it. This is separate from the MerchantBillingInvoice — the Faktur Pajak is the official tax document. Phase 1: generate the MerchantBillingInvoice PDF with basic tax breakdown. Phase 2: add Faktur Pajak generation via the EFAKTUR API (DJP Online integration) for Enterprise merchants. Add `merchant.taxId` (NPWP, 15-digit string) to the Merchant model in Phase 1 Prisma.

---

## Multi-Branch Per Merchant Account

> **Deal-breaker for chains.** A chain owner operating 8 branches under one restaurant name cannot manage them as separate disconnected accounts.

### Core rule

**1 Merchant account = 1 Restaurant brand. Always.**

Multi-branch means: **one brand, multiple physical locations** (e.g. "Ayam Bakar Sari — Sudirman", "Ayam Bakar Sari — Kelapa Gading").

### How multi-branch is enabled (EOI flow)

Multi-branch is **not self-service**. The merchant cannot add branches themselves. This keeps FBQRSYS in control of plan enforcement.

```
Merchant submits an Expression of Interest (EOI)
    │  (via email, contact form, or phone — no in-app flow required for Phase 1)
    │
    ▼
FBQRSYS admin reviews the request
    │
    ├── Approves → admin opens merchant's account in FBQRSYS panel
    │               → sets multiBranchEnabled = true on Merchant record
    │               → sets branchLimit to the number of branches allowed
    │               → adds each Branch one by one (name, address)
    │               → merchant immediately sees new branches in their branch selector
    │
    └── Rejects / requests more info → admin contacts merchant directly
```

FBQRSYS admin controls:
- Whether the merchant can have multiple branches (`Merchant.multiBranchEnabled: bool`)
- How many branches are allowed (`Merchant.branchLimit: int`, driven by their plan)

---

## FBQRSYS Owner Dashboard

Accessible to `SystemAdmin` users with `reports:read` permission.

### Overview cards (top of page)

| Card | Data |
|---|---|
| **Total GMV** | Gross merchandise value across all merchants (today / this month / all time) |
| **Platform MRR** | Monthly recurring revenue from active subscriptions |
| **Platform ARR** | Annualized recurring revenue |
| **Active Merchants** | Count of merchants with status `ACTIVE` |
| **Trial Merchants** | Count of merchants in `TRIAL` — potential conversions |
| **Suspended Merchants** | Count — needs attention |

### Merchant growth analytics

| Metric | Description |
|---|---|
| New signups (trial starts) | Daily/weekly/monthly trend chart |
| Trial → Active conversion rate | % of trials that converted to paid, by cohort month |
| Churned merchants | Cancelled or suspended past grace period, by month |
| Net merchant growth | New activations minus churn |
| Average trial duration before conversion | How many days before merchants upgrade |

### Subscription revenue breakdown

| Metric | Description |
|---|---|
| Revenue by plan tier | MRR split: Free / Starter / Pro / Enterprise |
| Monthly vs yearly billing mix | % of revenue from annual plans (higher LTV) |
| Upcoming renewals (next 30 days) | List of merchants renewing soon — risk: those with failed past payments |
| Overdue / at-risk accounts | Merchants in grace period or with failed last payment |
| Revenue forecast (next 3 months) | Based on current subscriptions + historical churn rate |

### Top merchants

| Metric | Description |
|---|---|
| Top 10 by GMV | Highest-volume merchants on the platform — for case studies, referrals |
| Top 10 by order count | Most active in terms of transactions |
| Top 10 by customer ratings | Platform quality leaders |
| Fastest growing (last 30 days) | Month-over-month GMV growth — identify rising stars |
| Recently churned | Merchants who cancelled — surface for win-back campaigns |

### Platform-wide order analytics

| Metric | Description |
|---|---|
| Total orders processed | Platform cumulative + daily/weekly trend |
| Order type mix | Dine-in vs Takeaway vs Delivery (%) |
| Payment method distribution | QRIS vs Cash vs GoPay/OVO vs VA across all merchants |
| Average order value (platform-wide) | Trend over time |
| Peak hours (platform-wide) | When are orders placed across all restaurants |

### Geographic distribution (future)

- Map view of merchant locations by city/province
- GMV density heatmap — where is the platform strongest
- Identifies expansion opportunities (high-density cities with few merchants)

### Billing health

| Metric | Description |
|---|---|
| Invoices issued this month | Count + total IDR value |
| Invoices paid on time | % payment rate |
| Invoices overdue | Count + total IDR at risk |
| Average days to payment | Payment velocity trend |
| Total outstanding (unpaid) | Sum of all overdue `MerchantBillingInvoice` amounts |

---

## Public REST API & Webhooks

> **Integration is not optional.** Merchants who don't build their own inventory module will use someone else's. If FBQR doesn't expose an API, the merchant runs two disconnected systems and eventually picks the one their accountant or POS vendor supports. An open API turns FBQR into a platform, not just a product.

### Architecture

```
External system (accounting, inventory, loyalty, delivery aggregator)
    │
    │  REST API (bearer token)            Webhooks (HTTPS POST, signed)
    │  GET  /api/v1/orders                ← order.confirmed
    │  GET  /api/v1/menu-items            ← order.status_changed
    │  POST /api/v1/menu-items/:id/stock  ← payment.received
    │  GET  /api/v1/reports/revenue       ← stock.depleted
    │                                     ← session.closed
    ▼
FBQR API (Next.js API routes, /api/v1/*)
```

**Auth:** API key as bearer token — `Authorization: Bearer fbqr_live_xxxx`.
Keys are scoped to a merchant and carry a permission list (same atomic permission keys as RBAC).
No OAuth2 — server-to-server integration; bearer tokens are the right simplicity/security tradeoff.

**Versioning:** `/api/v1/` prefix. Breaking changes bump the version; old versions deprecated with 6-month notice.

**Rate limiting:** 60 requests/minute per API key (configurable by plan tier).

**Response format:**
```json
{ "data": { ... }, "meta": { "requestId": "uuid", "timestamp": "ISO8601" } }
// Errors:
{ "error": { "code": "ORDER_NOT_FOUND", "message": "Order 123 does not exist" }, "meta": { ... } }
```

### REST Endpoints (Phase 2 — schema scaffolded in Phase 1)

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/orders` | `orders:view` | List orders (filter by status, date, branch) |
| `GET` | `/api/v1/orders/:id` | `orders:view` | Single order with items |
| `PATCH` | `/api/v1/orders/:id/status` | `orders:manage` | Update order status |
| `GET` | `/api/v1/menu-items` | `menu:manage` | List all menu items |
| `PATCH` | `/api/v1/menu-items/:id` | `menu:manage` | Update item (price, availability) |
| `POST` | `/api/v1/menu-items/:id/stock` | `menu:manage` | Set stock count |
| `GET` | `/api/v1/reports/revenue` | `reports:read` | Revenue summary (date range, branch) |
| `GET` | `/api/v1/webhooks` | `settings:manage` | List registered endpoints |
| `POST` | `/api/v1/webhooks` | `settings:manage` | Register a webhook endpoint |
| `DELETE` | `/api/v1/webhooks/:id` | `settings:manage` | Remove a webhook endpoint |

### Webhook Events

FBQR POSTs a signed JSON payload to registered endpoints when these events occur:

| Event | Payload includes | Common use case |
|---|---|---|
| `order.confirmed` | Order ID, items, table, branch, total | Trigger inventory deduction in external system |
| `order.status_changed` | Order ID, old status, new status | Sync to delivery aggregator dashboard |
| `order.cancelled` | Order ID, reason, items | Restore stock in external inventory |
| `payment.received` | Payment ID, method, amount, order ID | Sync to Accurate Online / Jurnal.id |
| `stock.depleted` | Item ID, name, branch | Alert purchasing system to reorder |
| `session.closed` | Session ID, table, orders summary | Trigger loyalty sync or end-of-day export |

**Webhook security:** `X-FBQR-Signature: sha256=<HMAC-SHA256>` header on every POST, signed with `WebhookEndpoint.secret`. Recipients verify before processing.

**Webhook reliability:** Retries on non-2xx response — 5 attempts, exponential backoff (5s, 25s, 125s, 625s, 3125s). After 5 failures the endpoint is marked `isActive = false` and merchant is notified by email. Every attempt logged in `WebhookDeliveryLog`.

---

## Permanent Free Tier (Warung / Lite Mode)

> **Deal-breaker for Mas Tono.** A 14-day trial that then requires payment will lose the warung segment entirely. They need to see sustained value before paying anything.

### Proposed tier structure

| Tier | Price | Limits | Unlocks subscription |
|---|---|---|---|
| **Free / Warung** | Rp 0 forever | 1 branch, 5 tables, 30 menu items, basic layout (List only), no AI, no branding, FBQR watermark on menu | If they grow past limits or want features, they upgrade |
| **Starter** | Paid monthly | 1 branch, 15 tables, all layouts, branding, basic AI | |
| **Pro** | Paid monthly | Multiple branches, unlimited, full AI, loyalty, delivery integration | |

**Free tier retention features:**
- FBQR logo/watermark on the customer menu (marketing for FBQR)
- "Upgrade" prompt visible when they hit a limit (not a hard block — a gentle nudge)

---

## Indonesian Regulatory Compliance

> **This section is mandatory reading before launch.** Non-compliance with Indonesian law carries material legal and financial risk.

### PDP Law (UU Pelindungan Data Pribadi)

Indonesia's personal data protection law (UU No. 27/2022) took effect in October 2024. FBQR collects:
- Customer emails, order history, device fingerprints (via CustomerSession)
- Merchant emails, business names, bank account details
- Staff PINs (hashed)

**Required before public launch:**

| Obligation | Action Required |
|---|---|
| **Privacy Policy** | Publish at `fbqr.app/privacy` — in Bahasa Indonesia. Must disclose: data collected, purpose, retention period, third-party sharing (Midtrans, Supabase, Vercel, Resend), customer rights |
| **Data retention policy** | Define and implement: customer order history retained for 7 years (Indonesian commercial law requirement); customer PII deletable on request after account closure; staff records retained 3 years after termination |
| **Data Subject Rights** | Implement: right to access, right to correction, right to deletion. Phase 1: via email to support@fbqr.app with 30-day SLA. Phase 2: self-service in customer account settings |
| **Consent at registration** | Merchant registration form must include "I agree to FBQR's Privacy Policy and Terms of Service" checkbox (not pre-checked). Store consent timestamp on Merchant record. Customer checkout: brief consent notice for order data processing |
| **Data Processing Agreement (DPA)** | Required for merchant relationships where FBQR processes their customers' personal data. Template DPA to be prepared by counsel. Enterprise merchants (PT, hotel chains) will request signed DPAs before going live |
| **Breach notification** | If a data breach occurs involving personal data, notify the BPJS (Badan Pengawas) within 14 days |

**Schema additions for PDP compliance:**

| Model | Field | Notes |
|---|---|---|
| `Merchant` | `privacyConsentAt` | datetime? — timestamp of ToS/Privacy Policy acceptance |
| `Merchant` | `taxId` | string? — NPWP (15 digits); required for Faktur Pajak |
| `Customer` | `privacyConsentAt` | datetime? — consent at registration |
| `Customer` | `deletionRequestedAt` | datetime? — set when customer requests data deletion; triggers 30-day cleanup job |

### Bank Indonesia (BI) Licensing

FBQR's current model (subscription SaaS, Midtrans handles all payment processing) does **not** require a Bank Indonesia payment license (PJSP — Penyelenggara Jasa Sistem Pembayaran) because:
- FBQR does not hold, move, or settle any payment funds
- All payment flows are directly: Customer → Midtrans → Merchant
- FBQR only stores transaction metadata (order IDs, amounts) not funds

**Watch out for:** If FBQR ever holds customer funds in escrow (e.g. deposit model for BY_WEIGHT items), or acts as a payment aggregator collecting merchant settlements, a PJSP license from BI would be required. This must be reviewed with Indonesian counsel before implementing any fund-holding feature.

### FBQR's Own Tax Obligations

FBQR as a PT (Indonesian legal entity) collecting subscription revenue from merchants:
- Must collect PPN 11% on subscription fees and remit to DJP
- Must issue proper invoices (`Faktur Pajak`) to merchants that are legal entities
- Annual PKP registration required once revenue exceeds Rp 4.8B/year
- Phase 1: issue simple receipts with PPN breakdown via `MerchantBillingInvoice`
- Phase 2: EFAKTUR API integration for proper Faktur Pajak generation

---

## SLA & Uptime Commitments

> **This defines what FBQR promises merchants.** Without an SLA, merchants have no recourse when the platform is down during dinner rush — and they will blame FBQR publicly.

### Target Uptime

| Service | Target | Measurement |
|---|---|---|
| `apps/menu` (customer ordering) | 99.9% monthly | Excludes scheduled maintenance |
| `apps/web` (merchant-pos, kitchen) | 99.5% monthly | Excludes scheduled maintenance |
| Database (Supabase) | Per Supabase SLA (99.9%) | Inherits from infrastructure provider |
| Payment webhooks (Midtrans) | Best effort, reconciliation within 24h | Midtrans handles reliability |

**99.9% uptime = max 43.8 minutes downtime per month.**

### Scheduled Maintenance

- Announced ≥ 48 hours in advance via email and in-app banner
- Scheduled only between 02:00–05:00 WIB (lowest order volume window)
- Duration ≤ 30 minutes per event

### Incident Response

| Severity | Definition | Response Time | Communication |
|---|---|---|---|
| P1 — Critical | `apps/menu` or payment processing completely down | 15 minutes to first response | Email all affected merchants within 30 minutes |
| P2 — High | `merchant-pos` down or kitchen display not updating | 30 minutes | Email within 1 hour |
| P3 — Medium | Specific feature broken (e.g. CSV export), degraded performance | 2 hours | Status page update |
| P4 — Low | Minor cosmetic issues | Next business day | — |

**Incident broadcast mechanism:** When a P1 or P2 incident is confirmed, FBQRSYS sends a bulk email to all `ACTIVE` merchants via Resend. Template: "We are aware of an issue affecting [service]. Our team is investigating. Updates at status.fbqr.app." Status page: simple hosted page (BetterUptime or self-hosted) with current system status per service.

### Billing Credits for Downtime

If monthly uptime falls below SLA targets, merchants receive billing credits:
- 99.0%–99.9%: 10% credit on next invoice
- 95.0%–99.0%: 25% credit
- Below 95.0%: 50% credit

Credits are applied automatically by the billing cron, not claimed manually. Tracked in `MerchantBillingInvoice` as a credit line.

---

## Monitoring & Observability

> **Robin must know before merchants call.** Reactive support (finding out about outages from WhatsApp complaints) destroys trust and burns hours. Proactive monitoring is not optional.

### Required Monitoring Stack

| Tool | Purpose | Setup Step |
|---|---|---|
| **Sentry** | Error tracking — unhandled exceptions, API errors, client-side crashes | Add `@sentry/nextjs` in Step 1 monorepo scaffold |
| **BetterUptime** (or Pingdom) | Uptime checks every 1 min on `/api/health` endpoints for both apps | Configure before first deploy |
| **Vercel Analytics** | Core Web Vitals (LCP, CLS, FID) for `apps/menu` — Lighthouse score > 85 target | Built into Vercel, enable in project settings |
| **Supabase Dashboard** | DB query performance, connection pool usage, storage usage | Monitor via Supabase console; set alert at 80% connection limit |

### Health Check Endpoints

Implement `GET /api/health` on both apps. Returns:
```json
{
  "status": "ok",
  "db": "ok",
  "realtime": "ok",
  "timestamp": "ISO8601"
}
```
HTTP 200 = healthy. HTTP 503 = degraded (BetterUptime triggers alert).

The endpoint checks: DB connectivity (simple `SELECT 1` query), Supabase Realtime subscription status, and environment variable presence.

### Platform Notifications to Robin

**Trigger → channel mapping:**

| Event | Channel | Who receives |
|---|---|---|
| New merchant self-registered | Email digest (daily 09:00 WIB) | Platform Owner |
| High-value merchant cancelled (top 20% by GMV) | Immediate email | Platform Owner |
| Billing cron failed | Immediate email + Sentry alert | Platform Owner |
| Merchant suspended by billing cron | Daily digest | Billing Admin |
| P1/P2 incident detected by BetterUptime | PagerDuty / WhatsApp | On-call (Platform Owner in Phase 1) |
| Platform GMV hits milestone (Rp 100M, 500M, 1B) | Celebratory email | Platform Owner |
| Daily digest: signups, churns, revenue, overdue | Daily 08:00 WIB email | Platform Owner |

**Implementation:** Use Resend for email notifications. Add a `sendPlatformAlert(type, data)` helper in `packages/config` that all server-side code can call. This is a lightweight internal notification system — not a third-party tool.

### Cron Job Monitoring

All Vercel Cron jobs must be monitored for silent failures:

| Cron | Frequency | Monitor via |
|---|---|---|
| Order expiry | Every minute | Sentry + last-run timestamp check in `/api/health` |
| Billing check | Daily | Sentry + AuditLog: if no `SYSTEM` audit entries for billing in 26h → alert |
| PENDING_CASH EOD cleanup | Nightly 03:00 | Sentry |
| Midtrans reconciliation | Daily | Sentry + reconciliation report in FBQRSYS |

Add `CronRunLog` table to Phase 1 Prisma (lightweight):
```
CronRunLog
  id        string UUID PK
  jobName   string           — e.g. "order_expiry", "billing_check"
  startedAt datetime
  completedAt datetime?
  status    enum: SUCCESS | FAILED | PARTIAL
  affectedRows int?
  errorMessage string?
```

---

## Data Retention & Merchant Data Portability

### Retention Schedule

| Data type | Retention | Notes |
|---|---|---|
| Order history (all statuses) | 7 years | Indonesian commercial law (UUPT) requirement |
| Customer PII (email, name) | Until deletion request + 30 days | PDP Law: must delete within 30 days of verified request |
| Payment records | 7 years | Tax and banking regulation |
| AuditLog | Forever (append-only) | Never deleted; personal data in audit logs anonymized on customer deletion requests |
| Staff records | 3 years after staff account deactivation | Indonesian employment regulation |
| Cancelled merchant data | 3 years after cancellation | For dispute resolution and legal purposes |
| Session data (CustomerSession) | 90 days after EXPIRED/COMPLETED | After 90 days, anonymize (null out customerId FK and ipAddress) |

### When a Merchant Cancels

1. `Merchant.status → CANCELLED`
2. All active `CustomerSession` records → `EXPIRED`
3. QR tokens invalidated immediately — customer scans show "Restaurant unavailable"
4. Merchant retains read-only access to their dashboard for 30 days (data export window)
5. After 30 days: merchant login blocked; data enters 3-year retention hold
6. After 3 years: merchant PII (email, password) deleted; restaurant/order data anonymized but kept for platform analytics

### Data Export for Merchants

Merchants can export their data at any time from `merchant-pos → Settings → Data Export`:

| Export | Format | Contents |
|---|---|---|
| Order history | CSV / Excel | All orders with items, amounts, dates, payment methods |
| Customer list | CSV | Registered customer emails + loyalty balances (if loyalty enabled) |
| Menu | CSV | All categories, items, variants, prices |
| Invoice archive | ZIP of PDFs | All customer invoices |

This export must remain available for 30 days after cancellation (see above).

---

## Merchant Acquisition & Growth Strategy

> **Building the product without a customer acquisition plan is building in a vacuum.** This section documents how FBQR reaches its first 100 merchants.

### Phase 1 Acquisition Channels (Manual)

**Direct outreach:** Robin personally contacts local cafes and restaurants in Jakarta (Kemang, SCBD, Kelapa Gading). Focus: mid-market restaurants that have already tried GrabFood/GoFood and are looking for dine-in solutions.

**Referral program (build in Step 7 UI):**
- Merchant A refers Merchant B → both get 1 month free when B goes ACTIVE
- Simple code: Merchant gets a shareable `referralCode` in settings; referred merchant enters it on registration
- Schema: `Merchant.referralCode` (auto-generated, unique), `Merchant.referredByMerchantId` FK

**WhatsApp-first outreach:** Indonesian restaurant owners respond to WA messages better than email. Build a "try FBQR for your restaurant" WA message template with a direct registration link.

**F&B community seeding:** Indonesian F&B is networked through:
- Komunitas Pengusaha Kuliner Indonesia (KPKI)
- GrabFood / GoFood merchant Facebook groups
- Local arisan group networks (Ibu-ibu warung owners)

### Competitive Positioning vs Indonesian Alternatives

| Competitor | Segment | FBQR Differentiator |
|---|---|---|
| **Moka POS** | Mid-market restaurants | Moka is a POS terminal (hardware + app); FBQR is QR-first (no hardware needed). Moka has no customer-facing self-order menu. FBQR is a direct complement, not a replacement — merchants can use both. |
| **Qasir** | Warung, small businesses | Qasir is free POS; FBQR's free tier competes directly. FBQR adds the customer-facing QR menu Qasir lacks. |
| **OttoPoint** | Loyalty only | FBQR loyalty is part of the full ordering platform. OttoPoint is a standalone loyalty program requiring separate POS integration. |
| **GrabFood / GoFood merchant tools** | Delivery-first restaurants | These tools serve delivery; FBQR serves dine-in. Delivery-first restaurants need both — FBQR handles dine-in revenue they're currently missing. |
| **TabSquare** | Singapore, premium | Not active in Indonesia (primary market is Singapore/SEA ex-Indonesia). No significant threat in Indonesian market today. |

### At-Risk Merchant Early Warning

Add to FBQRSYS dashboard a "Merchant Health" view:

| Signal | Threshold | Action |
|---|---|---|
| No orders in 7 days | Active merchant, 0 orders in 7d | Auto email: "Is everything okay? Here's a tip to drive more scans" |
| Login not seen in 14 days | Active merchant owner not logged in for 14d | Auto email: "New features you might have missed" + support offer |
| Trial expiring in 3 days | Trial merchant still on free plan, 0 plan upgrade attempts | Targeted email: "Your trial ends in 3 days — here's what you get with Pro" |
| NPS below 7 (Phase 2) | Post-cancellation exit survey | Queue for win-back campaign |

### Cancellation Exit Survey

When a merchant cancels (clicks "Cancel Subscription"), show a mandatory one-question survey before confirming:

> "Why are you cancelling? (Choose the main reason)"
> - Too expensive
> - Not enough features
> - Found a better alternative (which one?)
> - Restaurant closed / seasonal
> - Technical issues
> - Just testing, will return

Store in `Merchant.cancellationReason` (string enum). This data is gold for product decisions.

---

## Terms of Service & Legal Framework

> **Phase 1 requires at minimum a basic ToS and Privacy Policy before any paying merchant goes live.** Enterprise merchants will not proceed without reviewing legal documents.

### Required Documents (Before First Paying Merchant)

| Document | Where Hosted | Language |
|---|---|---|
| Terms of Service | `fbqr.app/terms` | Bahasa Indonesia (primary), English (secondary) |
| Privacy Policy | `fbqr.app/privacy` | Bahasa Indonesia (primary) |
| Merchant Agreement | Sent as PDF on request; linked from ToS | Bahasa Indonesia |
| Data Processing Agreement (DPA) | Sent as PDF to Enterprise merchants | Bahasa Indonesia |

### Key ToS Provisions to Include

- **Governing law:** Republic of Indonesia; jurisdiction: South Jakarta District Court (Pengadilan Negeri Jakarta Selatan)
- **Liability cap:** FBQR's total liability to a merchant is capped at the fees paid in the prior 3 months
- **Uptime SLA reference:** Link to the SLA section (this document or a public SLA page)
- **Acceptable use:** Merchants cannot use FBQR for illegal goods/services, gambling, or adult content
- **Payment obligations:** Subscription fees are non-refundable except as required by Indonesian consumer law
- **Data ownership:** Merchants own their restaurant and customer data; FBQR may use aggregated, anonymized data for platform analytics
- **Termination rights:** FBQR may terminate accounts for ToS violation with 7-day notice; immediate termination for fraud or illegal use

### Merchant Agreement (Distinct from ToS)

The Merchant Agreement is a B2B contract (not a click-through ToS) for Pro and Enterprise merchants. It covers:
- Service levels (reference the SLA section)
- Data processing obligations (per PDP Law)
- Payment terms (billing cycle, grace period, dispute resolution)
- IP ownership (merchant's menu data stays theirs; FBQR's platform code is FBQR's)
- Confidentiality

**Phase 1 shortcut:** Use a standard Indonesian B2B SaaS agreement template (available from Hukumonline or Smartlegal.id). Customize with FBQR-specific service descriptions. Have counsel review before first Enterprise contract.

---

## Platform Backlog (Platform-Owner Priority)

Features organized by platform-owner impact. 🚨 = revenue/legal risk. ⚠️ = operational burden. 📋 = growth.

| Feature | Level | Notes |
|---|---|---|
| **Billing cron (full spec above)** | 🚨 Revenue | Implement per spec in this file — Step 6 |
| **PDP compliance (privacy policy, retention)** | 🚨 Legal | Required before public launch |
| **FBQR Faktur Pajak** | 🚨 Legal | Required when PKP threshold crossed |
| **Monitoring & alerting (Sentry, BetterUptime)** | 🚨 Operational | Set up in Step 1 monorepo scaffold |
| **Merchant cancellation exit survey** | ⚠️ Retention | Add `cancellationReason` to Merchant model in Phase 1 |
| **At-risk merchant early warning emails** | ⚠️ Retention | Vercel Cron job checking order activity |
| **Platform notifications to owner** | ⚠️ Operational | `sendPlatformAlert()` helper + Resend |
| **Referral program** | 📋 Growth | `referralCode` + `referredByMerchantId` on Merchant; 1-month-free incentive |
| **FBQRSYS staff notes on merchant accounts** | 📋 Operational | `Merchant.notes` text field + history |
| **Bulk merchant operations** | 📋 Operational | Checkbox multi-select + bulk suspend/email in FBQRSYS |
| **In-app EOI form for multi-branch** | 📋 Growth | `MerchantRequest` model; replaces email EOI at scale |
| **Accurate Online / Jurnal.id integration** | 📋 Growth | Phase 2; FBQR's own accounting, not merchant's |
| **Status page (status.fbqr.app)** | 📋 Trust | BetterUptime or self-hosted; linked from ToS |
| **Geographic merchant map** | 📋 Analytics | City/province heatmap in FBQRSYS dashboard |
| **Revenue recognition tracking** | 📋 Accounting | Deferred revenue for annual subscriptions |

---

## PlatformSettings — Singleton Configuration Model

> **For AI agents:** `PlatformSettings` is a singleton row (always exactly one row, `id = 1`) that stores all platform-level values previously hardcoded in the codebase. Build the FBQRSYS Settings Panel UI in Step 5 to read/write these values. Never hardcode them in source code.

### Prisma Model

```prisma
model PlatformSettings {
  id                      Int      @id @default(1)   // singleton — always row 1

  // Support contact (displayed to merchants in the help panel)
  supportEmail            String   @default("support@fbqr.app")
  supportWhatsapp         String   @default("+6281234567890")
  supportResponseMessage  String   @default("Kami membalas dalam 1×24 jam kerja")

  // Platform identity
  platformName            String   @default("FBQR")
  platformTagline         String   @default("Pesan Lebih Mudah, Layani Lebih Cepat")
  platformLogoUrl         String?
  platformFaviconUrl      String?

  // Legal & compliance
  tosUrl                  String?
  privacyPolicyUrl        String?
  dpoEmail                String?                    // Data Protection Officer

  // Billing defaults (overridable per merchant)
  trialDurationDays       Int      @default(14)
  gracePeriodDays         Int      @default(7)
  defaultCurrency         String   @default("IDR")

  // Notification / alert recipients (FBQRSYS owner alerts)
  ownerAlertEmail         String?                    // Robin's email for platform alerts
  ownerAlertWhatsapp      String?

  // Feature flags (platform-wide on/off)
  aiRecommendationsEnabled Boolean @default(false)   // Master switch for AI features
  publicApiEnabled         Boolean @default(false)   // Public REST API access
  referralProgramEnabled   Boolean @default(false)   // Merchant referral codes

  updatedAt               DateTime @updatedAt
}
```

### Rules

- **Always exactly one row** with `id = 1`. The seed script creates this row on first run (idempotent `upsert`).
- **Read via server action or API route** — never expose `SUPABASE_SERVICE_ROLE_KEY` on the client. Cache the result in `unstable_cache` with a 60-second TTL.
- **Update via FBQRSYS Settings Panel** (see below). Requires `settings:manage` permission.
- **AI agents:** pull values from `PlatformSettings` wherever the previous spec said "hardcoded". Examples:
  - In-app merchant help panel → `supportEmail`, `supportWhatsapp`, `supportResponseMessage`
  - Billing grace period cron → `gracePeriodDays`
  - Trial expiry cron → `trialDurationDays`
  - Subscription plan invoice email `from` label → `platformName`

---

## FBQRSYS Settings Panel

> **Step:** Build in Step 5 alongside the rest of the FBQRSYS admin UI. Route: `/(fbqrsys)/settings`.
> **Permission:** All sub-pages require `settings:manage`.

The FBQRSYS Settings Panel is the administrative interface for the `PlatformSettings` singleton and for FBQRSYS staff management. It replaces all hardcoded platform-level values.

### Navigation tabs

| Tab | Route | Contents |
|---|---|---|
| **General** | `/settings/general` | Platform name, tagline, logo, favicon URL |
| **Support** | `/settings/support` | Support email, WhatsApp number, response time message |
| **Legal & Compliance** | `/settings/legal` | ToS URL, Privacy Policy URL, DPO email |
| **Billing Defaults** | `/settings/billing` | Trial duration (days), grace period (days), default currency |
| **Alerts** | `/settings/alerts` | Owner alert email, owner alert WhatsApp |
| **Feature Flags** | `/settings/features` | AI recommendations toggle, Public API toggle, Referral program toggle |
| **Staff** | `/settings/staff` | FBQRSYS staff accounts — list, invite, assign roles, deactivate |

### UI requirements

- Each tab renders a **form backed by a server action** — no client-side fetch.
- All fields show the current persisted value on load.
- On submit: validate → `upsert({ where: { id: 1 }, ... })` → `revalidatePath('/settings')` → show success toast.
- URL and email fields must be validated (format check) before saving.
- `platformLogoUrl` and `platformFaviconUrl` are plain URL text inputs in Phase 1 — file upload (Supabase Storage) deferred to Phase 2.
- Feature flags render as **toggle switches** (shadcn `Switch` component).
- **Staff tab** is a separate sub-page (not part of PlatformSettings model) — managed via `SystemAdmin` and `SystemRole` models.

### Seed defaults

The seed script must call:

```ts
await prisma.platformSettings.upsert({
  where: { id: 1 },
  create: {}, // all @default values apply
  update: {}, // no-op on subsequent seeds
});
```

---

## Cross-References

- Schema details for `PlatformSettings` → `docs/data-models.md`
- Merchant Settings Panel (equivalent for merchant owners) → `docs/merchant.md`
- Billing cron that reads `gracePeriodDays` and `trialDurationDays` → billing section above
- `settings:manage` permission definition → FBQRSYS Permissions section above
