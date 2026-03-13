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

## Shareable Menu URL (Phase 1 — Step 12)

Merchants can share their digital menu without a physical QR code. Useful for social media bios, WhatsApp Business catalogs, Google Maps menus, and pre-visit browsing.

### URL Pattern

```
https://menu.fbqr.app/{restaurantId}/menu
```

No `tableId`, no token, no signature required. Publicly accessible.

### Behaviour

- **Browse-only mode**: Customer views the full menu (categories + items + branding) but **cannot place orders** — no cart, no checkout, no CustomerSession is created.
- A non-dismissable banner at the bottom of the screen: *"Pindai QR di meja untuk memesan"* ("Scan the QR at your table to order").
- Menu respects `BranchMenuOverride` — item availability shown for the restaurant's primary branch (first `Branch` by `createdAt`).
- Respects `Restaurant.status`: if `SUSPENDED`, shows the standard "unavailable" error page.

### Where Merchants Access This URL

- merchant-pos → Settings → Restaurant → **"Salin Link Menu"** ("Copy Menu Link") button — copies URL to clipboard.
- Also surfaced in the onboarding checklist as a suggested sharing step.

### Security

- No CustomerSession is created; no Order can be submitted from this route.
- Rate-limited at 100 req/min per `restaurantId` at the edge middleware layer.
- The URL is intentionally public — merchants opt into sharing it.

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

**⚠️ Path parameter validation (security rule):** The HMAC signature covers only `tableToken:expiryTimestamp` — the `{restaurantId}` and `{tableId}` path parameters are NOT signed. After looking up `Table` by `tableToken`, the app **MUST** assert:
```
assert params.tableId === table.id
assert params.restaurantId === table.branch.restaurantId
```
If either assertion fails → return `400 Bad Request` (do not redirect to `/r/{tableToken}`). **Never use `params.tableId` or `params.restaurantId` as the source of truth for session creation or order routing** — always derive table and restaurant identity from the DB record returned by `Table.findByToken(tableToken)`. See ADR-015.

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

### 4. Privacy Consent (First Visit Only — Pre-Launch Mandatory)

Before showing the cart or allowing the customer to proceed to checkout on their **first order submission**, FBQR must collect explicit consent for data processing as required by UU PDP (UU No. 27/2022).

**When triggered:** Once per device (stored in `localStorage`). Not shown again on subsequent sessions from the same browser.

**Consent screen (bottom sheet, non-dismissable until action taken):**

```
┌──────────────────────────────────────┐
│  Sebelum memesan                     │
│                                      │
│  FBQR menyimpan pesanan dan data     │
│  perangkat Anda untuk memproses      │
│  transaksi ini.                      │
│                                      │
│  Data disimpan di server Singapura.  │
│  Tidak dijual ke pihak ketiga.       │
│                                      │
│  Baca Kebijakan Privasi kami →       │
│  (link to fbqr.app/privacy)          │
│                                      │
│  [ Saya Setuju — Lanjutkan ]         │
│  [ Batalkan ]                        │
└──────────────────────────────────────┘
```

- **[Saya Setuju — Lanjutkan]**: Sets `localStorage.setItem('fbqr_consent', '1')` + timestamp. Proceeds to checkout. If `Customer` account is logged in, sets `Customer.privacyConsentAt = NOW()` via API.
- **[Batalkan]**: Closes the sheet. Customer returns to the menu. Cart is preserved. They can browse and add items but cannot submit an order without consenting.
- The Privacy Policy link (`fbqr.app/privacy`) opens in a new tab; sheet remains visible on return.
- This screen must be implemented in Step 15 before any payment flow is accessible.

**Note:** Anonymous customers (no account) only get the localStorage consent flag. Logged-in customers also get `Customer.privacyConsentAt` persisted in the DB. This satisfies UU PDP Article 22 (explicit consent before processing).

### 5. Checkout

- Customer reviews cart → pre-invoice shown (itemized + tax + service charge + total)
- Optional: customer logs in / creates account to earn loyalty points
- If merchant loyalty enabled and customer is logged in: redeemable points shown + option to apply discount
- Select payment method (merchant-configured: QRIS default, others optional)
- **QRIS payment:** Midtrans generates QR → customer scans with e-wallet
- **Non-QRIS:** redirect to Midtrans hosted payment page
- **PAY_AT_CASHIER mode:** customer submits order → alert sent to cashier → cashier confirms → kitchen receives order

### 6. Post-Payment (Customer View)

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

### 7. Call Waiter Feature

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

**Critical — the session resume query MUST use `sessionCookie`, not `id`:**
```sql
SELECT * FROM CustomerSession
WHERE sessionCookie = $cookieValue   -- NOT id — cookie stores the opaque sessionCookie value
  AND tableId = $scannedTableId      -- REQUIRED: prevents cross-table session leakage
  AND status = 'ACTIVE'
```

**Security note:** The cookie must store `CustomerSession.sessionCookie` (a separate high-entropy opaque string), never `CustomerSession.id` (the UUID primary key). Using `id` means a DB breach directly yields valid session credentials. The `sessionCookie` field exists precisely to decouple the internal PK from the cookie credential. If `WHERE id = $cookieValue` appears in any implementation, it is a session hijacking vulnerability.

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
Midtrans webhook → Order status → CONFIRMED → enqueue async Invoice PDF generation job
(PDF generation MUST be async — see Invoice PDF Generation note below)

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

## Invoice PDF Generation — Async Requirement

**PDF generation MUST be triggered asynchronously after the Midtrans webhook handler returns HTTP 200.**

**Why:** `@react-pdf/renderer` rendering + Supabase Storage upload = 2–5 seconds. On Vercel Hobby, the serverless function has a 10-second hard timeout. A complex order (many items, branding assets) could push the total webhook handler time (cold start + DB transaction + PDF gen + Storage upload) beyond 10 seconds. When Vercel kills the function mid-execution:
- The DB transaction has already committed (CONFIRMED order, kitchen alerted) ✅
- Midtrans receives a 5xx and retries the webhook
- The retry hits the idempotency guard → returns HTTP 200 without re-attempting PDF generation
- Result: order confirmed, kitchen working, but **no invoice PDF ever generated** — customer sees broken download link

**⚠️ Vercel runtime warning:** On **standard Node.js serverless** runtime, bare `Promise` fire-and-forget is NOT safe — Vercel terminates the function process immediately after the HTTP response. Any `setTimeout` or un-awaited `fetch` is silently dropped. Two safe options:

**Option A (recommended) — Vercel Edge Runtime on the webhook handler:**
```ts
// app/api/webhook/midtrans/route.ts
export const runtime = 'edge'
// Edge runtime supports waitUntil() via context.waitUntil()
export async function POST(req: Request, { waitUntil }: { waitUntil: (p: Promise<any>) => void }) {
  // ... run main transaction ...
  waitUntil(fetch('/api/invoice/generate', { method: 'POST', body: JSON.stringify({ orderId }) }))
  return new Response('OK', { status: 200 })
}
```

**Option B — Supabase Edge Function triggered by DB webhook on `Payment.status → SUCCESS`**

**Required implementation pattern (Step 15 and Step 19):**

```
Midtrans webhook handler:
  1. Run the main transaction (update Order → CONFIRMED, Payment → SUCCESS, broadcast Realtime)
  2. Return HTTP 200 to Midtrans immediately
  3. Enqueue invoice generation via waitUntil() (Edge Runtime) or Supabase Edge Function trigger
     NEVER use bare Promise fire-and-forget on standard Node.js runtime — it will be dropped.

Invoice generation endpoint (/api/invoice/generate):
  1. Fetch Order + OrderItems + Customer + Restaurant branding
  2. Render PDF with @react-pdf/renderer
  3. Upload to Supabase Storage → store URL on Order.invoicePdfUrl
  4. Send "Your receipt is ready" email to customer (if email provided)
```

The invoice download link in the order tracking screen should show "Generating..." with a polling fallback until `Order.invoicePdfUrl` is set. Timeout for display: 30 seconds, then "Invoice unavailable — contact restaurant."

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
| `paymentType` | enum | `FULL \| DEPOSIT \| BALANCE_CHARGE \| BALANCE_REFUND` — `FULL` standard order; `DEPOSIT` upfront BY_WEIGHT charge; `BALANCE_CHARGE` second charge (balance > 0); `BALANCE_REFUND` refund row when deposit exceeded final price (**amount is always POSITIVE** — refund direction indicated by `paymentType` alone; see data-models.md SIGN CONVENTION) |
| `status` | enum | `PENDING \| PENDING_CASH \| SUCCESS \| FAILED \| EXPIRED \| REFUNDED` |
| `amount` | int | IDR charged (always positive — see SIGN CONVENTION in data-models.md) |
| `currency` | string | Default `"IDR"`. Infrastructure field for future multi-currency expansion; always `"IDR"` today. |
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

## Patungan — Split Payment (Phase 1 — Step 15)

Patungan ("chipping in" in Indonesian) lets a group of friends split a single Order's `grandTotal` across multiple Midtrans payments. Each person pays their own share from their own device and e-wallet. No external group-payment app required.

> **Scope:** Patungan is a **PAY_FIRST-only** feature. `PAY_AT_CASHIER` mode does not support Patungan — the cashier already collects payment in person and can handle splits physically.

### Who Can Initiate Patungan

Any customer in the active session can initiate Patungan from the checkout screen, before payment is submitted. The initiating device becomes the **Patungan host**.

### UX Flow

#### Step 1 — Cart & Checkout Screen

On the pre-invoice screen, below the grand total, the host taps:

```
[ Bayar Patungan 👥 ]   (secondary CTA below the primary "Bayar Sekarang" button)
```

This button is shown only when `paymentMode = PAY_FIRST`. Hidden in `PAY_AT_CASHIER` mode.

#### Step 2 — Split Setup Modal

A bottom sheet slides up with split options:

```
┌──────────────────────────────────────┐
│  Bayar Patungan                      │
│  Total: Rp 245.000                   │
│                                      │
│  Berapa orang yang ikut patungan?    │
│  [  −  ]  [ 2 ]  [  +  ]            │
│  (min 2, max 10)                     │
│                                      │
│  Cara bagi:                          │
│  ● Rata (Rp 122.500 / orang)         │
│  ○ Manual (setiap orang isi sendiri) │
│                                      │
│  [ Buat Link Patungan ]              │
└──────────────────────────────────────┘
```

**Two split modes:**

| Mode | Behaviour |
|---|---|
| **Rata (Equal)** | `grandTotal ÷ personCount`, rounded up to nearest 100 IDR per person; any rounding remainder assigned to the last payer (the host). |
| **Manual (Custom)** | Each participant enters their own share on their device. API validates that the sum of all submitted payments equals `grandTotal` exactly before confirming the Order. |

#### Step 3 — Patungan Session Created

Host taps **[Buat Link Patungan]**. FBQR API creates a `PatunganSession` (see schema below) and returns:

- A shareable URL: `https://menu.fbqr.app/{restaurantId}/{tableId}/patungan/{patunganId}?share=1`
- A 6-digit alphanumeric join code (e.g. `XK4M9R`)

Host's device shows:

```
┌──────────────────────────────────────┐
│  Patungan Dibuat! 🎉                 │
│                                      │
│  Bagikan ke teman:                   │
│  [Salin Link] [Bagikan via WhatsApp] │
│                                      │
│  Atau tunjukkan kode ini:            │
│  ┌────────────────┐                  │
│  │   X K 4 M 9 R  │  (large, bold)  │
│  └────────────────┘                  │
│                                      │
│  Menunggu pembayaran...              │
│  ████████░░  1/2 lunas               │
│                                      │
│  [Bayar Bagian Saya]                 │
└──────────────────────────────────────┘
```

The host sees a live progress bar (Supabase Realtime) updating as participants pay.

#### Step 4 — Participant Joins

Participant opens the shared URL or visits `https://menu.fbqr.app/patungan` and enters the 6-digit code. They land on a **Patungan participant screen**:

```
┌──────────────────────────────────────┐
│  Patungan di [Restaurant Name]       │
│  Meja 5 — 2 orang                    │
│                                      │
│  Total tagihan: Rp 245.000           │
│  Bagian kamu:   Rp 122.500           │  ← Equal mode: pre-filled
│                 [__________]         │  ← Manual mode: editable field
│                                      │
│  [ Bayar Sekarang ]                  │
│  (via Midtrans QRIS / e-wallet)      │
└──────────────────────────────────────┘
```

Participant taps **[Bayar Sekarang]** → redirected to Midtrans Snap for their individual share amount.

#### Step 5 — Payments Collected

Each participant's successful Midtrans webhook creates one `Payment` row linked to the same `Order.id` with `paymentType = FULL` and `splitGroupId = patunganId`.

- The `Order` stays in `PENDING` until **all** `PatunganSession.totalParts` payments reach `SUCCESS`.
- When the last payment completes: `Order → CONFIRMED`, kitchen notified, invoice generated (all in the same webhook handler transaction).
- If any payment expires before the session completes: that participant's slot opens back up — they must re-pay their share. Other successful payments are NOT refunded automatically (they wait for completion).

#### Step 6 — Host Progress Screen

Host sees live updates:

```
Pembayaran Patungan
Total: Rp 245.000

✅ Kamu              Rp 122.500  Lunas
⏳ Teman kamu        Rp 122.500  Menunggu pembayaran...

[Ingatkan Teman]   [Batalkan Patungan]
```

**[Ingatkan Teman]** — copies the join URL to clipboard (no automatic push/WhatsApp in Phase 1).

**[Batalkan Patungan]** — host-only. Cancels the `PatunganSession`. All `SUCCESS` payments are refunded via Midtrans API. `Order` → `CANCELLED`. Uses `orders:manage`-equivalent host authority — no staff login required.

### PatunganSession Schema

```
PatunganSession
├── id              (string UUID PK)
├── orderId         (string FK → Order.id; unique — one patungan per order)
├── shareCode       (string — 6-char alphanumeric; unique index; case-insensitive lookup)
├── splitMode       (enum: EQUAL | MANUAL)
├── totalParts      (int — number of participants, 2–10)
├── paidParts       (int — count of SUCCESS payments; updated atomically per webhook)
├── amountPerPart   (int? — set for EQUAL mode; null for MANUAL)
├── status          (enum: PENDING | COMPLETED | CANCELLED)
├── expiresAt       (DateTime — PatunganSession expires when Order expires;
│                    set to Order.expiresAt at creation time)
├── createdBySessionId (string FK → CustomerSession.id — host's session)
├── createdAt       (DateTime)
└── updatedAt       (DateTime)
```

`Payment.splitGroupId` field: `String? FK → PatunganSession.id`. Null for non-Patungan payments.

### API Endpoints (Step 15)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/patungan` | CustomerSession cookie | Create PatunganSession; validate Order is PENDING + paymentMode=PAY_FIRST |
| `GET` | `/api/patungan/[patunganId]` | None (shareable link) | Get session status, split details, paidParts count |
| `GET` | `/api/patungan/code/[shareCode]` | None | Look up patunganId from 6-char code |
| `POST` | `/api/patungan/[patunganId]/pay` | None (participant) | Create Midtrans Snap token for participant's share; returns `redirectUrl` |
| `DELETE` | `/api/patungan/[patunganId]` | CustomerSession cookie (host only) | Cancel PatunganSession + refund all SUCCESS payments |

### Constraints and Edge Cases

| Constraint | Rule |
|---|---|
| `PAY_AT_CASHIER` mode | Patungan button hidden; API returns HTTP 400 if attempted |
| Order already CONFIRMED | Cannot create PatunganSession; HTTP 409 |
| Equal split remainder | Round each share DOWN to nearest 1 IDR; add remainder to host's share (always last to appear in UI to avoid confusion) |
| Manual mode overpayment | API rejects any `POST /pay` that would push `SUM(pending + paid)` above `grandTotal`; HTTP 422 |
| Manual mode underpayment | Order never confirms; PatunganSession expires with Order |
| Participant count | Min 2, max 10. Enforced at creation time and at join time |
| `maxOrderValueIDR` guard | Applies to the full Order grandTotal; each individual Patungan payment is exempt from this guard (their share may be below the limit) |
| Session expiry | `PatunganSession.expiresAt = Order.expiresAt`; cleanup cron cancels both together |
| Refund on cancellation | Midtrans API call per SUCCESS Payment; failures queued for manual resolution (Phase 2 dead-letter queue) |
| BY_WEIGHT orders | Patungan is blocked if any `OrderItem.needsWeighing = true` — final price unknown at order time; HTTP 400 "Tidak dapat membagi tagihan untuk pesanan timbang" |

### Data Models to Add to Phase 1 Prisma (Step 2)

`PatunganSession` table and `Payment.splitGroupId` field must be created in Step 2 even though the Patungan UI ships in Step 15. See `docs/data-models.md` § Phase 2 Schema Scaffolding for field list.

> **Note for Step 2:** Add `splitGroupId String? @db.Uuid` to the `Payment` model and create the `PatunganSession` table. Both ship with zero UI in Phase 1 and are activated in Step 15.

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
Kitchen staff taps ⚖️ badge on KDS card → KDS numpad modal opens → staff enters weight
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

- **Cache key:** `restaurantId:branchId:locale` — branchId required from day one because `BranchMenuOverride` (Phase 1, Step 9) makes menu responses branch-specific
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

### Language Switcher (Step 12 — Before First Deploy)

`apps/menu` must ship with a language switcher. Bahasa Indonesia is the default; English is the secondary locale. The switcher must be placed and implemented as follows:

**Placement:** Top-right corner of the menu header bar, next to the restaurant name/logo area. Displayed as a text toggle: **`ID | EN`** (two-letter codes). No flag icons — flags are politically ambiguous and unnecessarily large for a utility control.

```
┌────────────────────────────────────────┐
│  [Restaurant Logo]  Restaurant Name    │  [ID | EN]  │
└────────────────────────────────────────┘
```

**Interaction:**
- Tap `EN` → switches all UI chrome to English; menu item names/descriptions remain in whatever language the merchant entered them.
- Selection persisted in `localStorage` (`fbqr_locale`). Respects browser locale on first visit (`navigator.language.startsWith('id') ? 'id' : 'en'`).
- Language switch does NOT reload the page — `next-intl`'s `useLocale()` hook re-renders UI strings in-place.

**What is translated vs. not translated:**
| Translated (UI chrome) | NOT translated |
|---|---|
| All button labels (`Pesan`, `Tambah ke Keranjang`, etc.) | Menu item names — merchant-entered |
| Status messages, error messages | Menu item descriptions — merchant-entered |
| Section headings, placeholders | Category names — merchant-entered |
| Privacy consent screen | Restaurant name, address |
| Call Waiter button labels | — |

**Implementation (Step 12):**
- All UI strings must use `next-intl`'s `t()` function — never hardcode Indonesian text in JSX.
- String files: `apps/menu/messages/id.json` (source of truth) and `apps/menu/messages/en.json`.
- The cache key for the menu API includes `locale` (see Menu Caching) — but this is for future per-locale menu content only. In Phase 1, the menu JSON is the same regardless of locale (only UI chrome changes).

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

---

## UI Specifications (Customer Menu App)

> **For AI agents building Steps 12–17 and Step 25** (`apps/menu`). This section specifies exact screen layouts, component anatomy, interaction patterns, and empty states for all customer-facing screens. Read `docs/ui-ux.md` first for global design system rules. This section adds screen-specific detail only.
>
> **Critical rule:** All colors, fonts, and border radii in `apps/menu` are merchant-overridable via CSS custom properties (`--color-primary`, `--font-family`, `--border-radius`). All design specs below use FBQR defaults; merchant branding overrides them at runtime.

---

### Screen 1 — Loading / QR Validation Screen

**Route:** `/r/[tableToken]` (redirect handler), then `/{restaurantId}/{tableId}` (menu load)

**Loading state (full-page):**
- Background: `--color-primary` (brand color) — full screen
- FBQR logo or restaurant logo (if already loaded from cache) — centered, white
- Loading spinner (exception to the "always use skeletons" rule — this is full-page initial load, not content loading)
- Spinner: `animate-spin border-4 border-white border-t-transparent rounded-full h-10 w-10`
- Duration: shown while HMAC sig is verified + session created + menu data fetched

**Error states (full-page, no skeleton — human-readable HTML pages):**

| Error | Heading | Body | Icon |
|---|---|---|---|
| Invalid/expired QR | "QR Code Tidak Valid" | "QR code ini tidak valid atau sudah kedaluwarsa. Minta staff untuk membantu." | `QrCode` crossed |
| Table RESERVED | "Meja Direservasi" | "Meja ini sudah direservasi. Silakan tanya staff untuk meja yang tersedia." | `CalendarClock` |
| Table DIRTY | "Meja Sedang Disiapkan" | "Meja ini sedang dibersihkan. Silakan tanya staff." | `Sparkles` |
| Table CLOSED | "Meja Tidak Tersedia" | "Meja ini sementara tidak tersedia. Silakan tanya staff." | `Lock` |
| Restaurant SUSPENDED | "Restoran Sementara Tidak Tersedia" | "Kami sedang melakukan perbaikan. Silakan kembali lagi nanti." | `AlertCircle` |

Error page layout: centered card, icon (64×64px, primary color), heading (H2), body text (Small), no CTA except for the QR-expired case which has `[Muat Ulang QR]` button.

---

### Screen 2 — Menu Home (Grid Layout)

**Route:** `/{restaurantId}/{tableId}` with `menuLayout = GRID`

**Header (sticky, `z-30`):**
```
[Logo 40×40]   [Restaurant Name]             [🛒 2]
```
- Background: `bg-white border-b border-stone-100 shadow-sm`
- Logo: `rounded-full` (or `rounded` if `borderRadius = sharp`)
- Cart icon: `ShoppingCart` with item count badge (primary color, `rounded-full`)
- Height: `h-16` (64px)

**Opening hours bar (below header, shown if `Branch.openingHours` is set):**
- If open: `"Buka hari ini: 09:00 – 22:00"` — `bg-green-50 text-green-700 text-sm py-1 px-4`
- If closed today: `"Tutup hari ini"` — `bg-stone-50 text-stone-500 text-sm py-1 px-4`

**Category tabs (sticky, `z-20`, below header):**
- Horizontal scrollable; `overflow-x-auto` with hidden scrollbar
- Each tab: `whitespace-nowrap px-4 py-3 text-sm font-medium`
- Active: `border-b-2 border-[--color-primary] text-[--color-primary]`
- Inactive: `text-stone-500`
- Scroll-spy: updates active tab as user scrolls through sections

**Search bar** (below category tabs, visible only in GRID layout when merchant enables it):
- `placeholder="Cari menu..."` with `Search` icon on left
- `bg-stone-100 rounded-full px-4 py-2 text-sm` (pill shape if `borderRadius = pill`)

**Item grid:**
- Columns: `grid grid-cols-2 sm:grid-cols-3 gap-3 px-4`
- Category section heading: `text-base font-semibold text-stone-900 px-4 pt-6 pb-2`

**Item card anatomy (GRID layout):**
```
┌─────────────────┐
│                 │
│   [Item Image]  │  ← aspect-ratio: 1/1; object-cover; rounded top corners
│                 │
│  Nasi Goreng    │  ← text-sm font-semibold text-stone-900, 2-line clamp
│  Rp 35.000      │  ← text-sm font-medium text-[--color-primary]
│                 │
│  [Dietary]      │  ← small inline badges (Halal, Vegetarian, etc.)
│                 │
│  [+ Tambah]     │  ← bg-[--color-primary] text-white h-8 rounded-[--border-radius] w-full
└─────────────────┘
```

**Out-of-stock item card:** `opacity-60` + "Habis" badge (`bg-stone-200 text-stone-500`) overlaid on image + button disabled.

**AI recommendation badge ("🔥 Terlaris"):**
- Shown on item card image (top-left corner): `bg-primary text-white text-xs px-2 py-0.5 rounded-br-md`

**Sticky bottom cart bar:**
```
[🛒 2 Item]                        [Rp 70.000  Lihat Keranjang →]
```
- Background: `bg-[--color-primary]`
- Text: white
- Height: `h-14` (56px)
- `position: fixed; bottom: 0; left: 0; right: 0; z-[30]`
- Only shown when cart has ≥ 1 item
- Cart count badge animation: scale 1 → 1.3 → 1 on item add (Framer Motion)

---

### Screen 3 — Menu Home (List Layout)

**Route:** `/{restaurantId}/{tableId}` with `menuLayout = LIST`

**Same header and category tabs as Grid layout.**

**Search bar** — always visible at top, below category tabs:
- `placeholder="Cari menu..."` — full width input

**Item row anatomy (LIST layout):**
```
[Image 56×56]  Nasi Goreng Spesial             Rp 35.000  [+]
               Nasi goreng dengan telur...                 ↑
               [Halal] [🌶️]                               button
```
- Image: `w-14 h-14 rounded-md object-cover flex-shrink-0`
- Name: `text-sm font-semibold text-stone-900` — 1-line clamp
- Description: `text-xs text-stone-500` — 2-line clamp
- Price: `text-sm font-medium text-[--color-primary]`
- Add button: `h-8 w-8 bg-[--color-primary] text-white rounded-full flex items-center justify-center`
- Row separator: `border-b border-stone-100`
- Row padding: `px-4 py-3`

**Category filter chips** (shown below search bar in List layout):
- Horizontal scrollable row of chips
- Active chip: `bg-[--color-primary] text-white`
- Inactive chip: `bg-stone-100 text-stone-600`
- Height: `h-8 px-4 rounded-full text-sm`

---

### Screen 4 — Menu Home (Bundle Layout)

**Route:** `/{restaurantId}/{tableId}` with `menuLayout = BUNDLE`

**Same header and category tabs.**

**Bundle card anatomy (full-width, one per item):**
```
┌──────────────────────────────────────────────────────┐
│  [Full-width image, aspect 16:7]                     │
│──────────────────────────────────────────────────────│
│  MEAL SET A                     ~~Rp 85.000~~        │
│  Burger + Fries + Minuman       Rp 65.000            │
│                                 [+ Tambah]           │
└──────────────────────────────────────────────────────┘
```
- Card: `mx-4 rounded-xl overflow-hidden shadow-sm border border-stone-100`
- Cards spaced: `space-y-4 pb-4`
- Original price (crossed out): `text-sm text-stone-400 line-through`
- Discounted price: `text-lg font-bold text-[--color-primary]`
- Savings badge: `bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded` — "Hemat Rp 20.000"
- Add button: full-width at bottom — `bg-[--color-primary] text-white h-10 rounded-b-xl`

---

### Screen 5 — Menu Home (Spotlight Layout)

**Route:** `/{restaurantId}/{tableId}` with `menuLayout = SPOTLIGHT`

**No category tabs — all items in one horizontal swipeable carousel.**

**Item card anatomy (one per screen, full-page):**
```
┌──────────────────────────────────┐
│                                  │
│   [Full-width hero image]        │  ← aspect-ratio: 4:3; fills top 55% of viewport
│                                  │
│──────────────────────────────────│
│  Wagyu Sirloin 200g              │  ← Display size (36px, font-bold)
│  Rp 485.000                      │  ← H2, text-[--color-primary]
│                                  │
│  Slow-braised wagyu sirloin...   │  ← text-sm text-stone-600, 4-line clamp
│                                  │
│  [Allergen badges]               │
│  [Chef's note if any]            │
│                                  │
│  [+ Tambahkan ke Pesanan]        │  ← full-width primary button
└──────────────────────────────────┘
      ←  3 / 12  →                 ← pagination indicator below card
```

**Navigation:** Swipe left/right (Framer Motion `drag="x"`) + arrow buttons on desktop.
**Pagination indicator:** `"3 / 12"` in `text-sm text-stone-400` centered below.

---

### Screen 6 — Item Detail Modal (Bottom Sheet)

Triggered by tapping any item card/row in Grid, List, or Bundle layouts.

**Component:** shadcn `Sheet` with `side="bottom"` — slides up from bottom.
**Height:** `max-h-[90vh]` with `overflow-y-auto`. Drag handle at top for swipe-to-dismiss.

**Content (top to bottom, scrollable):**
1. **Item Image** — full-width, `aspect-ratio: 16/9`, `object-cover`; no image = gradient placeholder using `--color-primary`
2. **Item Name** — H2, `text-stone-900`
3. **Price** — H3, `text-[--color-primary]`; for BY_WEIGHT: `"Deposit Rp 50.000"` + small note `"(harga akhir ditentukan setelah ditimbang)"`
4. **Badges row** — dietary + allergen badges inline (Halal, Vegetarian, Vegan, Spicy 🌶️, Contains Nuts ⚠️)
5. **Estimated prep time** — `text-xs text-stone-500` — `"⏱ ~15 menit"` (shown only if set)
6. **Description** — `text-sm text-stone-600` (full text, no clamp)
7. **Variants section** (if variants exist) — required selection:
   - Section label: `"Pilih Ukuran *"` (or variant group name)
   - Radio buttons styled as pill chips: `border border-stone-200 rounded-[--border-radius] px-4 py-2 text-sm`
   - Selected: `border-[--color-primary] bg-[--color-primary]/10 text-[--color-primary]`
   - Price delta shown: `"+Rp 5.000"` or `"-Rp 3.000"` in `text-xs text-stone-500`
8. **Add-ons section** (if add-ons exist) — optional multi-select:
   - Section label: `"Tambahan (Opsional)"`
   - Checkbox chips (same style as variants but with checkbox icon)
   - Price shown per add-on
9. **Allergen warning** (if allergens set) — `bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-xs text-amber-800`
10. **Special Request** — textarea, `placeholder="Catatan khusus... (contoh: tidak pedas, tanpa bawang)"`, max 200 chars
11. **Quantity selector** — `[−] [2] [+]` — centered row; quantity cannot go below 1

**Footer (sticky at bottom of sheet):**
```
[Tambahkan ke Pesanan — Rp 70.000]
```
- Full-width primary button
- Shows updated total (base price × qty + variants + add-ons)
- Disabled if required variant not selected

---

### Screen 7 — Cart Sheet / Drawer

Triggered by tapping the sticky bottom cart bar.

**Component:** shadcn `Sheet` with `side="bottom"`.
**Height:** `max-h-[85vh]` with `overflow-y-auto`.

**Content:**
1. **Header:** `"Keranjang Anda"` (H3) + `[×]` close button
2. **Item list** — each cart item row:
   ```
   [Image 48×48]  Item Name           [−] [1] [+]
                  Variant: Large
                  Tambahan: Extra Spicy
                  Rp 45.000           [🗑 Hapus]
   ```
   - Quantity change updates total immediately (optimistic UI)
3. **Promo code field** (if merchant has active promotions with codes):
   - `"Kode Promo"` label + text input + [Gunakan] button
   - Applied promo shown as a dismissible green chip: `"PROMO10 — Hemat Rp 15.000 ✕"`
4. **Order Summary:**
   - Subtotal: `Rp X.XXX`
   - Diskon: `-Rp X.XXX` (shown only if promo applied)
   - Service Charge: `Rp X.XXX` (shown only if > 0)
   - PPN 11%: `Rp X.XXX`
   - **Total: Rp X.XXX** — bold, larger
5. **Upsell prompt** (if `aiUpsell` enabled): `"Tambah minuman? 🥤"` + 2–3 horizontal item chips
6. **Loyalty redemption** (if merchant loyalty enabled + customer logged in):
   - `"Poin Anda: 250 pts = Rp 2.500"` + [Gunakan Poin] toggle
7. **CTA button:**
   - PAY_FIRST mode: `[Lanjut ke Pembayaran]`
   - PAY_AT_CASHIER mode: `[Pesan & Bayar di Kasir]`

**Empty cart state:** `"Keranjang kosong"` with a shopping bag illustration.

---

### Screen 8 — Pre-Invoice / Checkout Screen

**Route:** `/{restaurantId}/{tableId}/checkout`

**Layout:** Full-page (not a modal). Replaces the menu view.

**Back button** at top left: `[← Kembali]` — returns to menu.

**Content sections:**

**Section 1: Order Summary**
- Heading: `"Ringkasan Pesanan"` (H3)
- Item list (read-only, condensed): Name + Qty + Line Total per row
- Divider
- Subtotal, Service Charge, PPN breakdown (each on its own row)
- **Grand Total** — bold, 20px, `text-[--color-primary]`

**Section 2: Metode Pembayaran** (shown only in PAY_FIRST mode)
- Heading: `"Cara Bayar"` (H3)
- Options rendered as radio cards:
  ```
  ◉ QRIS (disarankan)                     [QR icon]
    Bayar dengan GoPay, OVO, DANA, dll.    0.7% biaya

  ○ Transfer Virtual Account               [Bank icon]
    BCA, Mandiri, BNI, dll.                Rp 4.000 biaya

  ○ Kartu Kredit/Debit                     [Card icon]
    Visa, Mastercard                       2.9% biaya
  ```
  - Each option: `border rounded-[--border-radius] p-3 cursor-pointer`
  - Selected: `border-[--color-primary] bg-[--color-primary]/5`

**Section 3: Catatan** (optional customer note — if not yet entered)
- Textarea: `"Catatan untuk dapur... (tidak pedas, dll.)"`, max 200 chars

**Section 4: Login prompt** (for anonymous customers):
- Subtle card: `"Masuk untuk mendapatkan poin loyalty"`
- [Masuk / Daftar] button (secondary) + "Lanjutkan tanpa akun →" link

**Section 5: Loyalty** (if logged in + loyalty enabled):
- Points balance + equivalent IDR
- [Gunakan Poin] toggle

**CTA button (bottom, full-width, sticky):**
- PAY_FIRST: `[Bayar Sekarang — Rp 85.000]`
- PAY_AT_CASHIER: `[Kirim Pesanan — Bayar di Kasir]`

---

### Screen 9 — Payment Processing Screen (QRIS)

After tapping "Bayar Sekarang" in PAY_FIRST mode, customer is redirected to Midtrans Snap redirect URL (full-page redirect — not embedded). This screen is the Midtrans-hosted payment page; FBQR does not control its layout.

**Return from Midtrans:**
- Customer is redirected back to `/{restaurantId}/{tableId}/order/{orderId}?status=finish`
- A brief loading state shown while the webhook status is confirmed server-side
- Loading message: `"Memverifikasi pembayaran Anda..."`
- After webhook confirmation: transition to Order Tracking Screen

**PAY_AT_CASHIER pending state** (after submitting order):
```
┌─────────────────────────────────┐
│  ⏳                             │
│  Menunggu konfirmasi kasir      │
│                                 │
│  Pesanan Anda sedang menunggu   │
│  dikonfirmasi oleh kasir.       │
│  Silakan tunjukkan layar ini    │
│  ke kasir.                      │
│                                 │
│  Order #042                     │
│  Meja 5                         │
│  Total: Rp 85.000               │
└─────────────────────────────────┘
```
- Background: `bg-amber-50`
- Spinner or subtle animated loading indicator
- Updates in real-time via Supabase Realtime — transitions to Order Tracking when cashier confirms

---

### Screen 10 — Order Tracking Screen

**Route:** `/{restaurantId}/{tableId}/order/{orderId}`

**Header:** Same restaurant header as menu. Back button not shown (order is in progress).

**Section 1: Order Confirmation Banner** (shown immediately after payment)
- `"Pesanan diterima! 🎉"` — H2, `text-green-700 bg-green-50 rounded-xl px-6 py-4`
- Animated entrance: scale in from center (Framer Motion)
- Auto-dismisses after 5 seconds or on tap

**Section 2: Order Status Timeline**
```
✅ CONFIRMED — Pesanan dikonfirmasi       19:34
🔄 PREPARING — Sedang disiapkan  ← pulse  19:36
○  READY — Siap diambil
○  COMPLETED — Selesai
```
- Each step: circle icon + label + timestamp (if reached) + actor
- Current active step: animated pulse (see ui-ux.md E.3)
- Completed steps: `text-stone-400` with checkmark
- Status updates via Supabase Realtime without page refresh

**Section 3: Items Ordered**
- Compact list: Qty × Name + variant/addon summary + line total
- BY_WEIGHT items show ⚖️ badge and deposit amount until weighed

**Section 4: Payment Summary**
- Grand Total, payment method badge, payment status badge

**Section 5: READY banner** (shown when order moves to READY)
```
┌─────────────────────────────────────────────────────┐
│  🎉 Pesanan Siap!                                   │
│  Pelayan akan segera mengantarkan pesanan Anda.     │
│  (or: "Silakan ambil pesanan Anda di konter.")      │
└─────────────────────────────────────────────────────┘
```
- `bg-green-100 border border-green-300 rounded-xl px-6 py-4`
- Subtle pulse animation on the banner (draws attention when tab is re-opened)

**Section 6: Call Waiter buttons** (3 buttons, always visible while session is ACTIVE)
```
[📞 Panggil Pelayan]  [🆘 Butuh Bantuan]  [🧾 Minta Struk]
```
- Button style: outlined, `border border-[--color-primary] text-[--color-primary]`
- [Butuh Bantuan] button opens a bottom sheet with a text input for a note

**Section 7: Add More Items button**
- `[+ Tambah Pesanan Lagi]` — secondary button
- Navigates back to menu; creates a new Order linked to same session
- Shown only while session is ACTIVE

**Section 8: Rating prompt** (shown when order reaches COMPLETED)
```
Bagaimana makanannya?
★ ★ ★ ★ ★  ← tappable stars
[Tambahkan komentar... (opsional)]
[Kirim Ulasan]
```
- Stars: large touch targets (`h-10 w-10` each), `text-amber-400` when filled
- Comment textarea: optional, max 500 chars
- After submitting: shows `"Terima kasih atas ulasan Anda! 💛"` confirmation

**Section 9: Invoice download link**
- `[📄 Unduh Invoice PDF]` — text link with `Download` icon
- Shown after order is CONFIRMED

---

### Screen 11 — Error Screens

**Full-page error screens** (for flow interruptions, not recoverable inline errors):

**Restaurant closed / ordering paused:**
```
[Pause icon]
"Restoran Sedang Tutup"
"Dapur sedang sibuk. Silakan coba dalam beberapa menit."
[Coba Lagi]   (refreshes the page)
```

**Session expired:**
```
[Clock icon]
"Sesi Berakhir"
"Sesi meja Anda telah berakhir. Scan ulang QR code untuk memulai sesi baru."
```
- Read-only access: below this message, show existing orders from the expired session in a compact list (view-only, no new actions)

**Table unavailable (DIRTY / RESERVED / CLOSED):**
- Use the same error designs specified in Screen 1 above.

**Order cancelled by cashier:**
```
[X Circle icon]
"Pesanan Dibatalkan"
"Pesanan Anda dibatalkan oleh kasir. Silakan hubungi staff untuk informasi lebih lanjut."
[Hubungi Staff]  (shows WhatsApp button if Restaurant.whatsappNumber is set)
```

**Error screen layout (all):**
- Full-page centered layout: icon (64px) + H2 + body text + optional CTA
- Icon color: `text-stone-300` (neutral, not alarming)
- Background: `bg-[--color-secondary]` or `bg-stone-50`

---

### Screen 12 — Takeaway / Counter Mode

**Counter QR scan:** Same flow as dine-in QR — the QR code at the counter is a special table record with `orderType = TAKEAWAY`. Session and menu load identically.

**Key differences in UI:**
- No table-identifier header (shows `"Takeaway"` instead of table name)
- After placing order: no "Call Waiter" button
- After placing order: shows queue number prominently

**Queue Number Display (post-order confirmation):**
```
┌─────────────────────────────────────┐
│  ← Kembali ke Menu                  │
│                                     │
│  Nomor Antrian Anda                 │  ← text-sm text-stone-500
│                                     │
│         #042                        │  ← Display size (36px), font-black, text-[--color-primary]
│                                     │
│  Pesanan Anda sedang disiapkan      │  ← status text
│                                     │
│  Perhatikan layar antrian           │
│  di area kasir.                     │
└─────────────────────────────────────┘
```
- Queue number: large, prominent, centered
- Status updates via Supabase Realtime

**Order Queue Display Screen (`/kitchen/queue-display`):**
This screen is shown on a dedicated TV or large monitor facing the customer waiting area. It is part of `apps/web/(kitchen)`, not `apps/menu`.

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│    PESANAN SIAP     ← H1, green, centered                           │
│                                                                      │
│   [042]  [047]  [051]  [055]   ← large numbers, grid layout        │
│                                                                      │
│─────────────────────────────────────────────────────────────────────│
│                                                                      │
│    SEDANG DISIAPKAN     ← H1, amber, centered                       │
│                                                                      │
│   [043]  [044]  [048]  [049]  [052]                                 │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

- Full-screen, dark background: `bg-stone-950`
- "PESANAN SIAP" section: large white numbers on `bg-green-700` tiles
- "SEDANG DISIAPKAN" section: large white numbers on `bg-stone-700` tiles
- Number tile: `h-20 w-20 flex items-center justify-center text-3xl font-black rounded-xl`
- New number appearing: slide-in animation (from above for READY, from right for PREPARING)
- READY numbers cleared after configurable duration (merchant setting); fade-out animation
- Restaurant name/logo in top-left corner; branch name in top-right
- Real-time updates via Supabase Realtime (no polling)
