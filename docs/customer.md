# Customer (End-User System) Reference

> **For AI agents building Steps 12–17 and Step 25** (`apps/menu`).
> This document extracts every spec relevant to the customer-facing QR ordering app.
> Source of truth: `CLAUDE.md`. If anything here contradicts `CLAUDE.md`, `CLAUDE.md` wins.

---

## App Overview

`apps/menu` is a **browser-based, zero-install** menu and ordering app accessible by scanning a QR code at a restaurant table. It implements the **end-user-system** sub-system.

- URL pattern: `https://menu.fbqr.app/{restaurantId}/{tableId}?token={tableToken}&sig={sig}&exp={exp}`
- No login required — anonymous QR sessions are first-class
- Customer login is optional (unlocks loyalty points + order history)
- Mobile-first: primary target 375–430px (iPhone SE → iPhone 15 Pro Max)

---

## Complete QR Flow (9 Sections)

### 1. Customer Scans QR

The physical table QR code encodes a redirect URL: `https://menu.fbqr.app/r/{tableToken}`

```
Customer scans QR
    │
    ▼
Redirect handler: https://menu.fbqr.app/r/{tableToken}
    Validates token, generates 24h signed URL (ADR-015)
    │
    ▼
URL: https://menu.fbqr.app/{restaurantId}/{tableId}?token={tableToken}&sig={sig}&exp={exp}
    │
    ▼
Server validates:
  - sig = HMAC-SHA256(tableToken + ":" + exp, process.env.QR_SIGNING_SECRET) and exp > now
  - Token matches table record
  - Restaurant status = ACTIVE (not SUSPENDED or CANCELLED)
  - Table status ≠ CLOSED
  - Table status ≠ RESERVED
  - Table status ≠ DIRTY  (only enforced when MerchantSettings.enableDirtyState = true)
    │
    ├── Invalid/expired sig → redirect to /r/{tableToken} to get a fresh signed URL
    ├── Invalid token → show error: "This QR code is invalid. Please ask staff."
    ├── Restaurant SUSPENDED → show: "This restaurant is temporarily unavailable."
    ├── Table RESERVED → show: "This table is reserved. Please ask staff."
    ├── Table DIRTY → show: "This table is being prepared. Please ask staff."
    └── Valid → create or resume CustomerSession → load branded menu
```

**Redirect handler spec (5 steps):**
1. Lookup `Table` by `tableToken` — return human-friendly HTML error page (not JSON 4xx) for blocked states
2. Get `restaurantId` and `tableId` via `Table → Branch → Restaurant`
3. Generate `expiryTimestamp = now + 24h` (Unix seconds)
4. Generate `sig = HMAC-SHA256(tableToken + ":" + expiryTimestamp, process.env.QR_SIGNING_SECRET)`
5. Redirect (HTTP 302) to: `https://menu.fbqr.app/{restaurantId}/{tableId}?token={tableToken}&sig={sig}&exp={expiryTimestamp}`

The menu app validates on load: `sig` must match and `exp` must be in the future. Invalid/expired requests redirect back to `/r/{tableToken}` — legitimate customers are never permanently locked out.

### 2. Menu Experience

- Restaurant branding (colors, logo, font) applied via CSS variables on first load — within 50ms (no flash of unstyled menu)
- Menu layout rendered per restaurant default + per-category overrides
- **Dietary / allergen badges** shown per item: Halal ✅, Vegetarian 🌿, Vegan 🌱, Contains Nuts ⚠️, Dairy ⚠️, Spicy 🌶️
- **Out-of-stock items** shown greyed out with "Habis" label — not orderable
- **AI recommendations** shown if enabled: bestsellers highlighted, time-appropriate items surfaced
- **Category time windows**: categories with `availableFrom`/`availableTo` only appear during their window (e.g. "Sarapan" only shows 06:00–11:00); all times compared in Asia/Jakarta (WIB)
- Search bar available in List layout and optionally in others
- Estimated prep time shown per item (optional, if merchant sets it)

### 3. Building the Cart

- Tap item → item detail modal (image, description, variants, add-ons, allergens) as a **bottom sheet** on mobile (slides up from bottom — matches native app patterns)
- Select variant (required if variants exist) → select add-ons (optional)
- Add to cart → sticky cart bar updates at bottom of screen
- Can adjust quantities in cart or remove items
- Upsell prompt shown if `aiUpsell` enabled ("Tambah minuman?" at appropriate moment)
- Cart is **client-side state only** — no server round-trip before the customer places an order

### 4. Checkout

- Customer reviews cart → pre-invoice shown (itemized + tax + service charge + total)
- Optional: customer logs in / creates account to earn loyalty points
- If merchant loyalty enabled and customer is logged in: redeemable points shown + option to apply discount
- Select payment method (merchant-configured: QRIS default, others optional)
- **QRIS payment:** Midtrans generates QR → customer scans with e-wallet
- **Non-QRIS:** redirect to Midtrans hosted payment page
- **PAY_AT_CASHIER mode:** customer submits order → alert sent to cashier → cashier confirms → kitchen receives order

### 5. Post-Payment (Customer View)

```
Payment confirmed (Midtrans webhook)
    │
    ▼
Customer sees: "Pesanan diterima! 🎉"
Order tracking screen shows:
  ├── Order summary (items ordered)
  ├── Live status indicator: CONFIRMED → PREPARING → READY
  ├── Invoice download link (PDF)
  └── [Call Waiter] button (always available)
    │
    ▼
Status updates pushed via Supabase Realtime — customer page updates without refresh
    │
    ▼
Status = READY → banner: "Pesanan siap! Silakan ambil." or "Pelayan akan segera mengantarkan."
    │
    ▼
Customer can [Add More Items] → new items go to same table session, create a new Order record
```

**Note on READY notification:** Phase 1 — accept the gap that browser tab may be closed. Display banner at checkout: "Pelayan akan mengantarkan pesanan Anda. Tidak perlu menunggu di layar ini." Phase 2: WhatsApp notification.

### 6. Call Waiter Feature

Three distinct request types as separate buttons:

| Button label | `WaiterRequest.type` | Staff UI behaviour |
|---|---|---|
| [ Panggil Pelayan ] | `CALL` | Alert on merchant-pos: "Table 5 calls waiter" |
| [ Butuh Bantuan ] | `ASSISTANCE` | Alert: "Table 5 needs assistance" + optional free-text message |
| [ Minta Struk / Bill ] | `BILL` | Alert: "Table 5 requests bill" + shows current session total to approaching waiter |

- All three create a `WaiterRequest` record
- Push real-time notification to merchant-pos floor view via Supabase Realtime
- `BILL` type fetches the current session `grandTotal` from confirmed orders and attaches it to the alert
- Staff marks request as resolved (`resolvedAt` set)
- Auto-resolved when the CustomerSession closes

### 7. Multi-Order Sessions

- Customers can place multiple orders per table session (mains, then later dessert)
- Each "Add More Items" creates a new `Order` linked to the same `CustomerSession`
- All orders from the same session visible together on the order tracking screen
- Kitchen sees all orders grouped by table

### 8. Session End

A `CustomerSession` moves to `COMPLETED` when:

| Trigger | Who/What | Resulting Table status |
|---|---|---|
| Staff taps "Close Table" in merchant-pos | Staff | DIRTY (if `enableDirtyState = true`) or AVAILABLE |
| Session inactivity timeout (`tableSessionTimeoutMinutes`) | System (cron) | DIRTY or AVAILABLE |
| FBQRSYS admin closes the session | Platform admin | AVAILABLE (no DIRTY) |

A session does **not** auto-complete when an order is `COMPLETED` — customers may order again within the same session.

### 9. CustomerSession State Transitions

```
[QR scan]
    │
    ▼
ACTIVE ──────────────────────────────────────────────────────┐
    │
    ├── Staff closes table → COMPLETED → Table: DIRTY or AVAILABLE
    │
    ├── Session TTL expires (default: 2h of inactivity) → EXPIRED → Table: DIRTY or AVAILABLE
    │
    └── Restaurant suspended mid-session → session preserved
        but new orders blocked; existing orders continue on tracking screen
```

**IMPORTANT — WaiterRequest synchronous auto-resolve (Ghost Waiter prevention):**

Whenever the API sets `CustomerSession.status` to `COMPLETED` or `EXPIRED`, the **same DB transaction** must also resolve all open WaiterRequests for that table:

```sql
-- Inside the session-close transaction:
UPDATE "WaiterRequest"
SET "resolvedAt" = NOW()
WHERE "tableId" = :tableId AND "resolvedAt" IS NULL
```

**Do not rely on the nightly cron for this.** If Table 5 closes at 19:00 and a new customer sits down at 19:30, unresolved WaiterRequests from the previous session would ghost on the merchant-pos until 01:00 WIB. The cron in `docs/platform-owner.md` is leak-recovery only — a fallback for edge cases (server crash, uncaught exception) not the primary mechanism.

---

## CustomerSession Model

```
CustomerSession
  id              string    UUID PK
  restaurantId    string    FK → Restaurant
  tableId         string    FK → Table
  customerId      string?   FK → Customer (set when customer authenticates during session)
  status          enum      ACTIVE | COMPLETED | EXPIRED
  sessionCookie   string    Unique; stored client-side as httpOnly cookie (fbqr_session_id)
  ipAddress       string    Client IP at session creation
  userAgent       string    Browser/device fingerprint
  deviceHash      string?   Optional hashed device identifier (fraud detection)
  createdAt       datetime
  expiresAt       datetime? Set by TTL
```

### Session Cookie Behaviour (ADR-011)

On QR scan, a `fbqr_session_id` cookie is set (`httpOnly`, scoped to `menu.fbqr.app`). On subsequent page loads (including refresh), the server checks for this cookie.

**Critical — the session resume query MUST include the table guard:**
```sql
SELECT * FROM CustomerSession
WHERE id = $cookieValue
  AND tableId = $scannedTableId   -- REQUIRED: prevents cross-table session leakage
  AND status = 'ACTIVE'
```

Without the `tableId` guard, a customer moving from Table 5 to Table 8 would resume the Table 5 session — orders would be routed to the wrong table.

**Post-expiry read access:** When a `CustomerSession` moves to `EXPIRED`, the `fbqr_session_id` cookie continues to grant **read-only access** to that session's `Order` rows. The customer can view order status and download their invoice without re-scanning. Write operations (place new order, call waiter) are rejected with "Your session has ended."

### Edge Cases

| Scenario | Behaviour |
|---|---|
| Customer refreshes page | Session cookie re-links to existing ACTIVE session — no new QR scan required |
| Two phones scan same QR simultaneously | Second scan resumes the same ACTIVE session — one session per table at all times (ADR-009) |
| Session TTL expires while order is PREPARING | Session → EXPIRED; table → DIRTY/AVAILABLE; existing orders in CONFIRMED/PREPARING/READY are **not** affected — they continue to completion in the kitchen. Customer's order tracking screen continues to show live status via the order ID. |
| Restaurant suspended while session ACTIVE | New orders blocked with "Restaurant unavailable"; customer can still view existing order status |
| Token rotation (staff closes session) | Old session → COMPLETED; old token immediately invalid; new token issued on next scan; in-flight PENDING orders of the old session auto-cancelled |

---

## Order Status Lifecycle

> **Single source of truth:** `docs/data-models.md` owns the authoritative Order Status Lifecycle diagram, all valid state transitions, invalid transitions, and the Payment → Order Status Mapping table. **Do not duplicate or deviate from that state machine here.** If you are implementing order status logic, read `docs/data-models.md` first.

**Three paths from `PENDING → CONFIRMED`:**
1. **Midtrans webhook** (`paymentMode = PAY_FIRST`) — Midtrans callback confirms payment; webhook handler atomically sets Order → CONFIRMED + Payment → SUCCESS in one DB transaction.
2. **Cashier confirms** (`paymentMode = PAY_AT_CASHIER`) — cashier taps [Mark as Paid] in the Close Register UI. Paired Payment had `status = PENDING_CASH`. See `docs/platform-owner.md` § EOD PENDING_CASH Cleanup for the full cashier flow.
3. **Late webhook revival** — a Midtrans SUCCESS webhook arrives after the order timed out to EXPIRED. If all revival conditions pass (see § Late Webhook Handling below), the order is revived to CONFIRMED. See also `docs/architecture.md` ADR-025.

> **`PENDING_CASH` is a Payment status, not an Order status.** While awaiting cashier confirmation, the Order stays `PENDING` and its paired Payment is `PENDING_CASH`. The shorthand "PENDING_CASH order" means "an Order with a PENDING_CASH Payment."

### When is an Order Row Created?

**PAY_FIRST mode:** Customer taps "Place Order" → `Order` created (`PENDING`) + `Payment` created (`PENDING`) → Midtrans `snap_token` issued → customer pays → Midtrans webhook → `Order.status → CONFIRMED`.

**PAY_AT_CASHIER mode:** Customer taps "Place Order" → `Order` created (`PENDING`) + `Payment` created (`PENDING_CASH`) → cashier confirms → `Order.status → CONFIRMED`.

**Abandoned carts** (customer opens menu but never taps "Place Order") do NOT create `Order` rows — they are client-side state only.

### Order Model Fields (customer-relevant)

| Field | Type | Notes |
|---|---|---|
| `id` | string | UUID |
| `customerSessionId` | string | FK → CustomerSession |
| `branchId` | string | FK → Branch |
| `orderType` | enum | `DINE_IN \| TAKEAWAY \| DELIVERY` |
| `status` | enum | See lifecycle above |
| `queueNumber` | int | Auto-increments per branch per day; ALL order types get a number; resets at midnight WIB |
| `confirmedAt` | datetime? | Set in same DB transaction as status → CONFIRMED; used for kitchen elapsed timer |
| `idempotencyKey` | string? | Client-generated UUID; prevents duplicate orders on double-tap or retry; unique index; expires 24h |
| `subtotal` | int | Sum of line totals (IDR) |
| `taxAmount` | int | Computed at checkout time |
| `serviceChargeAmount` | int | Computed at checkout time |
| `grandTotal` | int | Final charged amount |
| `customerNote` | string? | Max 200 chars; free-text special request ("no MSG", "extra spicy", "allergy: shrimp"); shown on kitchen card and order tracking screen |
| `platformName` | string? | `GRABFOOD \| GOFOOD \| SHOPEEFOOD` for delivery orders |
| `platformOrderId` | string? | External delivery platform reference |

### Idempotency Rule

The client generates a UUID `idempotencyKey` before "Place Order". If user double-taps or network retries, the server returns the existing `Order` record for that key rather than creating a duplicate. Key stored on `Order` record with unique index. Expires after 24h.

---

## Order Flow Diagram

```
[CUSTOMER]
Scans QR → menu loads (branded, layout configured) → builds cart
    │ AI recommendations shown (bestsellers, upsell, personalized, time-based)
    ▼
Item detail → select variant + add-ons → add to cart
    │
    ▼
Pre-invoice (itemized + tax + service charge) → optional loyalty redemption
    │
    ▼
Payment via Midtrans QRIS (or other method if configured)
    │
    ▼
[FBQR API]
Midtrans webhook → Order status → CONFIRMED → Invoice PDF generated

[KITCHEN]
Supabase Realtime push → order appears on merchant-kitchen display
Kitchen reorders item priority → marks PREPARING → marks READY

[CUSTOMER]
Live status updates on order tracking screen → PREPARING → READY notification
    │
    ▼
Customer may [Add More Items] → new Order → same flow
Customer may [Call Waiter] → WaiterRequest created → notified on merchant-pos
```

---

## QR Order Security

### Primary Defence: Payment Confirms Order

An order does not reach the kitchen until Midtrans confirms payment.

- Customer submits cart → `Order` created (`PENDING`) → kitchen does NOT see this
- Customer pays → Midtrans webhook → FBQR verifies → `Order.status → CONFIRMED` → pushed to kitchen
- If no webhook within `paymentTimeoutMinutes` → `Order → EXPIRED` (auto-expiry cron)

**A saved QR code gives someone access to the ordering UI — but they still have to pay real money for any order to be processed.**

### Webhook Idempotency (Atomic Update)

```sql
UPDATE "Order" SET status = 'CONFIRMED' WHERE id = $orderId AND status = 'PENDING'
-- affectedRows = 0 → duplicate webhook → return HTTP 200 immediately
```

Never use read-then-write — the `WHERE status = 'PENDING'` atomic clause prevents duplicate kitchen pushes under concurrent webhook delivery.

### Webhook Handler Transaction Scope

The full webhook handler executes in one DB transaction:
1. INSERT or verify Payment row (unique constraint on `midtransTransactionId`)
2. UPDATE Order status to CONFIRMED (atomic WHERE clause)
3. Decrement `MenuItem.stockCount` atomically (`WHERE stockCount >= qty`)
4. INSERT OrderEvent
5. INSERT AuditLog entry

If any step fails → full rollback.

### Secondary Defences

| Defence | How it works |
|---|---|
| Token rotation on session close | Old QR token immediately invalid; in-flight PENDING orders auto-cancelled |
| Session expiry | CustomerSession TTL rejects new orders even with valid token |
| Short-lived signed session token | `sig = HMAC-SHA256(tableToken + expiry, process.env.QR_SIGNING_SECRET)` — expires 24h; static QR via redirect issues fresh sig |
| Token scoped to table + restaurant | Only works for one specific table at one restaurant |
| Rate limiting per session | Max N PENDING orders per CustomerSession at one time (default: 3, configurable) |
| Midtrans webhook signature verification | All webhook calls verified via SHA512 signature |
| Server-side key isolation | `MIDTRANS_SERVER_KEY` server-only; client only receives one-time `snap_token` |

---

## Pre-Invoice Computation

Pre-Invoice is **computed on-the-fly** at checkout and returned in the API response. It is **not stored** as a separate DB record — the `Order` model fields serve this purpose.

### Computation (default: `pricesIncludeTax = false`)

```
serviceCharge = round(subtotal × serviceChargeRate)
taxBase       = taxOnServiceCharge ? (subtotal + serviceCharge) : subtotal
tax           = round(taxBase × taxRate)
grandTotal    = subtotal + serviceCharge + tax
```

Apply `roundingRule` to `grandTotal` before displaying and charging:
- `NONE` — exact integer
- `ROUND_50` — nearest 50 IDR
- `ROUND_100` — nearest 100 IDR (recommended for cash merchants)

Raw (unrounded) values stored in DB for reconciliation.

### Tax-Inclusive Prices (`pricesIncludeTax = true`)

```
taxAmount = round(price × taxRate / (1 + taxRate))  ← back-calculated
grandTotal = subtotal (prices already include tax — no addition needed)
```

### Customer-Facing Display

Pre-invoice shown to customer at checkout before payment:
- Itemized list (name, quantity, unit price, line total)
- Subtotal
- Service charge (if applicable)
- Tax / PPN
- **Grand Total** (prominently, rounded if applicable)

For `BY_WEIGHT` items: `"Kepiting Saus Padang — Deposit Rp 50.000 (harga akhir ditentukan setelah ditimbang)"`

---

## Payment Gateway (Midtrans)

### Fee Structure (for merchant reference)

| Method | Fee |
|---|---|
| QRIS | 0.7% (recommended — covers all e-wallets via one QR) |
| GoPay / OVO / DANA | 2% |
| Virtual Account | Rp 4,000 flat per transaction |
| Credit/Debit Card | ~2.9% |

Default payment method: **QRIS**. Merchants configure which methods to offer.

### Midtrans Snap Integration — Client-Side Mode Decision

**Use Snap redirect (full page redirect), NOT Snap popup (JavaScript overlay).**

Reasoning:
- Snap popup requires loading Midtrans' `snap.js` inline on the page and calling `window.snap.pay(snapToken)`. On iOS Safari, this triggers a CSP (Content Security Policy) cross-origin script warning that blocks popup display for users with strict browser security settings.
- Snap redirect is universally reliable: redirect to `https://app.sandbox.midtrans.com/snap/v2/vtweb/{snap_token}` — Midtrans handles the payment UI, then redirects back to `finish_redirect_url` after completion.
- The redirect approach works on all browsers, all devices, including WeChat in-app browser (common on Indonesian Android).

**Implementation (Step 15):**

```ts
import { formatInTimeZone } from 'date-fns-tz'

// 1. Server: create Snap token via Midtrans API
const snapResponse = await midtransSnap.createTransaction({
  transaction_details: {
    order_id: order.id,
    gross_amount: order.grandTotal,
  },
  custom_expiry: {
    // Midtrans requires "YYYY-MM-DD HH:mm:ss Z" format, NOT ISO 8601 / toISOString()
    // toISOString() outputs "2026-03-12T15:21:44.000Z" which Midtrans rejects or
    // misinterprets as UTC, causing expiry-sync mismatch with the WIB-based cron.
    order_time: formatInTimeZone(order.createdAt, 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss xx'),
    expiry_duration: merchantSettings.paymentTimeoutMinutes,
    unit: 'minute',
  },
  callbacks: {
    finish: `${process.env.NEXT_PUBLIC_MENU_APP_URL}/${restaurantId}/${tableId}/order/${order.id}?status=finish`,
    error:  `${process.env.NEXT_PUBLIC_MENU_APP_URL}/${restaurantId}/${tableId}/order/${order.id}?status=error`,
    pending:`${process.env.NEXT_PUBLIC_MENU_APP_URL}/${restaurantId}/${tableId}/order/${order.id}?status=pending`,
  },
})
// Return snapToken and redirectUrl to client
return { snapToken, redirectUrl: snapResponse.redirect_url }

// 2. Client: redirect to Midtrans payment page
window.location.href = redirectUrl
```

After payment, the customer is redirected back to the order tracking page. The `status` query param from Midtrans is for UI display only — **never trust it for order confirmation**. The authoritative confirmation is the server-side webhook.

### Midtrans Webhook — Signature Verification (MANDATORY)

Every webhook request from Midtrans **must** be verified before processing. An unverified webhook is a critical security hole — any attacker could forge a `SUCCESS` notification for an unpaid order.

**Verification algorithm:**

```ts
import crypto from 'crypto'

function verifyMidtransWebhook(notification: MidtransNotification): boolean {
  // Midtrans signature = SHA512(orderId + statusCode + grossAmount + MIDTRANS_SERVER_KEY)
  const raw = `${notification.order_id}${notification.status_code}${notification.gross_amount}${process.env.MIDTRANS_SERVER_KEY}`
  const expectedSignature = crypto.createHash('sha512').update(raw).digest('hex')
  return notification.signature_key === expectedSignature
}

// In webhook handler — FIRST THING before any DB interaction:
export async function POST(req: Request) {
  const notification = await req.json()
  if (!verifyMidtransWebhook(notification)) {
    console.warn('Invalid Midtrans webhook signature', { orderId: notification.order_id })
    return new Response('Forbidden', { status: 403 })
  }
  // ... process notification
}
```

### Midtrans Transaction Status → Payment/Order Status Mapping

Midtrans sends different `transaction_status` values. Map them correctly:

| Midtrans `transaction_status` | Midtrans `fraud_status` | Action |
|---|---|---|
| `settlement` | any | `Payment → SUCCESS`, `Order → CONFIRMED` ← **this is the main success event** |
| `capture` | `accept` | `Payment → SUCCESS`, `Order → CONFIRMED` ← credit card payment |
| `capture` | `challenge` | Hold — notify merchant; do not confirm yet; wait for Midtrans manual review |
| `pending` | any | No action — payment page opened but not completed; poll or wait for next webhook |
| `deny` | any | `Payment → FAILED`, `Order → CANCELLED` (cancellationReason: PAYMENT_FAILED) |
| `cancel` | any | `Payment → FAILED`, `Order → CANCELLED` |
| `expire` | any | `Payment → EXPIRED`, `Order → EXPIRED` |
| `refund` | any | `Payment → REFUNDED`; Order status per refund rules (see data-models.md) |

> **Critical:** Do NOT only handle `success` — that status does not exist. The actual payment confirmation comes as `settlement` (most methods) or `capture` (credit cards). An agent that checks for `transaction_status === 'success'` will miss all real payments.

### Order Expiry and Midtrans `custom_expiry` Sync

Set `custom_expiry` in the Snap token creation to match `MerchantSettings.paymentTimeoutMinutes`. This ensures Midtrans expires its own payment session at the same time the FBQR order-expiry cron expires the order:

- If customer abandons: Midtrans sends `expire` webhook → order-expiry cron also fires → both set EXPIRED (idempotent, whichever arrives first wins via `WHERE status = 'PENDING'` atomic guard).
- If there's a mismatch (e.g. Midtrans expires at 15 min, cron runs at 20 min): cron fires first, but Midtrans `expire` webhook still arrives and is handled gracefully (late webhook logic in `data-models.md`).

### Payment Model Fields

| Field | Type | Notes |
|---|---|---|
| `id` | string | UUID |
| `orderId` | string | FK → Order |
| `method` | enum | `QRIS \| EWALLET \| VA \| CARD \| CASH` |
| `provider` | enum? | `GOPAY \| OVO \| DANA \| SHOPEEPAY \| BCA \| MANDIRI \| BNI \| OTHER \| null` |
| `paymentType` | enum | `FULL \| DEPOSIT \| BALANCE_CHARGE \| BALANCE_REFUND` — `FULL` standard order; `DEPOSIT` upfront BY_WEIGHT charge; `BALANCE_CHARGE` second charge (balance > 0); `BALANCE_REFUND` refund row when deposit exceeded final price (amount: negative) |
| `status` | enum | `PENDING \| PENDING_CASH \| SUCCESS \| FAILED \| EXPIRED \| REFUNDED` |
| `amount` | int | IDR charged |
| `midtransTransactionId` | string? | Unique; idempotency guard on webhook |

**Provider rules:**
- `CASH` → provider always null
- `QRIS` → provider optional (Midtrans may return which e-wallet; null if unknown)
- `EWALLET` → provider required
- `VA` → provider required
- `CARD` → provider optional

### PAY_AT_CASHIER Flow (Customer View)

```
Customer selects "Bayar di Kasir" → submits cart
    │
    ▼
Order created: PENDING; Payment: PENDING_CASH
Customer sees: "Menunggu konfirmasi kasir..."
Kitchen does NOT see this order yet
    │
    ▼
Cashier confirms → Order: CONFIRMED → kitchen receives it
    OR
Cashier rejects → Order: CANCELLED → customer sees: "Your order was cancelled by the cashier."
```

---

## Tax & Service Charge (MerchantSettings)

Relevant fields the customer-facing app must read and apply:

| Setting | Default | Notes |
|---|---|---|
| `taxRate` | `0.11` (11%) | PPN — standard Indonesian VAT |
| `taxLabel` | `"PPN"` | Display label on pre-invoice |
| `serviceChargeRate` | `0.00` | Optional; display with `serviceChargeLabel` |
| `serviceChargeLabel` | `"Service"` | Display label |
| `taxOnServiceCharge` | `true` | If true, PPN applied to (subtotal + serviceCharge) |
| `pricesIncludeTax` | `false` | If true, displayed prices are tax-inclusive; back-calculate tax |
| `paymentTimeoutMinutes` | `15` | Minutes before PENDING order auto-expires; also passed as `custom_expiry` to Midtrans |
| `paymentMode` | `PAY_FIRST` | `PAY_FIRST` or `PAY_AT_CASHIER` |
| `maxPendingOrders` | `3` | Max concurrent PENDING orders per CustomerSession |
| `maxOrderValueIDR` | `5000000` | Max single-order value; fraud guard |
| `roundingRule` | `NONE` | `NONE \| ROUND_50 \| ROUND_100` |
| `maxActiveOrders` | `null` | If set and reached, new order creation returns HTTP 503 |
| `orderingPaused` | `false` | Manual kill-switch; HTTP 503 if true |
| `orderingPausedMessage` | `null` | Custom message when paused; falls back to default |

**When ordering is paused or cap reached:** Customer sees "Dapur sedang sibuk. Silakan coba dalam beberapa menit." (or custom `orderingPausedMessage`). No Order row created; no Midtrans charge initiated.

---

## Restaurant Branding

Applied to `apps/menu` only (not merchant-pos or FBQRSYS).

| Field | Description |
|---|---|
| `logoUrl` | Restaurant logo shown in menu header |
| `bannerUrl` | Optional hero banner image |
| `primaryColor` | Hex; buttons, highlights, CTAs |
| `secondaryColor` | Hex; backgrounds, accents |
| `fontFamily` | From curated list (Inter, Poppins, Lato, Playfair Display, etc.) |
| `borderRadius` | `sharp \| rounded \| pill` |
| `menuLayout` | Default layout: `GRID \| BUNDLE \| LIST \| SPOTLIGHT` |
| `customCss` | Raw CSS overrides (FBQRSYS admin only; sanitized before storage) |

Applied via CSS custom properties (`--color-primary`, `--color-surface`, etc.) fetched once per session. Changes take effect immediately without a rebuild. Must be applied within **50ms** of session load (no flash of unstyled menu).

### SSR Branding Injection Strategy (No Flash)

Branding CSS variables must be injected **server-side** in the `<head>` — never via `useEffect` or client-side fetch. A client-side approach causes a visible flash of unstyled/default-color menu while the fetch resolves.

**Correct approach (Step 12):**

```tsx
// apps/menu/app/[restaurantId]/[tableId]/layout.tsx  (Server Component)
import { prisma } from '@repo/database'

export default async function MenuLayout({ params, children }) {
  const branding = await prisma.restaurantBranding.findUnique({
    where: { restaurantId: params.restaurantId },
  })

  const cssVars = branding ? `
    :root {
      --color-primary: ${branding.primaryColor ?? '#E84040'};
      --color-secondary: ${branding.secondaryColor ?? '#F5F5F5'};
      --font-family: ${branding.fontFamily ?? 'Inter'}, sans-serif;
      --border-radius: ${branding.borderRadius === 'pill' ? '9999px' : branding.borderRadius === 'rounded' ? '12px' : '4px'};
    }
  ` : ''

  return (
    <html>
      <head>
        {cssVars && <style dangerouslySetInnerHTML={{ __html: cssVars }} />}
        {/* font preload for configured fontFamily */}
      </head>
      <body>{children}</body>
    </html>
  )
}
```

**Why this works:**
- The layout is a React Server Component — it fetches branding from DB and renders the `<style>` tag server-side.
- The browser receives the CSS variables in the initial HTML — no network round-trip, no flash.
- This branding fetch is included in the 5-minute `unstable_cache` alongside the menu data (same cache key: `restaurantId:branchId`).
- `customCss` field (FBQRSYS admin only): sanitize with a CSS sanitizer (e.g. `clean-css` with allowlist) before injecting via `dangerouslySetInnerHTML` to prevent XSS.

---

## Dynamic Menu Layouts

`apps/menu` supports 4 layout modes. Restaurant sets a default; each `MenuCategory` can independently override.

### Grid (Cafe style)

Best for: cafes, bakeries, bubble tea, dessert shops.

```
[Food] [Drinks] [Snacks] ← sticky category tabs
┌──────┬──────┬──────┐
│  🎂  │  ☕  │  🥐  │
│Cake  │Latte │Crois.│
│ 25k  │ 28k  │ 18k  │
└──────┴──────┴──────┘
          [Cart: 2 items · 46k]  ← sticky
```
- 2-3 column grid depending on screen width
- Image-first cards; category tabs pinned at top, scroll-spy active

### Bundle (Package style)

Best for: fast casual, lunch sets, value meals.

```
┌─────────────────────┐
│ 🍔🍟🥤  MEAL SET A  │
│ Burger + Fries +    │
│ ~~85k~~  → 65k      │
└─────────────────────┘
```
- Full-width card per item/combo
- Prominently shows bundle contents and savings; crossed-out original price

### List (Kiosk style)

Best for: kiosks, warungs, food courts, restaurants with 50+ items.

```
🔍 Search menu...
─────────────────────
[img] Nasi Goreng    75k
      Fried rice w/ egg
─────────────────────
```
- Dense, text-forward; small thumbnail (48×48) on left
- Search bar always visible at top; category filter chips

### Spotlight (Fine dining style)

Best for: fine dining, omakase, small curated menus under 20 items.

```
┌─────────────────────┐
│    [LARGE PHOTO]    │
│  Wagyu Sirloin      │
│  Slow-braised...    │
│         Rp 485.000  │
│   [+ Add to order]  │
└─────────────────────┘
     ← 3 of 12 →
```
- One item per screen section; swipeable left/right (Framer Motion drag)
- Extended description, chef notes, allergen info

### Layout Enum

```typescript
type MenuLayout = 'GRID' | 'BUNDLE' | 'LIST' | 'SPOTLIGHT'
```

`Restaurant.menuLayout` (default) and `MenuCategory.menuLayoutOverride` (per-category) both use this enum.

---

## Menu Category Fields (Relevant to Customer App)

| Field | Type | Notes |
|---|---|---|
| `name` | string | Category name shown in tab bar / section header |
| `imageUrl` | string? | Optional header image |
| `sortOrder` | int | Display order |
| `menuLayoutOverride` | enum? | Overrides restaurant default for this category |
| `availableFrom` | time? | Category only shows after this time (WIB/Asia/Jakarta); `TIME` stored as HH:MM |
| `availableTo` | time? | Category only shows before this time (WIB) |
| `isActive` | bool | Toggle category entirely |
| `kitchenStationId` | string? | Routing info (not customer-facing) |

**Time-based availability:** Compare `availableFrom`/`availableTo` against current time in `Asia/Jakarta` timezone using `date-fns-tz` or `toZonedTime()`. Example: "Sarapan" with `availableFrom: 06:00`, `availableTo: 11:00` is hidden to customers outside 6–11am WIB.

---

## Menu Item Fields

| Field | Type | Notes |
|---|---|---|
| `name` | string | Display name |
| `description` | string | Shown in item detail modal |
| `price` | int | IDR, no decimals |
| `imageUrl` | string | Supabase Storage path; display with `next/image` (never `<img>`) |
| `isAvailable` | bool | If false, show greyed out "Habis" label; not orderable |
| `stockCount` | int? | Displayed as availability, not shown numerically to customers |
| `estimatedPrepTime` | int? | Minutes; shown as "~15 min" |
| `isHalal` | bool | Shows Halal badge ✅ |
| `isVegetarian` | bool | Shows Vegetarian badge 🌿 |
| `isVegan` | bool | Shows Vegan badge 🌱 |
| `allergens` | string[] | e.g. `["nuts", "dairy", "gluten"]` — warning badges ⚠️ |
| `spiceLevel` | int? | 0=none, 1=mild, 2=medium, 3=hot — shown as 🌶️ count |
| `sortOrder` | int | Display order within category |
| `priceType` | enum | `FIXED` (default) \| `BY_WEIGHT` |
| `pricePerUnit` | int? | Required for BY_WEIGHT; IDR per unit |
| `unitLabel` | string? | e.g. "per 100g", "per ekor", "per kg" |
| `depositAmount` | int? | Upfront charge at checkout for BY_WEIGHT items |
| `deletedAt` | datetime? | Soft delete; do not show to customers |

---

## Weight-Based Pricing (Customer View)

For items with `priceType = BY_WEIGHT` (seafood like Kepiting, Ikan Bakar):

**At checkout:** Show deposit amount, not final price.
```
"Kepiting Saus Padang — Deposit Rp 50.000 (harga akhir ditentukan setelah ditimbang)"
```

**On order tracking screen:** Show item with ⚖️ badge until weight is confirmed by staff. After staff enters weight: display final price and any remaining payment prompt.

**Customer flow:**
```
Customer orders BY_WEIGHT item
    │ Checkout shows deposit amount
    │ Customer pays deposit via Midtrans (or cash)
    ▼
Order → CONFIRMED → kitchen shows ⚖️ "Needs weighing" on item
    │
    ▼
Kitchen/cashier weighs item → enters weight in merchant-pos
    │
    ▼
If remaining balance > 0:
  Customer prompted to pay remaining amount
  (QRIS generates new Midtrans charge; or cashier handles cash)
```

> **Same-channel constraint:** Both `BALANCE_CHARGE` and `BALANCE_REFUND` Payments must use the **same `method` and `provider`** as the original `DEPOSIT` Payment. Do not offer a different payment channel. If the deposit was QRIS/GoPay, the balance charge/refund must also be QRIS/GoPay — via Midtrans API. If the deposit was CASH, the balance must be collected or returned as physical cash — **no Midtrans API call is made for CASH BALANCE_REFUND**; the UI prompts the cashier to return physical change and a `BALANCE_REFUND` Payment row is still created with `method = CASH` and `midtransTransactionId = null` for audit purposes. This is enforced server-side: the balance API reads `method` and `provider` from the original DEPOSIT row — the customer is never shown a channel selector.

**OrderItem fields for BY_WEIGHT:**

| Field | Type | Notes |
|---|---|---|
| `weightValue` | decimal? | Actual weight entered by staff |
| `weightUnit` | string? | Matching `MenuItem.unitLabel` |
| `needsWeighing` | bool | True when BY_WEIGHT and no weightValue yet |
| `finalLineTotal` | int? | Calculated after weighing; null until weighed |

---

## Item Variants and Add-ons

Displayed in the item detail modal (bottom sheet on mobile).

### Variants (mutually exclusive)

Customer must select one if variants exist.

| Field | Notes |
|---|---|
| `name` | e.g. "Small", "Medium", "Large", "Pedas" |
| `priceDelta` | IDR added to base price; negative allowed |
| `isDefault` | Pre-selected in the modal |
| `sortOrder` | Display order |

### Add-ons (optional, multi-select)

| Field | Notes |
|---|---|
| `name` | e.g. "Extra Cheese", "No Onion", "Extra Spicy" |
| `priceDelta` | IDR; 0 = free modifier; negative allowed |
| `isDefault` | Pre-checked in the add-on selector |
| `maxQuantity` | Max units per item (null = 1) |
| `sortOrder` | Display order |

### OrderItem Snapshot

Variant and add-on selections are stored as **JSON snapshots** on `OrderItem` — not as foreign keys. This preserves historical accuracy when variants/add-ons change later.

```
OrderItem fields:
  variantSnapshot   JSON  ← metadata: {name, priceDelta}
  addonSnapshot     JSON  ← metadata: [{name, priceDelta, quantity}]
  unitPrice         int   ← base price at time of order
  variantPriceDelta int   ← variant delta at time of order
  addonPriceTotal   int   ← sum of all addon price deltas
  lineTotal         int   ← (unitPrice + variantPriceDelta) × qty + addonPriceTotal
```

---

## Customer Special Request / Note

`Order.customerNote` — free-text field (max 200 chars) entered by customer at checkout.

- Examples: "no MSG", "extra spicy", "no cilantro", "allergy: shrimp"
- Shown on the kitchen display card (under items)
- Shown on the customer's own order tracking screen
- **Only shown if non-empty** — no empty note section displayed

---

## Real-Time Updates (Supabase Realtime)

### Customer Order Tracking Pattern

```
Component mounts
    │
    ▼
1. REST fetch: GET /api/orders/{orderId} → load current order state
    │
    ▼
2. Subscribe to Supabase Realtime channel for order updates
    │
    ▼
3. Poll silently every 30 seconds as fallback (no visible loading state)
    │
    ▼
On status change: update UI without page refresh
```

**Connection drop handling:** Show subtle "Reconnecting…" banner. On reconnect, re-fetch current state before resuming subscription.

### Channel Strategy

Channels are scoped per branch: `channel: orders:branchId`

Never subscribe per-order — that creates O(N) channels per screen.

---

## Customer Account & Registration

Customer login is **optional**. Anonymous QR sessions work for all ordering features. Login unlocks loyalty point earning and order history.

### When Login is Prompted

1. **At checkout** — after cart review, before payment: "Log in to earn loyalty points on this order"
2. **Post-order** — after order confirmed: "Create an account to track your order history and earn points"
3. **Never blocking** — customer can always dismiss and continue anonymously

### Registration / Login Options

- **Email + password** — standard form; email verification required before loyalty points credited
- **Google OAuth** — Phase 2 (optional, depending on Google approval timeline)

### Customer Model

| Field | Type | Notes |
|---|---|---|
| `id` | string | UUID |
| `email` | string | Unique |
| `hashedPassword` | string? | null for OAuth-only accounts |
| `name` | string? | Display name |
| `emailVerifiedAt` | datetime? | Points only credited after verification |
| `googleId` | string? | Phase 2 Google OAuth |
| `createdAt` | datetime | |

### Session-to-Customer Linking

When a customer logs in or registers **during an active CustomerSession**:
- `CustomerSession.customerId` is set to the authenticated `Customer.id`
- All `Order` records linked to that session that are `CONFIRMED` or later have loyalty points credited retroactively (if merchant loyalty is enabled)
- Idempotency guard prevents double-crediting

### Token Storage

Customer auth tokens for `apps/menu` are stored as `httpOnly` cookies scoped to `menu.fbqr.app`. Distinct from the `fbqr_session_id` session cookie. Both coexist without conflict. Never use localStorage (XSS risk).

---

## Customer Loyalty (Merchant Tier — Phase 1 Schema)

Schema is designed in Phase 1; UI ships in Phase 2 (Step 25).

### How Points Work

- Merchant enables loyalty in `MerchantSettings` → customers earn points per order at that restaurant
- Points are scoped to that restaurant only — do not transfer between restaurants
- Points calculated based on `MerchantLoyaltyProgram.pointsCalculationBasis`:
  - `SUBTOTAL` — points based on pre-discount item total (default; prevents gaming)
  - `TOTAL` — points based on final paid amount

### Points Earned Per Order

Loyalty points are credited **per order at the moment each Order moves to CONFIRMED** — not at session close.

### Checkout Loyalty Flow

If merchant loyalty enabled and customer is logged in:
1. Show redeemable points balance
2. Show equivalent IDR discount
3. Option to apply discount to this order
4. Points for this order credited on confirmation

### MerchantLoyaltyBalance Model

| Field | Notes |
|---|---|
| `customerId` | FK → Customer |
| `restaurantId` | FK → Restaurant |
| `pointsBalance` | Current points |
| `lifetimePointsEarned` | Total ever earned (for tier calculation) |
| `currentTitle` | Custom title from merchant (e.g. "Japan-kun", "Ramen Shogun") — Phase 2 |

### MerchantLoyaltyProgram Fields (for reference)

| Field | Notes |
|---|---|
| `name` | Program name shown to customer (e.g. "Sakura Points") |
| `idrPerPoint` | How many IDR earns 1 point |
| `redemptionRate` | Points-to-IDR conversion for redemption |
| `pointsCalculationBasis` | `SUBTOTAL \| TOTAL` |
| `isActive` | One active program per restaurant at a time |

---

## Takeaway / Queue Number (Customer View)

For `orderType = TAKEAWAY`:

- Customer receives a **queue number** (e.g. "Order #042")
- Queue numbers auto-generated per branch per day via `QueueCounter` (reset at midnight WIB)
- All order types (DINE_IN, TAKEAWAY, DELIVERY) receive a queue number; for dine-in it is secondary to table name in UI hierarchy

### Order Queue Display Screen (`/kitchen/queue-display`)

A separate screen shown on a TV/tablet facing the customer waiting area:

```
┌─────────────────────────────────────┐
│          PESANAN SIAP               │
│                                     │
│   042   047   051   055             │
│                                     │
│          SEDANG DISIAPKAN           │
│                                     │
│   043   044   048   049   052       │
└─────────────────────────────────────┘
```
- Updates in real-time via Supabase Realtime
- Ready numbers shown for configurable duration, then cleared

### Takeaway QR Flow (Counter)

```
Customer walks up to counter
    │
    ├── Option A: Scan QR at counter
    ├── Option B: Staff inputs order on merchant-pos
    └── Option C: Order from delivery platform
    │
    ▼
Customer gets queue number → waits → sees number on queue display → collects at counter
```

---

## Post-Order Customer Rating

After an order is marked `COMPLETED`:

- Customer sees a 1–5 star prompt on order tracking screen: "Bagaimana makanannya?"
- Optional text comment
- Stored in `OrderRating` linked to the `Order`
- Rating is per-order, not per-item

### OrderRating Model

| Field | Type | Notes |
|---|---|---|
| `id` | string | UUID |
| `orderId` | string | FK → Order (unique — one rating per order) |
| `customerId` | string? | FK → Customer (null for anonymous) |
| `rating` | int | 1–5 stars |
| `comment` | string? | Optional text |
| `createdAt` | datetime | |

---

## AI Recommendations (Customer-Facing)

All features configurable per merchant (`MerchantSettings`). Customer sees the output; merchant configures the toggle.

| Feature | Setting Key | Customer experience |
|---|---|---|
| Best-seller highlights | `aiShowBestsellers` | "🔥 Terlaris" badge on top items |
| Personalized suggestions | `aiPersonalized` | "Sering dipesan bersama" section based on cart |
| Upsell prompts | `aiUpsell` | "Tambah minuman?" prompt at checkout or cart view |
| Time-based | `aiTimeBased` | Breakfast items surfaced before 11am, dinner items in evening |

All logic runs server-side. No external AI service required initially — pure SQL analytics.

---

## Menu Caching (Affects Customer App)

`GET /api/menu/{restaurantId}` is the highest-traffic read.

- **Cache key:** `restaurantId:branchId:locale` — branchId included from day one for Phase 2 `BranchMenuOverride` compatibility
- **TTL:** 5 minutes
- **What is cached:** Full menu JSON (categories + items + branding, with branch-specific availability applied)
- **What is NOT cached:** Order status, table status, session state — always real-time

On any menu change, `revalidatePath` purges the cache immediately (scoped to affected branch).

---

## Rate Limiting & Fraud Rules (Customer-Relevant)

| Rule | Value | Where enforced |
|---|---|---|
| Max PENDING orders per CustomerSession | 3 (configurable) | Order creation API |
| Max cart items per order | 20 items | Order creation API |
| Max order value per order | Rp 5,000,000 (configurable) | Order creation API |
| Max CustomerSession per table per hour | 5 | Session creation API |
| QR `sig` token expiry | 24 hours | QR validation middleware |
| Rate limit on menu API | 60 req/min per IP | Edge middleware |
| Order creation idempotency | `idempotencyKey` UUID | Order creation API |

---

## `apps/menu` — UI Requirements

### Performance Targets

- **First render < 1.5 seconds** on Indonesian 4G (Lighthouse score > 85)
- **No layout shift** (CLS < 0.1) — menu items must not jump as images load
- **Color theming** applied within 50ms of session load (no flash of unstyled menu)
- Cache key includes branchId from day one (see Menu Caching)

### Optimistic UI

Add to cart is **instant** (no server round-trip before updating cart count). Cart count and total update immediately; server sync happens in background.

### Image Optimization

All customer-facing images **must** use Next.js `next/image` — never `<img>` tags. At upload time: max 800×800px, WebP format, quality 80. Prevents 100MB+ page load on Indonesian 4G.

### Interaction Patterns

- **Bottom sheet** for item detail on mobile (slides up from bottom — not a modal)
- **Swipe gestures** — Spotlight layout items swipeable left/right (Framer Motion drag)
- **Haptic feedback** — `navigator.vibrate(10)` on "Add to Cart" confirmation (Android)
- **Sticky bottom cart bar** — always visible; shows item count + total; animates on change
- **Cart badge animation** — item count badge springs (scale 1 → 1.3 → 1) when item added

### Loading States

Always use skeletons, never spinners:
```tsx
// ✅ Correct
<Skeleton className="h-4 w-[200px]" />
// ❌ Wrong
<Spinner />
```

Exception: full-page initial load may use a branded splash screen.

### Error States

Friendly language + recovery action:
```
❌ "Error 500: Internal Server Error"
✅ "Terjadi kesalahan. Coba lagi, atau hubungi staff restoran."
   [ Coba Lagi ]
```

### Responsive Target

Primary: 375–430px (iPhone SE → iPhone 15 Pro Max). Touch targets ≥ 44×44px.

### Animation (Framer Motion)

```ts
// Page transitions
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 }
}
transition: { duration: 0.15, ease: 'easeOut' }

// Order status badge pulse (PREPARING state)
animate: { scale: [1, 1.05, 1] }
transition: { repeat: Infinity, duration: 2 }
```

Rule: animation must never slow down a task. Motion is for orientation and delight — not decoration.

### Accessibility

- WCAG 2.1 AA minimum
- All images have `alt` text (use item name)
- Touch targets ≥ 44×44px
- Focus ring always visible (`focus-visible:ring-2`)
- `aria-label` on icon-only buttons

---

## Dietary / Allergen Badge Reference

| Badge | Field | Display |
|---|---|---|
| Halal | `isHalal = true` | ✅ "Halal" |
| Vegetarian | `isVegetarian = true` | 🌿 "Vegetarian" |
| Vegan | `isVegan = true` | 🌱 "Vegan" |
| Contains Nuts | `"nuts" in allergens` | ⚠️ "Kacang" |
| Dairy | `"dairy" in allergens` | ⚠️ "Dairy" |
| Gluten | `"gluten" in allergens` | ⚠️ "Gluten" |
| Spicy | `spiceLevel >= 1` | 🌶️ (count = spiceLevel) |

---

## Kitchen Visibility Gate (Do Not Get Wrong)

> **Do NOT filter kitchen display by `Order.status = PENDING`.**

Two different `PENDING` orders exist simultaneously — one awaiting Midtrans, one awaiting cashier confirmation. The kitchen only receives an order after:
- Digital: `Payment.status → SUCCESS` (Midtrans webhook)
- Cash: cashier taps [Confirm] (`PENDING_CASH → SUCCESS`)

Use `Payment.status = SUCCESS` as the gate, not `Order.status`.

---

## ADR Quick Reference (Customer-Relevant)

| ADR | Decision |
|---|---|
| ADR-009 | One CustomerSession per table — second scan resumes existing ACTIVE session |
| ADR-010 | Table becomes OCCUPIED on first confirmed Order, not on QR scan |
| ADR-011 | Session continuity via `fbqr_session_id` cookie; resume query MUST include `AND tableId = $scannedTableId` |
| ADR-013 | Tax computation formula: service charge optional; `taxOnServiceCharge` default true; all amounts as IDR integers |
| ADR-014 | Multiple Orders per CustomerSession — new items create a new Order linked to same session |
| ADR-015 | QR = static redirect URL; 24h HMAC-SHA256 signed URL generated server-side; expired sig → redirect back to `/r/{tableToken}` for fresh sig |
| ADR-016 | PAY_FIRST (default) vs PAY_AT_CASHIER — kitchen never sees order without confirmation in both modes |

---

## Key Constraints

- Soft-deleted items (`deletedAt IS NOT NULL`): never show to customers
- Categories with `isActive = false`: never show to customers
- Items with `isAvailable = false`: show greyed-out "Habis" label; not orderable
- Time-gated categories outside their window: hidden entirely (not greyed out)
- SUSPENDED restaurant: show "This restaurant is temporarily unavailable." — no menu access
- Ordering paused or cap reached: order creation blocked, but menu is still browsable
- `BY_WEIGHT` items cannot use `stockCount` — stock managed by weight, not unit count
- `autoResetAvailability` is ignored (treated as false) when `stockCount IS NOT NULL`

---

## Steps Covered by This Document

| Step | What it builds |
|---|---|
| Step 12 | QR validation + branded menu + Grid layout + dine-in session |
| Step 13 | List, Bundle, Spotlight layouts |
| Step 14 | Item detail modal: variants, add-ons, allergens |
| Step 15 | Cart + pre-invoice + Midtrans QRIS + Cash option |
| Step 16 | Order tracking screen: real-time status, Call Waiter, rating |
| Step 17 | Takeaway/counter mode: counter QR, queue numbers, queue display |
| Step 25 | Merchant loyalty program + customer account (apps/menu side) |
