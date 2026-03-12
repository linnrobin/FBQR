# FBQR — Data Models & Schema Reference

> **For AI agents:** Read this file when working on Steps 1–2 (Prisma schema, migrations, seed) or any step that requires understanding the database structure. Cross-reference with `docs/architecture.md` for ADRs that explain *why* models are designed this way.

---

## Audit Log

Every state-changing action is recorded in the `AuditLog` table.

### What is logged

| Field | Description |
|---|---|
| `actorId` | string? — ID of the user/staff performing the action; **null for SYSTEM events** (cron jobs, auto-resolve, auto-refund) |
| `actorType` | enum: `STAFF` \| `ADMIN` \| `CUSTOMER` \| `SYSTEM` — distinguishes human vs automated actions |
| `actorRole` | string? — Role at time of action; null for SYSTEM events |
| `actorName` | string? — Display name (denormalized for historical accuracy); null for SYSTEM events |
| `action` | Verb: `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `LOGOUT`, `APPROVE`, etc. |
| `entity` | Table/model affected: `MenuItem`, `Order`, `Staff`, `Promotion`, etc. |
| `entityId` | ID of the affected record |
| `oldValue` | JSON snapshot of the record before the change |
| `newValue` | JSON snapshot of the record after the change |
| `ipAddress` | Client IP address |
| `userAgent` | Browser/device info |
| `restaurantId` | Scoped to restaurant if applicable (null for platform-level actions) |
| `createdAt` | Timestamp of the action |

### Audit log scope

- FBQRSYS admins can see all platform-level audit logs
- Merchant owners can see all audit logs scoped to their restaurant
- Audit logs are **never deleted** (append-only, no soft delete)

### Mandatory audit events

The following must always be logged — use a shared `auditLog()` helper, never inline:

| Event | entity | action |
|---|---|---|
| Staff login / logout | `Staff` | `LOGIN` / `LOGOUT` |
| Order status change | `Order` | `UPDATE` |
| Order cancellation / refund | `Order` / `Payment` | `CANCEL` / `REFUND` |
| Menu item price change | `MenuItem` | `UPDATE` |
| Menu item create / delete | `MenuItem` | `CREATE` / `DELETE` |
| Promotion create / edit / delete | `Promotion` | `CREATE` / `UPDATE` / `DELETE` |
| Kitchen priority reorder | `OrderItem` | `REORDER` |
| Table open / close | `CustomerSession` | `CREATE` / `CLOSE` |
| Staff create / edit / delete | `Staff` | `CREATE` / `UPDATE` / `DELETE` |
| Merchant account suspend / unsuspend | `Merchant` | `SUSPEND` / `UNSUSPEND` |
| Late webhook revival or refund | `Order` | `LATE_WEBHOOK_REVIVAL` / `LATE_WEBHOOK_REFUND` |

---

## Key Data Models (Prisma Schema)

```
── PLATFORM ──────────────────────────────────────────────────────────
SystemAdmin          ← FBQRSYS admin accounts (owner + staff with dynamic roles)
SystemRole           ← User-created FBQRSYS roles (name, description, [permissions])
SystemRoleAssignment ← Links SystemAdmin → SystemRole
SubscriptionPlan     ← Plan tiers (name, price, billing cycle, feature limits)

── MERCHANT ──────────────────────────────────────────────────────────
Merchant             ← Restaurant owner account (email + hashed password)
  │  status: TRIAL | ACTIVE | SUSPENDED | CANCELLED
  │  trialEndsAt, suspendedAt, suspendedReason, suspendedByAdminId
  │  multiBranchEnabled (bool) — set by FBQRSYS admin only; default false
  │  branchLimit (int)         — max branches allowed; set by FBQRSYS admin
  │
  │  RULE: 1 Merchant = 1 Restaurant (strict). A second restaurant requires a
  │        new Merchant account with a different email.
  │
  ├── MerchantSubscription   ← Active plan (planId, cycle, currentPeriodEnd, autoRenew)
  │     └── MerchantBillingInvoice ← FBQR → merchant invoices (NOT customer invoices)
  │                                   (invoiceNumber, amount, dueAt, paidAt, pdfUrl)
  │
  └── Restaurant             ← Exactly one per Merchant
        ├── RestaurantBranding   ← Logo, colors, font, layout — shown to customers only
        ├── MerchantSettings     ← Feature flags, payment methods, tax, service charge
        ├── MerchantRole         ← User-created staff roles ([permissions])
        ├── MerchantRoleAssignment ← Links Staff → MerchantRole
        ├── KitchenStation       ← Merchant-defined stations (Bar, Kitchen, Patisserie, etc.)
        │     name, displayColor, isActive
        ├── Branch[]             ← Physical locations (multiple if multiBranchEnabled)
        │     └── Table          ← Each table (QR token, status: AVAILABLE/OCCUPIED/RESERVED/DIRTY/CLOSED)
        ├── MenuCategory         ← layout override, availableFrom/availableTo, kitchenStationId
        │     └── MenuItem       ← Price, image, allergens, isHalal, isVegetarian,
        │           │              estimatedPrepTime, stockCount, isAvailable
        │           │              kitchenStationOverride (optional per-item station override)
        │           ├── MenuItemVariant   ← e.g. Small/Medium/Large + price delta
        │           └── MenuItemAddon     ← e.g. Extra Cheese (+5k), No Onion (0)
        ├── Promotion            ← Discounts, combos (linked to MenuItems)
        └── Staff                ← Staff accounts (PIN auth)
                                   branchId (string? FK → Branch.id) — scoped to one Branch if set; null = restaurant-level access

── ORDERS ────────────────────────────────────────────────────────────
Order                ← status: PENDING | CONFIRMED | PREPARING | READY | COMPLETED | CANCELLED | EXPIRED
  │  orderType: DINE_IN | TAKEAWAY | DELIVERY
  │  branchId (string) — FK to Branch; required; enables per-branch reporting
  │  confirmedAt (datetime?) — set in the same DB transaction that sets status = CONFIRMED;
  │                            null until confirmed; used as start time for kitchen elapsed timer
  │  idempotencyKey (string?) — client-generated UUID sent with "Place Order" request;
  │                              unique index; expires 24h; prevents duplicate orders on
  │                              double-tap or network retry
  │  queueNumber (int) — auto-increments per branch per day; ALL order types receive a number
  │                       (DINE_IN, TAKEAWAY, DELIVERY); for dine-in the table name is primary
  │                       in the UI hierarchy, but queueNumber is always present for kitchen
  │                       reference; resets at midnight Asia/Jakarta (WIB);
  │                       generated via a transactional counter table (QueueCounter) to
  │                       prevent race conditions under concurrent orders; resets at midnight
  │  platformName (nullable) — GRABFOOD | GOFOOD | SHOPEEFOOD
  │  platformOrderId (nullable) — external delivery platform reference
  │  customerNote (string?, max 200 chars) — free-text special request entered by customer at checkout
  │                                           (e.g. "no MSG", "extra spicy", "allergy: shrimp")
  │                                           shown on kitchen display card and order tracking screen
  │
  ├── OrderItem      ← unitPrice (int), variantPriceDelta (int), addonPriceTotal (int), lineTotal (int)
  │                    variantSnapshot (JSON), addonSnapshot (JSON) — metadata only
  │                    kitchenPriority (int, per-station), kitchenStationId (snapshot)
  │                    NOTE: tax and service charge are applied at Order level, not per OrderItem.
  │                    The Order record stores subtotal, taxAmount, serviceChargeAmount, grandTotal
  │                    as computed at checkout time. This is intentional — Indonesian PPN applies
  │                    to the order total, not individual line items, and avoids rounding drift.
  ├── OrderEvent     ← Immutable log of order lifecycle transitions
  │     (orderId, fromStatus, toStatus, actorId?, actorType, actorName?, cancellationReason?, note?, createdAt)
  │     cancellationReason: CUSTOMER_REQUEST | PAYMENT_FAILED | MERCHANT_CANCEL | SYSTEM_EXPIRED | REFUND
  ├── WaiterRequest  ← Customer pressed a waiter-call button; resolved by staff
  │                    branchId (FK), tableId (FK)
  │                    notifyRoleId (FK? nullable) — when set, only staff with that MerchantRole receive
  │                      the push alert; null = all branch staff notified. Merchants configure per-type
  │                      routing in MerchantSettings (e.g. BILL alerts → Cashier role only,
  │                      CALL alerts → all). Phase 1: always null (notify all). Phase 2 UI: role-routing
  │                      config screen in merchant-pos settings → Notifications.
  │                    type: ASSISTANCE | BILL | CALL
  │                      ASSISTANCE — general help ("mas, tolong ke sini")
  │                      BILL       — customer wants to pay; staff UI shows Table total so waiter
  │                                   arrives with the EDC machine ready
  │                      CALL       — attention request, no specific action implied
  │                    resolvedAt (datetime? — null = open; set when staff marks resolved or session closes)
  │                    Auto-resolve rule: when a CustomerSession moves to COMPLETED or EXPIRED, all
  │                    open WaiterRequests for that session's tableId are automatically resolved
  │                    (resolvedAt = session close time, resolver = SYSTEM). This prevents stale
  │                    waiter alerts cluttering the merchant-pos dashboard after a table turns over.
  ├── OrderRating    ← Post-completion 1–5 star rating + optional comment from customer
  │   PreInvoice     ← NOT a DB model. Computed on-the-fly at checkout and returned in the
  │                    API response. Not persisted. The Order record already stores subtotal,
  │                    taxAmount, serviceChargeAmount, grandTotal at creation time — these
  │                    values serve as the pre-invoice data. Do not create a PreInvoice table.
  ├── Invoice        ← Generated after payment confirmed — PDF, legal receipt
  └── Payment        ← method: QRIS | EWALLET | VA | CARD | CASH
                        provider: GOPAY | OVO | DANA | SHOPEEPAY | BCA | MANDIRI | BNI | OTHER | null
                        Rules: CASH → provider always null; QRIS → provider optional (Midtrans may
                          return which e-wallet was used — store it if available; null if unknown);
                          EWALLET → provider required; VA → provider required; CARD → provider optional
                        status: PENDING | PENDING_CASH | SUCCESS | FAILED | EXPIRED | REFUNDED
                        midtransTransactionId (string?) — unique; idempotency guard on webhook

── CUSTOMERS ─────────────────────────────────────────────────────────
Customer             ← Optional registered account (email / Google OAuth)
  ├── PlatformLoyaltyBalance  ← Cross-restaurant FBQR Points (Phase 2)
  └── MerchantLoyaltyBalance  ← Per-restaurant points + earned title

CustomerSession      ← Scoped to Restaurant + Table + QR token
  │  status: ACTIVE | COMPLETED | EXPIRED
  │  ipAddress (string)       — client IP at session creation
  │  userAgent (string)       — browser/device fingerprint
  │  deviceHash (string?)     — optional hashed device identifier for fraud detection
  │  sessionCookie (string)   — unique cookie value stored client-side; allows page refresh
  │                             recovery without re-scanning QR
  └── (multiple Orders can be linked to one CustomerSession)

MerchantLoyaltyProgram ← Per-restaurant loyalty config (name, IDR per point, redemption rate,
                          pointsCalculationBasis: SUBTOTAL | TOTAL,
                          isActive: bool, activatedAt: datetime?, deactivatedAt: datetime?)
                          One active program per restaurant (unique constraint on restaurantId
                          WHERE isActive = true). Historical programs retained for balance integrity.
  └── LoyaltyTier    ← Tier name, threshold, multiplier, custom title, badge (Phase 2)

── PLATFORM ──────────────────────────────────────────────────────────
AuditLog             ← Immutable. actor, action, entity, oldValue, newValue, IP, timestamp
QueueCounter         ← Transactional counter for queue numbers; prevents race conditions
                       (branchId, date, lastNumber) — SELECT FOR UPDATE when issuing next number
                       date column stores the date in Asia/Jakarta (WIB) timezone — NOT UTC.
                       Cron that resets/prunes old counters must use cron-timezone: Asia/Jakarta.
                       A new counter row is created per (branchId, WIB-date) on first order of day.
```

### Order Status Lifecycle

```
PENDING ──┬──► CONFIRMED ──► PREPARING ──► READY ──► COMPLETED
          │         │
          │         └──► CANCELLED  (after confirmation; triggers refund)
          │
          ├──► CANCELLED  (before payment: customer cancelled)
          │
          └──► EXPIRED    (no payment webhook within timeout; terminal, silent)
```

### Valid order status transitions (state machine)

Only these transitions are permitted. Any other transition must be rejected by the server:

| From | To | Who can trigger |
|---|---|---|
| `PENDING` | `CONFIRMED` | System (Midtrans webhook) or cashier (cash confirm) |
| `PENDING` | `CANCELLED` | Customer; system (payment failed); or staff (cashier rejects a cash order) |
| `PENDING` | `EXPIRED` | System (payment timeout cron) |
| `CONFIRMED` | `PREPARING` | Kitchen staff |
| `CONFIRMED` | `CANCELLED` | Merchant owner / supervisor (triggers refund) |
| `PREPARING` | `READY` | Kitchen staff |
| `PREPARING` | `CANCELLED` | Merchant owner / supervisor (triggers refund) |
| `READY` | `COMPLETED` | Staff or system (after configurable hold period) |
| `EXPIRED` | `CONFIRMED` | System only (late webhook revival — within window, all checks pass) |
| `EXPIRED` | `CANCELLED` | System only (late webhook refund — beyond window, or revival checks fail) |

All other transitions (e.g. `READY → PREPARING`, `COMPLETED → CANCELLED`) are invalid and must return an error. The `OrderEvent` log records every transition with actor and timestamp.

> **Post-COMPLETED refunds:** A `COMPLETED` order is terminal — its `Order.status` never changes. If a refund is issued after completion (e.g. customer complained, merchant goodwill refund), only `Payment.status → REFUNDED` changes. The `Order` row retains `COMPLETED`. A credit note is generated and `AuditLog` records the `REFUND` action. This keeps historical order counts accurate and analytics unaffected.

Definitions:
```
PENDING     → order row created AND payment initiated with Midtrans (or cash approval pending)
              kitchen does NOT see this order
CONFIRMED   → payment verified (Midtrans webhook) OR cashier confirmed cash payment
              order becomes visible to kitchen; table becomes OCCUPIED if not already
PREPARING   → kitchen acknowledged and started preparing
READY       → all items marked ready by kitchen
COMPLETED   → order closed (customer received food / table cleared)
CANCELLED   → cancelled (before payment: customer cancelled; after CONFIRMED: triggers refund)
EXPIRED     → PENDING order where no payment confirmation arrived within timeout (terminal; silent clean-up)
```

> **When is an Order row created?**
>
> **PAY_FIRST mode (default):** Customer taps "Place Order" → `Order` created (`PENDING`) + `Payment`
> created (`PENDING`) → Midtrans `snap_token` issued → customer completes payment → Midtrans webhook
> → `Payment.status → SUCCESS` → `Order.status → CONFIRMED`.
>
> **PAY_AT_CASHIER mode:** Customer taps "Place Order" → `Order` created (`PENDING`) + `Payment`
> created (`PENDING_CASH`, provider: null) → order appears in merchant-pos cash queue → cashier
> collects cash → taps [Confirm] → `Payment.status → SUCCESS` → `Order.status → CONFIRMED`.
> No Midtrans interaction occurs in this flow; payment is recorded manually by the cashier.
>
> In both modes, an `Order` row always has a corresponding `Payment` row created at the same time.
> Abandoned carts (customer opens menu but never taps "Place Order") do NOT create `Order` rows —
> they are client-side state only.

### Payment → Order Status Mapping

| Payment.status | Resulting Order.status | Notes |
|---|---|---|
| `PENDING` | `PENDING` | Awaiting Midtrans callback |
| `PENDING_CASH` | `PENDING` | Awaiting cashier confirmation |
| `SUCCESS` | `CONFIRMED` | Midtrans webhook verified — pushed to kitchen |
| `FAILED` | `CANCELLED` | Payment declined; customer notified; `cancellationReason: PAYMENT_FAILED` |
| `EXPIRED` | `EXPIRED` | No confirmation within timeout window; terminal state |
| `REFUNDED` | `CANCELLED` (if order was in CONFIRMED/PREPARING/READY) | Pre-completion refund: triggers refund flow; `cancellationReason: REFUND` |
| `REFUNDED` | `COMPLETED` (unchanged) | Post-completion refund: `Order.status` stays `COMPLETED`; only `Payment.status → REFUNDED`; credit note generated; `AuditLog` records `REFUND` |

> **Kitchen visibility gate:** An order is pushed to kitchen when and only when `Payment.status → SUCCESS` (digital) or cashier taps [Confirm] (`PENDING_CASH → SUCCESS`). `Order.status` alone is not the gate — two different `PENDING` orders (Midtrans vs cash) exist simultaneously but only the one confirmed moves to kitchen. Never use `Order.status = PENDING` as a kitchen display filter.
>
> **`FAILED → CANCELLED` rationale (not `EXPIRED`):** A payment failure means the order was attempted but the customer's payment was rejected by Midtrans. This is a deliberate termination from the customer's perspective, not a timeout. Analytics must distinguish: use `cancellationReason = PAYMENT_FAILED` in `OrderEvent` to separate payment failures from merchant cancellations in reporting.

**Idempotency rule — use atomic update, not a read-then-write:**
```sql
UPDATE "Order" SET status = 'CONFIRMED' WHERE id = $orderId AND status = 'PENDING'
-- check affectedRows: if 0, webhook is duplicate → log and return HTTP 200 immediately
```
A plain read-then-write (`SELECT` status → `UPDATE` if PENDING) has a race condition under concurrent Midtrans retries: two workers can both read `PENDING` before either writes `CONFIRMED`. The atomic `WHERE status = 'PENDING'` clause is the correct guard. This prevents duplicate kitchen pushes even under concurrent webhook delivery.

**Webhook handler transaction scope:** The full webhook handler must execute in a single DB transaction to prevent partial state:
```
BEGIN TRANSACTION
  1. INSERT or verify Payment row (unique constraint on midtransTransactionId for idempotency)
  2. UPDATE Order SET status = 'CONFIRMED' WHERE id = $orderId AND status = 'PENDING'
     → if affectedRows = 0: webhook is duplicate; ROLLBACK; return HTTP 200
  3. For each OrderItem with stockCount set:
     UPDATE MenuItem SET stockCount = stockCount - qty WHERE id = $itemId AND stockCount >= qty
     → if any affectedRows = 0: mark OrderItem with ⚠️ stock-out flag (handled by cashier)
  4. INSERT OrderEvent(fromStatus: PENDING, toStatus: CONFIRMED, ...)
  5. INSERT AuditLog entry
COMMIT
```
If any step fails, the entire transaction rolls back — no partial state (confirmed order with unpaid payment, or decremented stock without confirmed order).

**Late webhook rule:** If a `SUCCESS` webhook arrives for an `EXPIRED` order, consult `MerchantSettings.lateWebhookWindowMinutes` (default: 60):
- If order expired **less than** the window ago → run revival checks (all must pass):
  1. Restaurant is **not** `SUSPENDED` or `CANCELLED`
  2. The table does **not** have a new `ACTIVE` `CustomerSession` (i.e. the table has not been reseated since this order expired)
  3. The original `CustomerSession` still exists and can receive the update
  - If checks 1–3 pass → **revive**: run the standard webhook transaction (ADR-010 scope): `Order.status → CONFIRMED`, stock decremented atomically with `UPDATE WHERE stockCount >= qty`. If any stock decrement returns `affectedRows = 0`, mark that `OrderItem` with ⚠️ and proceed — the substitution flow handles it at the table. Do not pre-check stock before the transaction (TOCTOU: stock could change between a pre-check and the atomic decrement). The atomic `WHERE stockCount >= qty` guard is correct by construction. Do NOT auto-refund for a stock-out on revival — the cashier may resolve it on the spot; Midtrans refunds take 2–14 days.
  - If checks 1–3 fail → **auto-refund** via Midtrans Refund API + notify merchant.
- If order expired **more than** the window ago → **auto-refund** regardless. Kitchen may be closed, items may be restocked.
- All late webhook events are logged in `AuditLog` with `action: LATE_WEBHOOK_REVIVAL` or `LATE_WEBHOOK_REFUND`.

### Canonical Payment.status Enum

```
PENDING       → payment initiated, awaiting Midtrans callback
PENDING_CASH  → cash order awaiting cashier confirmation
SUCCESS       → payment confirmed
FAILED        → payment declined
EXPIRED       → no confirmation within timeout window
REFUNDED      → payment reversed (full or partial)
```

### Merchant Account Status

```
TRIAL       → new account, subscription not yet purchased; limited features
ACTIVE      → subscription current and paid
SUSPENDED   → overdue payment (auto) or manual lock by FBQRSYS admin
CANCELLED   → merchant terminated; data retained for reporting
```

When status = `SUSPENDED`:
- `merchant-pos` login blocked (shows suspension notice with contact info)
- `merchant-kitchen` blocked for new logins; **existing logged-in sessions remain active** so in-flight orders can be completed
- Customer scanning a table QR sees: "This restaurant is temporarily unavailable. Please ask staff for assistance."
- `end-user-system` does NOT allow new sessions or new orders
- **Existing active orders continue to completion** — orders already `CONFIRMED` or `PREPARING` are not cancelled. Kitchen staff already logged in can mark them `READY` and `COMPLETED`. This prevents food waste and customer harm from an administrative action.
- New `CustomerSession` creation is blocked; existing `ACTIVE` sessions can view their order status but cannot place new orders
- **Pending payment during suspension:** If a merchant is suspended while a customer has an open Midtrans payment page (order in `PENDING`): when the `SUCCESS` webhook arrives, the system **auto-refunds** via Midtrans Refund API and logs `LATE_WEBHOOK_REFUND` — the order is never pushed to kitchen. The customer sees: "Payment refunded — restaurant is temporarily unavailable." A `PENDING_CASH` order in the same scenario is auto-cancelled (no Midtrans refund needed as no charge occurred).

---

## Pre-Invoice and Invoice

### Pre-Invoice
- Generated when customer proceeds to checkout (before payment)
- Contains: itemized order, quantities, unit prices, subtotal, tax (PPN 11%), service charge, total
- Shown on-screen in `end-user-system`
- Not a legal document — serves as order confirmation

### Invoice
- Generated after `Payment` is confirmed (Midtrans webhook)
- PDF rendered via `@react-pdf/renderer`
- Contains: invoice number, date, restaurant name + address, itemized order, tax, total, payment method, transaction ID
- Stored in Supabase Storage
- Accessible via a shareable URL (no login required to view your own invoice)
- Can be sent via WhatsApp link or email (future)

### Invoice Numbering
Format: `INV-{branchCode}-{YYYYMMDD}-{sequence}` — e.g. `INV-JKT1-20260309-0042`

- `branchCode` is a short 4-character code set when the Branch is created (e.g. `JKT1`, `BDG2`)
- Sequence resets daily **per branch** — each branch maintains its own counter
- For single-branch restaurants, `branchCode` defaults to the first 4 characters of the restaurant slug
- This prevents number collision when two branches issue invoices on the same day

### BranchCode generation rule

When a Branch is created, `branchCode` is auto-generated as follows:
1. Take the branch name, uppercase and strip spaces/punctuation → e.g. "Jakarta Selatan" → `JAKARTASELATAN`
2. Take the first 4 characters → `JAKA`
3. Check for uniqueness within the restaurant; if collision, take the first **3** characters and append an incrementing digit → `JAK2`, `JAK3`, `JAK4` (always 4 characters total). If all single-digit suffixes collide (unlikely), use `J10`, `J11`, etc.
4. Merchant can edit the `branchCode` at any time from branch settings (max 6 chars, alphanumeric, uppercase)
5. Editing `branchCode` does **not** renumber historical invoices — it only applies to new invoices from that point

### Invoice URL Security
Invoice PDFs are stored in Supabase Storage and accessed via **signed, expiring URLs** — not permanent public URLs.
- URL validity: 24 hours from generation
- Customer receives the URL immediately after payment; it is valid for the day
- Re-generation: calling the invoice endpoint again issues a fresh signed URL
- Rationale: invoice numbers are sequential and guessable; a permanent public URL would allow enumeration of all invoices

---

## Phase 2 Schema Scaffolding (Must Be in Phase 1 Prisma)

> **Non-breaking migrations are only possible if Phase 1 schema anticipates Phase 2 needs.** Adding a new nullable column to an existing table later is easy. Adding a new table with foreign keys to existing tables is also easy. But retrofitting a design (e.g. splitting a single-payment model into multi-payment) is a painful migration. This section lists every table and field that must exist in the Phase 1 Prisma schema even though the UI ships in Phase 2.

### Tables to create in Phase 1 Prisma (zero UI, just schema)

| Table | Phase 2 feature it enables | Notes |
|---|---|---|
| `MerchantApiKey` | Public REST API | Schema defined in Public API section above |
| `WebhookEndpoint` | Webhook subscriptions | Schema defined in Public API section above |
| `WebhookDeliveryLog` | Webhook delivery audit | Schema defined in Public API section above |
| `BranchMenuOverride` | Per-branch item availability | `(branchId FK, menuItemId FK, isAvailable bool)` — unique on `(branchId, menuItemId)` |
| `Reservation` | Table reservation system | `(id, branchId FK, tableId FK, guestName, guestPhone, partySize, scheduledAt, depositPaid bool, status: PENDING\|CONFIRMED\|CANCELLED\|SEATED\|NO_SHOW)` |
| `MerchantIntegration` | WhatsApp, Accurate, Jurnal.id | `(id, merchantId FK, type: WHATSAPP\|ACCURATE\|JURNAL\|CUSTOM, credentials JSON encrypted, isActive bool, createdAt)` — generic integration registry |
| `AnalyticsEvent` | Product analytics, funnel tracking | `(id, restaurantId FK, sessionId?, eventType, properties JSON, createdAt)` — append-only |
| `MerchantRequest` | In-app EOI for multi-branch | `(id, merchantId FK, type: MULTI_BRANCH, requestedBranches int, message, status: PENDING\|APPROVED\|REJECTED, reviewedByAdminId?, reviewedAt?, createdAt)` |
| `CronRunLog` | Cron job monitoring — silent failure detection | `(id, jobName, startedAt, completedAt?, status: SUCCESS\|FAILED\|PARTIAL, affectedRows?, errorMessage?)` — one row per cron invocation; used by `/api/health` to detect missed runs |

### Fields to add to existing tables in Phase 1 Prisma (nullable, no Phase 1 UI)

| Table | Field | Type | Phase 2 feature |
|---|---|---|---|
| `Merchant` | `onboardingStep` | int default 0 | Onboarding wizard state |
| `Merchant` | `onboardingChecklist` | JSON default `[]` | Setup checklist tracking |
| `Merchant` | `wizardCompletedAt` | datetime? | Onboarding analytics |
| `Staff` | `seenCoachMarks` | string[] default `[]` | In-app coach marks dismissed |
| `OrderItem` | `status` | enum? (`PENDING\|PREPARING\|READY`) nullable | Per-item kitchen status |
| `Order` | `depositRate` | decimal? | Booking deposit percentage |
| `Order` | `depositAmount` | int? | Deposit amount charged upfront |
| `Branch` | `platformStoreId` | string? | Delivery platform routing (already in spec) |
| `Restaurant` | `defaultStationId` | string? FK → KitchenStation | Default station for unrouted items (nullable — first station used if null) |

### Additional Fields Required in Phase 1 Prisma

> **These fields are documented in `docs/platform-owner.md` and `docs/merchant.md` but were missing from this file.** An agent writing the Step 2 Prisma schema from `data-models.md` alone would produce an incomplete schema without them. All are nullable so they add no migration risk.

#### Merchant model — additional fields

| Field | Type | Default | Source / Purpose |
|---|---|---|---|
| `emailVerifiedAt` | DateTime? | null | Set when merchant clicks email verification link (self-service registration). Until set, merchant cannot accept real orders (`apps/menu` endpoint checks this). See `docs/merchant.md` Self-Service Registration section. |
| `privacyConsentAt` | DateTime? | null | Timestamp of ToS + Privacy Policy acceptance at registration. PDP Law (UU No. 27/2022) compliance — store consent proof. |
| `taxId` | String? | null | NPWP — Indonesian tax ID (15-digit string). Required for Faktur Pajak on `MerchantBillingInvoice`. Phase 1: collect optionally; Phase 2: required for Enterprise billing. |
| `notes` | String? | null | Free-text notes added by FBQRSYS staff ("called Pak Budi, away until March 15"). Admin-facing only; never shown to merchant. |
| `assignedToAdminId` | String? FK → SystemAdmin | null | Which FBQRSYS staff member is managing this merchant account. Enables "My merchants" filter in FBQRSYS. |
| `referralCode` | String? | auto-generated unique | Shareable referral code shown in merchant settings. When another merchant registers using this code, both get 1 month free on activation. Unique index required. |
| `referredByMerchantId` | String? FK → Merchant (self) | null | ID of the merchant who referred this one. Set at registration if referral code was provided. |
| `cancellationReason` | String? | null | Populated from the mandatory cancellation exit survey when merchant cancels subscription. Enum-like values: `TOO_EXPENSIVE`, `NOT_ENOUGH_FEATURES`, `FOUND_ALTERNATIVE`, `RESTAURANT_CLOSED`, `TECHNICAL_ISSUES`, `JUST_TESTING`. Gold data for product decisions. |

#### Customer model — additional fields

| Field | Type | Default | Source / Purpose |
|---|---|---|---|
| `privacyConsentAt` | DateTime? | null | Timestamp of consent at customer registration. PDP Law compliance. |
| `deletionRequestedAt` | DateTime? | null | Set when customer requests data deletion (right to erasure under PDP Law). Triggers a 30-day cleanup job. Customer PII must be deleted within 30 days of this date. |

#### MerchantSubscription model — additional fields (required for billing cron, Step 6)

| Field | Type | Default | Source / Purpose |
|---|---|---|---|
| `reminderSentAt` | DateTime? | null | Timestamp when the 7-day renewal reminder email was sent. Guards against double-sending (cron idempotency). |
| `reminderSentAt3d` | DateTime? | null | Timestamp when the 3-day renewal reminder email was sent. Separate field from `reminderSentAt` — both reminders must be tracked independently. |
| `failedAttempts` | Int | 0 | Count of consecutive payment failures on renewal. When `failedAttempts >= gracePeriodDays`, the billing cron auto-suspends the merchant. Resets to 0 on successful renewal. |
| `lastRenewalAt` | DateTime? | null | Timestamp of the last successful renewal. Used in revenue reporting and churn detection. |
| `gracePeriodDays` | Int | 3 | Number of consecutive daily payment failures before auto-suspension. Configurable per merchant (Enterprise accounts may get longer grace periods). |

#### MerchantBillingInvoice model — additional fields (required for billing cron, Step 6)

| Field | Type | Notes |
|---|---|---|
| `status` | enum: `PENDING \| PAID \| OVERDUE \| CANCELLED` | `PENDING` = invoice created, awaiting payment; `PAID` = confirmed paid; `OVERDUE` = past due date, merchant in grace period; `CANCELLED` = voided (e.g. plan change). Required for billing dashboard filtering. |
| `periodStart` | DateTime | Subscription period start date. Together with `merchantId`, forms the unique constraint `(merchantId, periodStart)` — prevents duplicate invoices from idempotent cron runs. |

### Why these specific items

**`BranchMenuOverride`** — without this stub, adding per-branch availability in Phase 2 requires modifying `MenuItem` (adding nullable branchId FK) which would change how all Phase 1 menu queries work. A separate junction table is the clean, non-breaking addition.

**`Reservation`** — the foreign keys to `Table` and `Branch` must exist in the schema before Phase 1 data accumulates. Adding them later requires migrating existing rows. Creating the table now with no data is costless.

**`MerchantIntegration`** — a generic integration registry means adding WhatsApp, Accurate Online, and Jurnal.id in Phase 2 is just inserting a row with a different `type`. Without this, each integration gets its own table, which fragments the schema.

**`OrderItem.status`** — nullable in Phase 1, populated in Phase 2. Adding this column to a table with millions of rows in Phase 2 would require a long migration. Stub it now while the table is empty.

**`Merchant.onboardingStep` / `onboardingChecklist`** — the wizard itself is a Phase 3 feature (Step 7), but the schema field must exist in Phase 1 Prisma because it will be read/written from the first day Step 7 ships. Adding a column to a Merchant table that already has thousands of rows is a large migration; stub it now while the table is empty. Already included in the Merchant Onboarding section above — listed here for completeness.

---

## Database Indexing Strategy

Define these indexes at migration time (Step 2). Missing indexes on these tables will cause slow queries at scale.

| Table | Index | Reason |
|---|---|---|
| `Order` | `(branchId, createdAt DESC)` | Dashboard date-range queries |
| `Order` | `(status)` | Filtering active orders for kitchen display |
| `Order` | `(customerSessionId)` | Fetching all orders for a session |
| `Order` | `(idempotencyKey)` — unique partial (WHERE NOT NULL) | Client-side duplicate prevention on Place Order |
| `Payment` | `(orderId)` | Join from Order to Payment |
| `Payment` | `(midtransTransactionId)` — unique | Idempotency guard; DB-level duplicate prevention |
| `CustomerSession` | `(tableId, status)` | Finding active session for a table |
| `CustomerSession` | `(sessionCookie)` | Cookie-based session lookup on page load |
| `MenuItem` | `(categoryId, isAvailable, deletedAt)` | Menu render query |
| `OrderItem` | `(orderId)` | Fetching items for an order |
| `OrderItem` | `(kitchenStationId, kitchenPriority)` | Kitchen display per-station query |
| `AuditLog` | `(restaurantId, createdAt DESC)` | Merchant audit log viewer |
| `QueueCounter` | `(branchId, date)` — unique | Counter lookup + lock |

---

## Basic Fraud & Rate Limit Rules

These are enforced server-side on API routes, not client-side.

| Rule | Value | Where enforced |
|---|---|---|
| Max `PENDING` orders per `CustomerSession` at one time | 3 (configurable per merchant) | Order creation API |
| Max cart items per order | 20 items | Order creation API |
| Max order value per order | Rp 5,000,000 (configurable) | Order creation API |
| Max `CustomerSession` per table per hour | 5 | Session creation API |
| QR `sig` token expiry | 24 hours | QR validation middleware |
| Rate limit on menu API | 60 req/min per IP | Edge middleware |
| Order creation idempotency | `idempotencyKey` (UUID) generated client-side | Order creation API |

> **Note:** These are starting defaults. Merchants can adjust `maxPendingOrders` and `maxOrderValue` from `MerchantSettings`. FBQRSYS can override limits for Enterprise accounts.

> **Order creation idempotency:** The client generates a UUID `idempotencyKey` before the "Place Order" request. If the user double-taps or the request is retried due to network error, the server returns the existing `Order` record for that key rather than creating a duplicate. The key is stored on the `Order` record and indexed. Expires after 24 hours (stale keys are not reused).

---

## Menu Caching Strategy

The menu endpoint (`GET /api/menu/{restaurantId}`) is the highest-traffic read in the system. Caching is mandatory at launch.

- **Cache layer:** Vercel Edge Cache (built-in with Next.js `fetch` cache)
- **Cache key:** `restaurantId:branchId:locale` — **branchId is included from day one** because Phase 2 `BranchMenuOverride` makes menu responses branch-specific. Using `restaurantId + locale` as the key would be a breaking cache invalidation change in Phase 2; including `branchId` now is a zero-cost Phase 1 decision.
- **TTL:** 5 minutes
- **Invalidation:** When a merchant saves any menu change (category, item, branding, or branch override), call `revalidatePath` to purge the cache immediately. Invalidation must be scoped to the affected branch when a BranchMenuOverride changes (not the whole restaurant).
- **What is cached:** Full menu JSON (categories + items + branding, with branch-specific availability applied) — the entire payload for the customer app on first load
- **What is NOT cached:** Order status, table status, session state — these are always real-time

---

## Seed Script Specification

The seed script (`packages/database/prisma/seed.ts`) must create the following on first run:

1. **First FBQRSYS SystemAdmin** — credentials from environment variables:
   ```
   FBQRSYS_ADMIN_EMAIL=admin@fbqr.app
   FBQRSYS_ADMIN_PASSWORD=<set before first deploy>
   ```
   Creates a `SystemAdmin` record with a `SystemRole` holding all FBQRSYS permissions (equivalent to "Platform Owner" template). **This password must be changed on first production login.** The seed is idempotent — re-running when the admin already exists is a no-op (upsert by email).

2. **Demo merchant** (development only, skipped in `NODE_ENV=production`):
   - One `Merchant` + `Restaurant` + `Branch` + sample menu categories/items
   - One `Staff` account (PIN: 1234) for testing kitchen display
   - Table QR tokens pre-generated so local testing doesn't require Midtrans
   - `Merchant.status = TRIAL`, `trialEndsAt = NOW() + 14 days`

3. **Default SubscriptionPlan rows** — Starter, Pro, Enterprise tiers with placeholder pricing (edit from FBQRSYS UI after first deploy).

---

## Key Conventions

- **Currency:** All prices stored as integers in **IDR (Rupiah)** — no decimals. All money-bearing models (`Order`, `Payment`, `MenuItem`, `SubscriptionPlan`, `MerchantBillingInvoice`) include a `currency` field (string, 3 chars, default `"IDR"`). This is set to `"IDR"` on every record today and is never displayed to Indonesian customers, but its presence makes multi-currency expansion a schema change of `DEFAULT` value only — not a breaking migration. Treat this field as infrastructure scaffolding, not a live feature.
- **Timezone:** Default to `Asia/Jakarta` (WIB, UTC+7).
- **Language:** UI defaults to Bahasa Indonesia. Build with i18n hooks (`next-intl`) for future global expansion.
- **Images:** Upload to Supabase Storage. Store only the path/URL in the DB. **Image optimization is mandatory for customer-facing UI:** smartphone photos can exceed 5MB; loading a Grid layout with 20 unoptimized images would consume 100MB+ on Indonesian 4G and destroy conversion rates.
  - All customer-facing image display (`apps/menu`) must use Next.js `next/image` component — never `<img>` tags. `next/image` auto-serves WebP/AVIF, applies lazy loading, and prevents layout shift.
  - At upload time, apply server-side compression: max 800×800px, WebP format, quality 80. Use either a Supabase Edge Function triggered on Storage upload or a background job. The stored URL should point to the compressed version.
  - Supabase Image Transformation (`?width=800&format=webp`) is an acceptable alternative for serving if transformation-on-the-fly is preferred over upload-time processing.
- **Real-time:** Use Supabase Realtime for order events. Do not poll — subscribe.
- **QR tokens:** Each table has a unique, non-guessable token (UUID). Rotating tokens invalidates old QR prints, so rotate only intentionally.
- **Soft deletes:** Use `deletedAt` timestamps rather than hard deletes for menu items, orders, staff, and promotions (important for historical reporting).
- **Audit log:** All state-changing mutations must write to `AuditLog`. Use a shared `auditLog()` helper — never write audit entries inline.
- **Price snapshots:** When an order is placed, copy item name, price, variants, and add-ons directly into `OrderItem`. Never join back to `MenuItem` for order history — prices change.
- **Permissions check:** All API routes and server actions must call `requirePermission(session, 'permission:key')` before mutating data.
- **No `.env` in git:** Add `.gitignore` before first code commit.
