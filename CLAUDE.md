# CLAUDE.md

This file provides guidance for AI assistants (Claude Code and similar tools) working in this repository.

---

## Project Overview

**FBQR** is a SaaS platform for cafes and restaurants in Indonesia.
It enables customers to scan a QR code at their table, browse a digital menu, place orders, and pay — all from their phone, without installing an app.

**Author:** Robin <robinsalim@yahoo.com>
**License:** MIT (copyright 2026)
**Primary Market:** Indonesia (IDR currency, QRIS/OVO/GoPay payments) — designed to expand globally later.

---

## The Four Sub-Systems

| System | Audience | Purpose |
|---|---|---|
| **FBQRSYS** | Platform super-admin | Create/manage merchant accounts, platform-level reports |
| **merchant-pos** | Restaurant owner / staff | Manage menus, promotions, view reports, generate table QR codes |
| **merchant-kitchen** | Kitchen staff | Real-time order queue display, item priority reordering |
| **end-user-system** | Customers | Scan QR → browse menu → order → pay → earn loyalty points |

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Monorepo** | [Turborepo](https://turbo.build/) | Unified build pipeline, shared packages |
| **Frontend** | [Next.js 14+](https://nextjs.org/) (App Router) | SSR, API routes, great DX |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) | Fast, accessible, consistent UI |
| **Database** | [PostgreSQL](https://www.postgresql.org/) via [Supabase](https://supabase.com/) | Free tier, real-time subscriptions, built-in storage |
| **ORM** | [Prisma](https://www.prisma.io/) | Type-safe DB access, easy migrations |
| **Real-time** | [Supabase Realtime](https://supabase.com/docs/guides/realtime) | Live order push to kitchen display |
| **Auth** | [NextAuth.js](https://next-auth.js.org/) + JWT | Email/password for owners, PIN for staff |
| **Payment (customer)** | [Midtrans](https://midtrans.com/) | Indonesia's lowest-fee gateway (QRIS 0.7%) |
| **Payment (merchant billing)** | Midtrans or bank transfer | FBQR collects subscription fees from merchants |
| **Push notifications** | Web Push API (browser-native) | New order alerts to merchant-pos and merchant-kitchen |
| **QR Codes** | [`qrcode`](https://www.npmjs.com/package/qrcode) npm package | Generate per-table QR codes |
| **PDF** | [`@react-pdf/renderer`](https://react-pdf.org/) | Invoice and pre-invoice generation |
| **Email** | [Resend](https://resend.com/) | Transactional email — billing reminders, invoices, notifications |
| **Scheduled Jobs** | [Vercel Cron](https://vercel.com/docs/cron-jobs) | Daily billing checks, auto-lock overdue accounts |
| **File Storage** | Supabase Storage | Menu item images, restaurant logos, invoice PDFs |
| **Hosting** | [Vercel](https://vercel.com/) (Next.js) + [Supabase](https://supabase.com/) | Generous free tiers, auto-scaling |

> **Architecture note:** This project uses a **modular monolith** (not microservices).
> The Turborepo structure enforces clean domain boundaries between sub-systems.
> Individual apps can be extracted into independent services later if scaling demands it,
> but microservices add significant operational overhead that is not worth it at this stage.

---

## Repository Structure

```
FBQR/                              # Monorepo root
├── apps/
│   ├── web/                       # Main Next.js app (FBQRSYS + merchant-pos + merchant-kitchen)
│   │   ├── app/
│   │   │   ├── (fbqrsys)/         # Platform super-admin routes
│   │   │   ├── (merchant)/        # Merchant POS routes
│   │   │   └── (kitchen)/         # Kitchen display routes
│   │   └── ...
│   └── menu/                      # Customer-facing Next.js app (end-user-system)
│       ├── app/
│       │   └── [restaurantId]/
│       │       └── [tableId]/     # Dynamic menu per restaurant + table
│       └── ...
├── packages/
│   ├── database/                  # Prisma schema, migrations, seed scripts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── src/
│   │       └── index.ts           # Re-exports PrismaClient
│   ├── ui/                        # Shared React components (shadcn/ui base)
│   ├── types/                     # Shared TypeScript interfaces and enums
│   └── config/                    # Shared eslint, tsconfig, tailwind configs
├── turbo.json
├── package.json                   # Root package.json (workspaces)
├── .env.example                   # Environment variable template
├── .gitignore
├── LICENSE
├── README.md
└── CLAUDE.md                      # This file
```

---

## Authentication Model

| Role | Auth Method | Scope |
|---|---|---|
| **FBQRSYS admin** | Email + password (JWT) | Full platform access |
| **Merchant owner** | Email + password (JWT) | Their restaurant only |
| **Merchant staff** (cashier, supervisor) | PIN (4–6 digit) | Assigned restaurant/branch |
| **Kitchen staff** | PIN (4–6 digit) | Kitchen display only |
| **Customer (anonymous)** | QR token | Table-scoped session |
| **Customer (registered)** | Email + password / Google OAuth | Loyalty points, order history |

> **Important:** One email = one restaurant. If a merchant owns multiple restaurants, they register a separate account for each. This may be revisited in future.

> **Customer login is optional.** Anonymous QR sessions work for all ordering features. Login unlocks loyalty point earning and order history. This is a future implementation — design the schema for it now, build the UI later.

---

## RBAC — Role-Based Access Control

RBAC is **fully dynamic**. Roles are user-created with any name — the system only provides suggestion templates as a starting point. Nothing is hardcoded except the atomic permission list, which maps directly to code-level access gates.

### How it works

```
Permission   ← System-defined atomic capability (hardcoded, maps to code gate)
    ↑
Role         ← User-created named bundle of permissions (any name, any permissions)
    ↑
RoleTemplate ← System-provided suggestion presets (editable, not enforced)
    ↑
UserRole     ← Assignment of a Role to a Staff member
```

**Permissions are system-defined** because they correspond to actual code checks (`requirePermission(session, 'menu:edit')`). New permissions are only added when new features are built.

**Roles are fully owned by the admin.** An FBQRSYS owner can create a role called "Tim Pemasaran" with only `reports:read`. A merchant owner can create "Koordinator Dapur" with `kitchen:manage` + `orders:view`. Role names are free-form text. Descriptions are optional.

**Templates are suggestions only.** The system shows preset role templates to help new users get started, but they can rename, modify, or delete any template. Templates are never enforced.

### FBQRSYS — System-Defined Permissions

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

#### FBQRSYS Role Templates (suggestions only — owner can rename/modify)

| Suggested Name | Default Permissions |
|---|---|
| Platform Owner | All |
| Merchant Manager | `merchants:create`, `merchants:read`, `merchants:update` |
| Billing Admin | `billing:manage`, `merchants:read`, `merchants:suspend` |
| Analyst | `reports:read`, `merchants:read` |
| Support Staff | `merchants:read` |

### Merchant — System-Defined Permissions

| Permission | Description |
|---|---|
| `menu:manage` | Create/edit/delete menu categories and items |
| `promotions:manage` | Create/edit/delete promotions |
| `reports:read` | View sales and order reports |
| `orders:view` | View current and past orders |
| `orders:manage` | Update order status, cancel orders |
| `kitchen:view` | View kitchen display |
| `kitchen:manage` | Reorder item priority, mark items ready |
| `staff:manage` | Create/edit/delete staff accounts and roles |
| `tables:manage` | Create/edit tables and generate QR codes |
| `settings:manage` | Edit restaurant settings (tax, service charge, etc.) |
| `branding:manage` | Edit restaurant branding (logo, colors, layout) |
| `invoices:read` | View and download invoices |
| `loyalty:manage` | Configure merchant loyalty program |
| `billing:read` | View own FBQR subscription invoices and billing history |

#### Merchant Role Templates (suggestions only — owner can rename/modify)

| Suggested Name | Default Permissions |
|---|---|
| Owner | All |
| Supervisor | `menu:manage`, `promotions:manage`, `reports:read`, `orders:view`, `orders:manage`, `tables:manage`, `invoices:read` |
| Cashier | `orders:view`, `orders:manage`, `invoices:read` |
| Kitchen Admin | `kitchen:view`, `kitchen:manage`, `orders:view` |
| Kitchen Staff | `kitchen:view`, `orders:view` |

> **Owner accounts are special.** The Merchant owner (email + password) always has full access and cannot be stripped of permissions. The FBQRSYS owner (the FBQR platform account) always has full platform access. These are the only hardcoded "super" roles.

---

## Audit Log

Every state-changing action is recorded in the `AuditLog` table.

### What is logged

| Field | Description |
|---|---|
| `actorId` | ID of the user/staff performing the action |
| `actorRole` | Role at time of action |
| `actorName` | Display name (denormalized for historical accuracy) |
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
  │
  ├── MerchantSubscription   ← Active plan (planId, cycle, currentPeriodEnd, autoRenew)
  │     └── MerchantBillingInvoice ← FBQR → merchant invoices (NOT customer invoices)
  │                                   (invoiceNumber, amount, dueAt, paidAt, pdfUrl)
  │
  └── Restaurant[]   ← One merchant can own multiple restaurants (chain support)
        ├── RestaurantBranding   ← Logo, colors, font, layout — shown to customers only
        ├── MerchantSettings     ← Feature flags, payment methods, tax, service charge
        ├── MerchantRole         ← User-created staff roles ([permissions])
        ├── MerchantRoleAssignment ← Links Staff → MerchantRole
        ├── Branch               ← Physical locations
        │     └── Table          ← Each table (QR token, status: AVAILABLE/OCCUPIED/RESERVED/CLOSED)
        ├── MenuCategory         ← layout override, availableFrom/availableTo (time window)
        │     └── MenuItem       ← Price, image, allergens, isHalal, isVegetarian,
        │           │              estimatedPrepTime, stockCount, isAvailable
        │           ├── MenuItemVariant   ← e.g. Small/Medium/Large + price delta
        │           └── MenuItemAddon     ← e.g. Extra Cheese (+5k), No Onion (0)
        ├── Promotion            ← Discounts, combos (linked to MenuItems)
        └── Staff                ← Staff accounts (PIN auth)

── ORDERS ────────────────────────────────────────────────────────────
Order                ← status: PENDING | CONFIRMED | PREPARING | READY | COMPLETED | CANCELLED
  │  orderType: DINE_IN | TAKEAWAY | DELIVERY
  │  queueNumber (int) — auto-increments per restaurant per day for counter/takeaway
  │  platformName (nullable) — GRABFOOD | GOFOOD | SHOPEEFOOD
  │  platformOrderId (nullable) — external delivery platform reference
  │
  ├── OrderItem      ← price snapshot, variant/addon snapshot (JSON), kitchenPriority
  ├── WaiterRequest  ← Customer pressed "Call Waiter"; resolved by staff
  ├── OrderRating    ← Post-completion 1–5 star rating + optional comment from customer
  ├── PreInvoice     ← Generated at checkout (before payment) — not a legal document
  ├── Invoice        ← Generated after payment confirmed — PDF, legal receipt
  └── Payment        ← method: QRIS | GOPAY | OVO | DANA | VA | CASH | CARD
                        status: PENDING | SUCCESS | FAILED | REFUNDED

── CUSTOMERS ─────────────────────────────────────────────────────────
Customer             ← Optional registered account (email / Google OAuth)
  ├── PlatformLoyaltyBalance  ← Cross-restaurant FBQR Points (Phase 2)
  └── MerchantLoyaltyBalance  ← Per-restaurant points + earned title

CustomerSession      ← Scoped to Restaurant + Table + QR token
  └── status: ACTIVE | COMPLETED | EXPIRED

MerchantLoyaltyProgram ← Per-restaurant loyalty config (name, IDR per point, redemption rate)
  └── LoyaltyTier    ← Tier name, threshold, multiplier, custom title, badge (Phase 2)

── PLATFORM ──────────────────────────────────────────────────────────
AuditLog             ← Immutable. actor, action, entity, oldValue, newValue, IP, timestamp
```

### Order Status Lifecycle

```
PENDING     → customer submitted cart, payment not yet initiated
CONFIRMED   → payment successful (Midtrans webhook received)
PREPARING   → kitchen acknowledged and started preparing
READY       → all items marked ready by kitchen
COMPLETED   → order closed (customer received food / table cleared)
CANCELLED   → cancelled before or during preparation (triggers refund flow if CONFIRMED)
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
- `merchant-kitchen` blocked
- Customer scanning a table QR sees: "This restaurant is temporarily unavailable. Please ask staff for assistance."
- `end-user-system` does NOT expose any menu or ordering capability

---

## Merchant Subscription & Billing (FBQRSYS → Merchant)

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

### Merchant Onboarding Flow

```
FBQRSYS admin creates Merchant account (email + temp password)
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

> **Self-service vs admin-assisted:** Trial signup can be self-service (merchant registers themselves) or admin-created. Both paths must be supported.

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

Description: FBQR {PlanName} Subscription — {period}
Amount: Rp {amount}
Tax (PPN 11%): Rp {tax}
Total: Rp {total}

Payment: {method} — {status}
```

### Subscription Status in merchant-pos

Merchant owners (with `billing:read`) see:
- Current plan name and renewal date in their settings
- Download all their FBQR subscription invoices
- Upgrade/downgrade plan button (future: self-service)
- Payment method management (future: self-service)

---

## End-User System — Complete QR Flow

### 1. Customer scans QR

```
Customer's phone camera scans table QR code
    │
    ▼
URL decoded: https://menu.fbqr.app/{restaurantId}/{tableId}?token={uuid}
    │
    ▼
Server validates:
  - Token matches table record
  - Restaurant status = ACTIVE (not SUSPENDED or CANCELLED)
  - Table status ≠ CLOSED
    │
    ├── Invalid/expired token → show error: "This QR code is invalid. Please ask staff."
    ├── Restaurant SUSPENDED → show: "This restaurant is temporarily unavailable."
    └── Valid → create or resume CustomerSession → load branded menu
```

### 2. Menu experience

- Restaurant branding (colors, logo, font) applied via CSS variables on first load
- Menu layout rendered per restaurant default + per-category overrides
- **Dietary / allergen badges** shown per item: Halal ✅, Vegetarian 🌿, Vegan 🌱, Contains Nuts ⚠️, Dairy ⚠️, Spicy 🌶️
- **Out-of-stock items** shown greyed out with "Habis" (sold out) label — not orderable
- **AI recommendations** shown if enabled: bestsellers highlighted, time-appropriate items surfaced
- **Category time windows**: categories with `availableFrom`/`availableTo` only appear during their window (e.g. "Sarapan" only shows 06:00–11:00)
- Search bar available in List layout and optionally in others
- Estimated prep time shown per item (optional, if merchant sets it)

### 3. Building the cart

- Tap item → item detail modal (image, description, variants, add-ons, allergens)
- Select variant (required if variants exist) → select add-ons (optional)
- Add to cart → sticky cart bar updates at bottom of screen
- Can adjust quantities in cart or remove items
- Upsell prompt shown if `aiUpsell` enabled ("Tambah minuman?" at appropriate moment)

### 4. Checkout

- Customer reviews cart → pre-invoice shown (itemized + tax + service charge + total)
- Optional: customer logs in / creates account to earn loyalty points
- If merchant loyalty enabled and customer is logged in: redeemable points shown + option to apply discount
- Select payment method (merchant-configured: QRIS default, others optional)
- QRIS payment: Midtrans generates QR → customer scans with e-wallet
- Non-QRIS: redirect to Midtrans hosted payment page

### 5. Post-payment (customer view)

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

### 6. "Call Waiter" feature

- Always visible button on the menu and order tracking screen
- Creates a `WaiterRequest` record (restaurantId, tableId, message, requestedAt)
- Pushes real-time notification to merchant-pos floor view
- Staff marks request as resolved
- Logged in AuditLog

### 7. Multi-order sessions

- Customers can place multiple orders per table session (e.g. order mains, then later order dessert)
- Each "Add More Items" creates a new `Order` linked to the same `CustomerSession`
- All orders from the same session are visible together on the order tracking screen
- Kitchen sees all orders grouped by table

### 8. Session end

- FBQRSYS or merchant-pos can close a table session (e.g. after customer leaves)
- Table status reverts to AVAILABLE
- CustomerSession status → COMPLETED
- Loyalty points (if applicable) are credited at session close

---

## Order Flow

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

[MERCHANT-POS]
Real-time order status visible → reports updated
Loyalty points credited to customer (if registered + loyalty enabled)
```

```
Customer scans QR (encoded: restaurantId + tableId + token)
    │
    ▼
end-user-system loads branded menu for that restaurant/table
    │
    ▼
Customer builds cart (sees best-seller highlights, upsell prompts, personalized suggestions)
    │
    ▼
Customer reviews cart → Pre-invoice generated (itemized, shows tax + service charge)
    │
    ▼
Customer optionally logs in to earn loyalty points
    │
    ▼
Payment via Midtrans (QRIS recommended — 0.7% fee)
    │
    ▼
Midtrans webhook → FBQR API marks Order as PAID
    │
    ▼
Invoice generated (PDF) → available via link / shareable / email
    │
    ▼
Supabase Realtime pushes new order to merchant-kitchen display
    │
    ▼
Kitchen sees order queue → can reorder item priority (drag or arrow controls)
    │
    ▼
Kitchen marks items as PREPARING → READY
    │
    ▼
merchant-pos sees real-time order status + can generate reports
    │
    ▼
(if customer registered) loyalty points credited to their account
```

---

## QR Order Security

> **Common concern: a customer saves the QR code and makes a fake or repeated order without being present.**
> The design deliberately avoids requiring cashier approval for every order — that re-introduces human bottleneck and defeats the self-service model. Instead, the system uses layered defences that make a "fake order" either harmless or economically irrational.

### Primary defence: payment confirms the order

**An order does not reach the kitchen until Midtrans confirms payment.**

```
Customer submits cart
    │
    ▼
Order created with status: PENDING   ← exists in DB, invisible to kitchen
    │
    ▼
Customer completes payment (Midtrans QRIS / GoPay / VA / etc.)
    │
    ▼
Midtrans webhook → FBQR API
    │
    ├── Payment verified → Order status: CONFIRMED → pushed to kitchen
    └── No webhook / failed payment → Order stays PENDING → auto-expires after 15 min
```

A saved QR code gives someone access to the ordering UI — but they still have to pay real money for any order to be processed. There is no way to inject a fake `CONFIRMED` status without controlling the Midtrans server or the FBQR webhook endpoint (which requires the Midtrans server key, server-side only).

**For cash orders ("Bayar di Kasir"):** cash follows the same gate logic — the kitchen only receives the order after explicit confirmation. The confirming party is the cashier instead of Midtrans.

```
Customer selects "Bayar di Kasir" → submits cart
    │
    ▼
Order created: status PENDING, paymentStatus: PENDING_CASH
Kitchen does NOT see this order yet
    │
    ▼
Alert sent to merchant-pos: "New cash order at Table X — awaiting cashier approval"
    │
    ▼
Cashier reviews order → collects cash → taps [Confirm & Send to Kitchen]
    │
    ├── Confirmed → Order status: CONFIRMED → routed to kitchen (same flow as digital)
    └── Rejected  → Order cancelled, customer notified on their screen
```

**The rule is simple: no order — digital or cash — ever reaches the kitchen without a confirmation step.**
- Digital: Midtrans webhook confirms payment
- Cash: cashier taps confirm after collecting money

Additional safeguards for cash:
- `CASH` payment method is **off by default** — merchant must explicitly enable it per restaurant
- Rate limiting caps simultaneous `PENDING_CASH` orders per session
- Merchant can disable `CASH` entirely from settings if misuse occurs

### Secondary defences

| Defence | How it works |
|---|---|
| **Token rotation on session close** | When staff close a table session, the table's QR token is regenerated. The old saved QR becomes immediately invalid. New customers get a fresh QR with a new UUID. |
| **Session expiry** | `CustomerSession` has a configurable TTL (default: 4 hours). An expired session rejects new orders even with a valid token. |
| **Token scoped to table + restaurant** | The URL encodes `restaurantId + tableId + token`. Even if someone brute-forces a token, it only works for one specific table at one restaurant — not the whole platform. |
| **Rate limiting per session** | Max N `PENDING` orders per `CustomerSession` at one time (configurable, default: 3). Prevents order flooding. |
| **Midtrans webhook signature verification** | All webhook calls are verified using Midtrans's SHA512 signature. Only legitimate Midtrans callbacks can flip an order to `CONFIRMED`. |
| **Server-side key isolation** | `MIDTRANS_SERVER_KEY` is server-only (never in client bundle). Client only receives a one-time `snap_token` per transaction. |

### What a "fake order" actually achieves

If someone scans a saved QR and submits a cart:
- They see the menu (read-only — no business harm)
- They create a `PENDING` order that auto-expires after 15 minutes
- **Nothing reaches the kitchen** unless they actually pay
- If they pay, the merchant receives real revenue for a real order — not "fake" at all

The only realistic attack is a **prank order with real payment** — someone pays to send food to a table they are not at. This is the same risk as any restaurant that accepts phone-in or online orders. It is considered acceptable risk; a cashier-approval gate would not meaningfully prevent it (the prank caller could pay anyway).

### Design rationale

> **Why not require cashier approval for every order?**
> Cashier approval re-introduces a human bottleneck that the QR system is designed to eliminate. It also fails at scale (multiple simultaneous orders, understaffed shifts) and degrades customer experience (customer waits for acknowledgement before kitchen even starts). Payment confirmation by Midtrans is a stronger, faster, and fully automated guard.

> **Alternative considered: time-lock the QR (expire token every 30 min).**
> Rejected as primary defence — it increases operational burden (staff must reprint QRs or customers scan a lobby display QR on arrival). Token rotation on session close is sufficient and only happens when the table is actually turned over.

> **AI agent improvement suggestion area:** Consider whether table-level rate limiting (max N orders per table per hour) adds enough value to justify the configuration complexity. Also consider: should FBQR detect anomalous ordering patterns (same table, 20 orders in 10 minutes) and auto-flag for merchant review?

---

## Kitchen Order Priority

The kitchen display shows all active `OrderItem` rows, grouped by order but sortable globally.

- Each `OrderItem` has a `kitchenPriority` integer field (default: order of insertion)
- Kitchen staff can drag-and-drop or use up/down controls to reprioritize
- Priority changes are real-time (Supabase Realtime broadcast) so all kitchen screens stay in sync
- Priority reordering is logged in `AuditLog` with actor = kitchen staff

**Example:** Three items arrive — Burger (pos 1), French Fries (pos 2), Salad (pos 3).
Kitchen moves Salad to pos 2 and French Fries to pos 3. Burger and Salad are prepared first.

---

## Kitchen Station Routing

> **Upgraded from backlog to core feature.** Any restaurant with a bar, patisserie, or separate prep area needs orders routed to the right station automatically. Without this, staff manually relay items — which is error-prone and defeats the purpose of a digital system.

### How it works

Merchants create named **Kitchen Stations** from `merchant-pos` settings. Each station maps to one or more `MenuCategory` records. When an order is placed, `OrderItem`s are automatically routed to the station that owns their category.

```
KitchenStation  ← merchant-defined (free-form name, e.g. "Bar", "Kitchen", "Patisserie")
    ↑
MenuCategory    ← assigned to one KitchenStation (or null = default kitchen)
    ↑
MenuItem        ← inherits station from its category (override optional per item)
    ↑
OrderItem       ← routed to station at order time; station stored as snapshot
```

### Schema additions

| Model | Field | Type | Notes |
|---|---|---|---|
| `KitchenStation` | `id` | string | UUID |
| `KitchenStation` | `restaurantId` | string | Scoped to restaurant |
| `KitchenStation` | `name` | string | Free-form, e.g. "Bar", "Hot Kitchen", "Cold Kitchen", "Patisserie" |
| `KitchenStation` | `displayColor` | string? | Hex color for UI badge — helps staff visually distinguish stations |
| `KitchenStation` | `isActive` | bool | Toggle station without deleting |
| `MenuCategory` | `kitchenStationId` | string? | Null = route to default station |
| `MenuItem` | `kitchenStationOverride` | string? | Per-item override (e.g. a drink item in a food category) |
| `OrderItem` | `kitchenStationId` | string | Snapshot at order time — not a live FK |

### Display behaviour

- `merchant-kitchen` shows a **station filter tab bar** at the top: "All" + one tab per active station
- Each station tab shows only the `OrderItem`s routed to it
- Station badge (colored pill) is shown on each `OrderItem` card in the "All" view so staff know at a glance which station is responsible
- A station can optionally be set to a **dedicated device** — e.g. the bar tablet only shows the "Bar" tab by default. This is set in the station config, not locked — staff can always switch tabs

### Configuration flow (merchant-pos)

```
Settings → Kitchen Stations
    │
    ├── Create station: name + color
    ├── Assign categories to station (multi-select dropdown)
    └── Per-item overrides available in menu item edit view
```

### Default station

If a `MenuCategory` has no `kitchenStationId` set, its items route to the restaurant's designated **default station** (configurable, defaults to the first created station). This ensures no order item is ever unrouted.

### Design rationale

> **Why assign at the category level rather than item level?**
> In practice, a merchant thinks "all Drinks go to the Bar" — not item by item. Category-level assignment covers 95% of cases with zero per-item configuration. Per-item override exists for edge cases (e.g. a "Mocktail" item inside a "Dessert" category that should actually go to the bar). This matches how real kitchens are organized and minimises setup friction.

> **Why snapshot the stationId on OrderItem instead of joining live?**
> Same reason prices are snapshotted — if a merchant later reassigns a category to a different station, historical orders must still show the station that actually received them. Immutable historical records are more important than normalisation here.

> **Alternative considered: route by item tag instead of category.**
> Rejected — more flexible but significantly more configuration burden. Tags would require merchants to tag every item. Categories are already a natural grouping they maintain.

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
Format: `INV-{YYYYMMDD}-{sequence}` — e.g. `INV-20260309-0042`
Sequence resets daily per restaurant.

---

## Restaurant Branding (RestaurantBranding)

> **Scope:** FBQRSYS itself is **never** white-labeled — it always shows the FBQR platform identity. The `merchant-pos` and `merchant-kitchen` apps display the restaurant name but retain FBQR's own UI chrome.
>
> **Only the `end-user-system` (customer-facing menu app) is fully branded per restaurant.** Customers see the restaurant's identity — they may not be aware FBQR is the underlying platform.

Each restaurant configures its customer-facing branding. Settings can be set by FBQRSYS admin or by the merchant owner.

| Field | Description |
|---|---|
| `logoUrl` | Restaurant logo shown in menu header |
| `bannerUrl` | Optional hero banner image at top of menu |
| `primaryColor` | Primary brand color (hex) — buttons, highlights, CTAs |
| `secondaryColor` | Secondary brand color (hex) — backgrounds, accents |
| `fontFamily` | Font from a curated list (Inter, Poppins, Lato, Playfair Display, etc.) |
| `borderRadius` | UI rounding style: `sharp` / `rounded` / `pill` |
| `menuLayout` | Default menu layout for the restaurant (see Menu Layout section) |
| `customCss` | Optional raw CSS overrides (FBQRSYS admin only — sanitized before storage) |

Branding is fetched once per customer session and applied via CSS custom properties (`--color-primary`, etc.).
Changes take effect immediately without a rebuild.

---

## Dynamic Menu Layouts

The `end-user-system` (customer menu app) supports **4 layout modes**. Each restaurant sets a default layout, and each `MenuCategory` can independently override it.

> **Design principle:** Mobile-first, one hand, zero learning curve. The customer has never seen this menu before and is probably on 4G with their thumb. Every layout must be fast, scannable, and frictionless to add items.

### Layout Modes

#### 1. Grid (Cafe style)
Best for: cafes, bakeries, bubble tea, dessert shops — many visually appealing items.

```
[Food] [Drinks] [Snacks] ← sticky category tabs
┌──────┬──────┬──────┐
│  🎂  │  ☕  │  🥐  │
│Cake  │Latte │Crois.│
│ 25k  │ 28k  │ 18k  │
├──────┼──────┼──────┤
│  🍮  │  🧁  │  🍵  │
│Pudd. │Muffin│Matcha│
│ 22k  │ 20k  │ 26k  │
└──────┴──────┴──────┘
          [Cart: 2 items · 46k]  ← sticky
```
- 2-3 column grid depending on screen width
- Image-first cards, name + price below
- Category tabs pinned at top, scroll-spy active

#### 2. Package / Bundle style
Best for: fast casual, lunch set restaurants, value meals, family restaurants.

```
┌─────────────────────┐
│ 🍔🍟🥤  MEAL SET A  │
│ Burger + Fries +    │
│ Drink               │
│ ~~85k~~  → 65k      │
├─────────────────────┤
│ 🍗🍚🥗  MEAL SET B  │
│ Chicken + Rice +    │
│ Salad               │
│ ~~75k~~  → 58k      │
└─────────────────────┘
```
- Full-width card per item/combo
- Prominently shows bundle contents and savings
- Crossed-out original price for perceived value
- Works alongside other layouts (e.g. combos use Bundle, drinks use List)

#### 3. List (Kiosk style)
Best for: kiosks, warungs, food courts, restaurants with 50+ items.

```
🔍 Search menu...
─────────────────────
[img] Nasi Goreng    75k
      Fried rice w/ egg
─────────────────────
[img] Mie Ayam       55k
      Chicken noodle soup
─────────────────────
[img] Soto Ayam      50k
      Spiced chicken broth
─────────────────────
```
- Dense, scannable, text-forward
- Small thumbnail (48×48) on the left
- Name + short description + price in one row
- Search bar always visible at top
- Category filter sidebar or horizontal chip row

#### 4. Spotlight (Fine dining style)
Best for: fine dining, omakase, small curated menus (under 20 items), premium casual.

```
┌─────────────────────┐
│                     │
│    [LARGE PHOTO]    │
│                     │
│  Wagyu Sirloin      │
│  Grade A5 · 250g    │
│                     │
│  Slow-braised with  │
│  truffle demi-glace │
│  and seasonal veg.  │
│                     │
│         Rp 485.000  │
│   [+ Add to order]  │
└─────────────────────┘
     ← 3 of 12 →
```
- One item per screen section (scroll to next)
- Full-width hero image, large
- Extended description, chef notes, allergen info
- Pagination indicator ("3 of 12")
- Emphasis on storytelling over scanning

### Per-Category Layout Override

`MenuCategory` has an optional `menuLayoutOverride` field. When set, that category renders in its own layout regardless of the restaurant default.

**Example:** A restaurant's default is Grid.
- Category "Signature Dishes" → override to Spotlight
- Category "Drinks" → override to List
- Category "Today's Sets" → override to Package
- Category "Sides & Snacks" → uses default (Grid)

### Configuration

Both `Restaurant.menuLayout` and `MenuCategory.menuLayoutOverride` use the enum:
```
GRID | BUNDLE | LIST | SPOTLIGHT
```

Merchants configure this from the branding/menu settings page in `merchant-pos`.
Preview renders in real-time in the settings UI before saving.

---

## Payment Gateway — Midtrans

Fee structure (for merchant reference):
- **QRIS:** 0.7% (recommended — lowest fee, covers all e-wallets via one QR)
- **GoPay / OVO / DANA:** 2%
- **Virtual Account:** Rp 4,000 flat per transaction
- **Credit/Debit Card:** ~2.9%

Default payment method presented to customers: **QRIS**.
Merchants can configure which payment methods to offer from their settings.

---

## Tax & Service Charge

Configurable per restaurant in `MerchantSettings`:

| Setting | Default | Notes |
|---|---|---|
| `taxRate` | `0.11` (11%) | PPN — standard Indonesia VAT |
| `taxLabel` | `"PPN"` | Display label |
| `serviceChargeRate` | `0.00` | Optional service charge (e.g. 5–10%) |
| `serviceChargeLabel` | `"Service"` | Display label |
| `pricesIncludeTax` | `false` | If true, displayed prices are tax-inclusive |

---

## Menu Item — Full Field Specification

| Field | Type | Notes |
|---|---|---|
| `name` | string | Display name |
| `description` | string | Short description (shown in item detail) |
| `price` | int | IDR, no decimals |
| `imageUrl` | string | Supabase Storage path |
| `isAvailable` | bool | Soft toggle — hides from menu without deleting |
| `stockCount` | int? | If set, decrements per order; auto-marks unavailable at 0 |
| `estimatedPrepTime` | int? | Minutes — shown to customer ("~15 min") |
| `isHalal` | bool | Shows Halal badge |
| `isVegetarian` | bool | Shows Vegetarian badge |
| `isVegan` | bool | Shows Vegan badge |
| `allergens` | string[] | e.g. `["nuts", "dairy", "gluten"]` — shown as warning badges |
| `spiceLevel` | int? | 0 = none, 1 = mild, 2 = medium, 3 = hot — shown as 🌶️ count |
| `sortOrder` | int | Display order within category |
| `deletedAt` | datetime? | Soft delete — preserved in order history |

## Menu Category — Full Field Specification

| Field | Type | Notes |
|---|---|---|
| `name` | string | Category name |
| `imageUrl` | string? | Optional category header image |
| `sortOrder` | int | Display order |
| `menuLayoutOverride` | enum? | `GRID` / `BUNDLE` / `LIST` / `SPOTLIGHT` — overrides restaurant default |
| `availableFrom` | time? | If set, category only shows after this time (e.g. `06:00`) |
| `availableTo` | time? | If set, category only shows before this time (e.g. `11:00`) |
| `isActive` | bool | Toggle entire category without deleting |

**Time-based availability example:** A "Sarapan" category with `availableFrom: 06:00`, `availableTo: 11:00` is only shown to customers between 6am and 11am WIB. Outside that window, the category is hidden entirely from the menu.

## Menu Item Variants & Add-ons

Each `MenuItem` can have:
- **Variants** (mutually exclusive): e.g. Size → Small / Medium / Large, each with its own price delta
- **Add-ons** (optional, multi-select): e.g. Extra Cheese (+5,000), No Onion (0), Extra Spicy (+0)

Both are displayed in the `end-user-system` when the customer taps an item.
Selections are stored per `OrderItem` as a JSON snapshot (not foreign keys) to preserve historical accuracy.

---

## Table Status Management

Each `Table` has a `status` field:

| Status | Description |
|---|---|
| `AVAILABLE` | No active session |
| `OCCUPIED` | Active customer session |
| `RESERVED` | Reserved (future: reservation system) |
| `CLOSED` | Temporarily unavailable |

Status updates automatically when a `CustomerSession` starts or ends.
merchant-pos shows a real-time floor map of table statuses.

---

## AI / Smart Recommendation Features

All features are **configurable per merchant** via `MerchantSettings`. Merchants can enable/disable each independently.

| Feature | Setting Key | Description |
|---|---|---|
| **Best-seller highlights** | `aiShowBestsellers` | Items ranked by order frequency in the last 30 days |
| **Personalized suggestions** | `aiPersonalized` | Based on current cart (collaborative filtering on order history) |
| **Upsell prompts** | `aiUpsell` | "Add a drink?" suggestions at checkout |
| **Time-based recommendations** | `aiTimeBased` | Breakfast/lunch/dinner items surfaced by time of day |

All recommendation logic runs server-side on API routes. No external AI service required initially — pure SQL analytics. Can be upgraded to an ML model later.

---

## Customer Loyalty — Two-Tier System

Loyalty is split into two independent tiers. Schema is designed now; UI is Phase 2.

### Tier 1: FBQR Platform Loyalty (Phase 2)

Customers earn **FBQR Points** across *all* restaurants that use the FBQR platform.

- Earned on every order at any FBQR-powered restaurant, regardless of which one
- Redeemable for platform-wide rewards (discounts, free items, FBQR credits)
- Managed by FBQRSYS — merchants have no control over this tier
- Gives customers a reason to prefer FBQR-powered restaurants over non-FBQR ones
- Phase 2 gamification: platform-wide leaderboards, "power diner" badges, streak rewards

### Tier 2: Merchant Loyalty (opt-in per restaurant, Phase 1 schema / Phase 2 UI)

Each restaurant can run its own independent loyalty program if enabled in `MerchantSettings`.

- Merchant sets program name (e.g. "Sakura Points", "Kopi Emas Club"), exchange rate (IDR per point), and redemption rules
- Points are scoped to that restaurant only — do not transfer between restaurants
- Customer earns points on orders at that restaurant; redeems for discounts at checkout
- Merchants view top customers and loyalty analytics in merchant-pos reports

#### Gamification — Phase 2

Merchant loyalty supports gamified tiers and titles:

| Example | Detail |
|---|---|
| **Custom titles** | Frequent visitor to a Japanese restaurant earns the title "Japan-kun". A ramen regular becomes "Ramen Shogun". Titles are fully customizable by the merchant |
| **Tier thresholds** | Bronze / Silver / Gold (or custom tier names) with different point multipliers and benefits |
| **Streaks** | "Visited 5 weeks in a row" badge — encourages return visits |
| **First-time visitor reward** | Auto-trigger bonus points on first order at a restaurant |

Schema (`LoyaltyTier`, title field on `MerchantLoyaltyBalance`) is designed to support all of the above from day one, even if the UI ships later.

---

## Competitive Intelligence — China & Singapore QR Systems

Research into the two most mature QR ordering markets informs key FBQR decisions.

### China (WeChat / Alipay / Meituan)

- **98% of Chinese restaurants** use QR-based ordering
- Ordering flows entirely through **WeChat or Alipay Mini Programs** — no browser, no install
- Payment fees: WeChat Pay 0.6%, Alipay 0.55% — the benchmark for low-cost QR payments
- **Group ordering** (collaborative shared cart): Multiple phones at the same table add items simultaneously; each person's avatar appears next to their items — the most socially natural group dining UX in the world
- **AI capabilities:** Meituan's "Xiaomei" voice agent, personalized flash coupons, demand forecasting; Ele.me's recommendation engine uses weather + location. Shanghai targets 70%+ AI penetration in F&B by 2028
- **Loyalty:** Deeply integrated into WeChat Wallet; points, tiers, and coupons in a unified view. Alipay loyalty reported 47.5% repurchase rate lift for participating merchants
- **Kitchen:** Multi-station routing (wok / cold kitchen / beverages), multilingual ticket printing, 300+ POS config options (Eats365), real-time inventory auto-deduction
- **Weaknesses:** Forced data collection (phone number + WeChat follow required before ordering), QR code security vulnerabilities (spoofing/phishing incidents), elderly digital exclusion, platform fragmentation across Meituan/Ele.me/WeChat/Alipay

### Singapore (SGQR / TabSquare / Foodpanda)

- **SGQR:** World's first unified QR label — one code, 22+ payment schemes (GrabPay, PayLah!, NETS, PayNow, WeChat Pay, etc.)
- Payment fees: PayNow personal QR = **0% (free)**, NETS SGQR = 0.5–0.8%, compared to QRIS Indonesia 0.7% — broadly equivalent
- **Government digitisation (Hawkers Go Digital):** 11,500+ hawker stalls enrolled, 33% YoY transaction value growth. Key lesson: financial subsidies + human ambassador onboarding drove adoption, not just UX quality
- **TabSquare (AI-powered, market leader):** Documented **25%+ lift in average order value** from AI SmartMenu recommendations. Dynamic upselling produced 10% upsell revenue increase in 6 months at local chains. 12M diners/yr, SGD 200M GMV
- **Foodpanda + TabSquare dine-in:** 8,000+ restaurants across 7 SEA countries. 15–25% dine-in discounts used as customer acquisition tool
- **Loyalty fragmentation:** GrabRewards, Panda Pro, bank credit card programs, and standalone restaurant apps operate independently — no unified loyalty layer across channels
- **Weaknesses:** No super-app equivalent to WeChat, 80% of transactions still offline, back-of-house tech lag for SMEs, government subsidy cliff (NETS MDR subsidy ends mid-2026)

### 10 Direct Implications for FBQR

| # | Insight | FBQR Action |
|---|---|---|
| 1 | **Table-scoped QR is the right architecture** | ✅ Already designed — unique UUID per table, restaurant+table encoded in URL |
| 2 | **Zero-install is non-negotiable** — both markets prove download requirements destroy conversion | ✅ Browser-based `apps/menu` — no app install required |
| 3 | **Group ordering is a high-value differentiator** — China's collaborative cart fits Indonesia's group dining culture | 🔲 Add to backlog: shared cart with per-person item attribution |
| 4 | **QRIS at 0.7% is competitive** — WeChat Pay 0.6%, SGQR 0.5–0.8% — on par with global best | ✅ Midtrans QRIS as default payment method |
| 5 | **AI upselling has proven, measurable ROI** — TabSquare 25% AOV lift is the strongest industry data point | ✅ AI recommendation engine planned (all 4 types, merchant-configurable) |
| 6 | **Forced data collection is a trust and reputation risk** — China's backlash is a clear warning | ✅ Customer login is opt-in; anonymous QR sessions are first-class |
| 7 | **Loyalty unification is a market gap in SEA** — Singapore's fragmented loyalty is an opportunity | ✅ FBQR loyalty layer tied to customer account, not platform-specific |
| 8 | **Kitchen multi-station routing matters at scale** — needed for larger restaurants | 🔲 Add to backlog: route `OrderItem` to kitchen station by category |
| 9 | **Warung/informal segment needs a simplified mode** — Singapore's hawker programme confirms this | 🔲 Add to backlog: "Lite mode" for single-stall operators, minimal setup |
| 10 | **Privacy by design must be foundational** — build explicit consent and minimal data collection from day one | 🔲 Add to backlog: privacy consent flow, clear opt-in for loyalty data |

---

## Takeaway / Counter Mode

> **Critical gap for chain and counter-service restaurants.** The current architecture assumes dine-in table QR. Counter-service operators (fried chicken chains, warungs, food courts) need a fundamentally different flow.

`Order.orderType` enum: `DINE_IN | TAKEAWAY | DELIVERY`

### Counter / Takeaway Flow

```
Customer walks up to counter
    │
    ├── Option A: Scan QR at counter (like table QR but without a table)
    ├── Option B: Staff inputs order on merchant-pos
    └── Option C: Order comes in from delivery platform (GrabFood/GoFood)
    │
    ▼
Customer gets an order queue number (e.g. "Order #042")
    │
    ▼
Order queue display (large screen facing customers) shows pending + ready numbers
    │
    ▼
Kitchen prepares → marks READY → display highlights #042 as ready
    │
    ▼
Customer collects at counter
```

### Order Queue Display

A separate screen/view (`/kitchen/queue-display`) for customer-facing use:

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
- Designed to be shown on a TV or tablet facing the customer waiting area
- Updates in real-time via Supabase Realtime
- Order numbers auto-generated per restaurant per day (resets at midnight)
- Ready numbers shown for configurable duration, then cleared

### Cash / "Pay at Counter" Option

Some customers — especially at warungs and older demographics — pay cash.

- Merchant can enable `CASH` as a payment option per restaurant (off by default)
- Customer selects "Bayar di Kasir" at checkout — order submitted with `paymentStatus: PENDING_CASH`
- Order sits in `merchant-pos` queue, **not yet sent to kitchen**
- Cashier collects cash → taps [Confirm & Send to Kitchen] → order status moves to `CONFIRMED` → routed to kitchen
- `Payment.method: CASH`, `Payment.amount` entered by cashier at confirmation
- Cash orders appear in reports separately from QRIS/digital payments

---

## Delivery Platform Integration (GrabFood / GoFood / ShopeeFood)

> **Deal-breaker for chain operators.** Delivery orders likely represent 30–50% of a chain's revenue. If FBQR doesn't handle them, merchants run two parallel systems — and FBQR loses.

### Integration Approach

Each platform provides webhooks or APIs when an order is placed. FBQR receives these and creates a standard `Order` record with `orderType: DELIVERY`.

| Platform | Integration Method | Notes |
|---|---|---|
| **GrabFood** | GrabFood Merchant API + webhook | Available for registered partners |
| **GoFood (Gojek)** | Gojek Merchant API | Most popular in Indonesia |
| **ShopeeFood** | ShopeeFood Merchant API | Growing rapidly in Indonesia |

### Unified Kitchen View

Delivery orders appear on `merchant-kitchen` exactly like dine-in orders — same queue, same priority controls. Kitchen staff see order type badge (🛵 Delivery / 🪑 Dine-in / 🥡 Takeaway) but the workflow is identical.

Delivery-specific fields on `Order`:
- `platformName`: `GRABFOOD | GOFOOD | SHOPEEFOOD`
- `platformOrderId`: external reference
- `deliveryAddress`: customer address (if relevant for display)
- `estimatedPickupTime`: when the driver will arrive

> **Phase 1:** Manual integration — delivery orders entered by staff on merchant-pos. **Phase 2:** Automated webhook integration per platform.

---

## Multi-Restaurant Per Merchant Account

> **Deal-breaker for chains.** A chain owner with 8 branches cannot manage 8 separate accounts. However, multi-branch capability is a premium feature controlled by FBQRSYS — merchants do not self-provision additional restaurants.

### Data model

```
Merchant (owner account)
  └── Restaurant[]    ← can own multiple restaurants (enabled by FBQRSYS admin)
        └── Branch[]  ← each restaurant has branches (also added by FBQRSYS admin)
```

### How multi-branch is enabled (EOI flow)

Multi-branch is **not self-service**. The merchant cannot add restaurants or branches themselves. This keeps FBQRSYS in control of plan enforcement and prevents feature abuse.

```
Merchant submits an Expression of Interest (EOI)
    │  (via email, contact form, or phone — no in-app flow required)
    │
    ▼
FBQRSYS admin reviews the request
    │
    ├── Approves → admin opens merchant's account in FBQRSYS panel
    │               → enables multi-restaurant flag on the Merchant record
    │               → adds each Restaurant one by one (name, address, contact)
    │               → adds each Branch under the appropriate Restaurant
    │               → merchant immediately sees new restaurant(s) in their switcher
    │
    └── Rejects / requests more info → admin contacts merchant directly
```

FBQRSYS admin controls:
- Whether the merchant has multi-restaurant capability (`Merchant.multiBranchEnabled: bool`)
- How many restaurants / branches the merchant is allowed (`Merchant.restaurantLimit: int`, driven by their plan)
- Which plan tier the new restaurant is on (each restaurant billed separately, or chain plan covers all)

### What the merchant sees after activation

- A persistent restaurant switcher at the top of `merchant-pos`
- Each restaurant and its branches listed, switchable with one click
- "All Restaurants" aggregate view in the dashboard
- Staff accounts remain scoped to one restaurant — they do not see the switcher

### What each restaurant owns independently

- Menu, branding, promotions, staff, tables
- Subscription (each restaurant can be on a different plan, or covered by a chain plan)
- Reports (viewable individually or aggregated in the chain view)
- Audit log (scoped per restaurant)

### Schema fields

| Model | Field | Notes |
|---|---|---|
| `Merchant` | `multiBranchEnabled` | bool — set by FBQRSYS admin only |
| `Merchant` | `restaurantLimit` | int — max restaurants allowed under this merchant account |
| `Restaurant` | `merchantId` | FK to owning Merchant |
| `Branch` | `restaurantId` | FK to owning Restaurant |

Permissions, subscriptions, and audit logs are **restaurant-scoped**, not merchant-scoped.

### Design rationale

> **Why not self-service branch creation?**
> Allowing merchants to freely add restaurants bypasses plan enforcement (e.g. a Starter plan merchant adding 10 restaurants). Manual FBQRSYS approval keeps plan limits enforced without building a complex automated guard. At current scale, the volume of EOIs is low enough that manual processing is faster to build and maintain than an automated approval workflow.

> **Why EOI via email/phone rather than an in-app request form?**
> An in-app form adds development work for a flow that happens rarely (a merchant opens one restaurant — not ten). At scale or if EOI volume grows, an in-app form can be added. The outcome is identical; the delivery mechanism is simpler for Phase 1.

> **AI agent improvement suggestion area:** If EOI volume grows significantly, consider an in-app "Request Multi-Branch Access" form that creates a `MerchantRequest` record in FBQRSYS, so admins have a structured queue rather than processing emails. This is a clean Phase 2 addition with no schema conflict.

---

## Push Notifications & Sound Alerts (New Order Alerts)

> **High friction for all merchants without this.** If a new order arrives and the merchant doesn't know immediately, the system fails as a POS replacement.

### What needs to be alerted

| Event | Who is alerted | Channel |
|---|---|---|
| New order received | merchant-pos, merchant-kitchen | In-app sound + visual badge + push notification |
| Order status changes | Customer (PREPARING, READY) | Supabase Realtime on order tracking screen |
| Call Waiter request | merchant-pos | In-app alert + sound |
| Payment failed (merchant billing) | Merchant owner | Email (Resend) |

### Implementation

- **In-app sound:** Web Audio API plays an alert sound when a new `Order` record is created (Supabase Realtime subscription)
- **Browser push notification:** Web Push API — merchant-pos asks for notification permission on first login; sends push even when tab is not in focus
- **WhatsApp fallback (Phase 2):** If merchant has WhatsApp Business configured, send new order summary via WA message

Add to tech stack:
- **Push notifications:** Web Push API (native, no extra service needed for browser notifications)

---

## Menu Import / Migration Tool

> **High friction for merchants upgrading from existing POS.** A seafood restaurant with 60+ items will not manually re-enter every item with photos, variants, and descriptions.

### Import Options

| Method | Use case |
|---|---|
| **CSV import** | Merchant exports from existing POS/Excel; FBQR provides a template CSV with required columns |
| **Manual bulk entry UI** | Streamlined form for quickly entering many items without uploading a file |
| **Copy menu from another restaurant** | For chain operators — clone an entire restaurant's menu to a new branch |

### CSV Template Format

```csv
category,name,description,price,isHalal,isVegetarian,spiceLevel,variants,addons
Seafood,Kepiting Saus Padang,"Kepiting segar...",185000,true,false,2,"","Extra Nasi:10000"
Seafood,Udang Bakar,"...",120000,true,false,1,"","Saus Pedas:5000|Extra Mentega:8000"
```

Photos cannot be imported via CSV — merchant uploads images per item after import, or skips photos initially.

---

## Dashboards

---

### Multi-Branch (Cabang) Dashboard — Merchant Owner

The schema supports `Merchant → Restaurant[] → Branch[]`. The dashboard UI reflects this hierarchy.

#### Restaurant selector (top-level switcher)

When a merchant owns more than one restaurant, a persistent restaurant selector appears at the top of `merchant-pos`. It shows:
- Restaurant name + logo thumbnail
- Quick status indicator (active orders count, any alerts)
- "All Restaurants" aggregate option (chain view)

Switching restaurants reloads the entire dashboard scoped to that restaurant. Staff accounts do not see the selector — they are scoped to one restaurant and see it directly.

#### Branch selector (within a restaurant)

Within a restaurant, branches are selectable via a secondary filter:
- Default view: aggregate across all branches of that restaurant
- Selectable individual branch for drill-down

Branch-level data is always available for: orders, revenue, table status, staff activity.

---

### FBQRSYS Owner Dashboard

Accessible to `SystemAdmin` users with `reports:read` permission.

#### Overview cards (top of page)

| Card | Data |
|---|---|
| **Total GMV** | Gross merchandise value across all merchants (today / this month / all time) |
| **Platform MRR** | Monthly recurring revenue from active subscriptions |
| **Platform ARR** | Annualized recurring revenue |
| **Active Merchants** | Count of merchants with status `ACTIVE` |
| **Trial Merchants** | Count of merchants in `TRIAL` — potential conversions |
| **Suspended Merchants** | Count — needs attention |

#### Merchant growth analytics

| Metric | Description |
|---|---|
| New signups (trial starts) | Daily/weekly/monthly trend chart |
| Trial → Active conversion rate | % of trials that converted to paid, by cohort month |
| Churned merchants | Cancelled or suspended past grace period, by month |
| Net merchant growth | New activations minus churn |
| Average trial duration before conversion | How many days before merchants upgrade |

#### Subscription revenue breakdown

| Metric | Description |
|---|---|
| Revenue by plan tier | MRR split: Free / Starter / Pro / Enterprise |
| Monthly vs yearly billing mix | % of revenue from annual plans (higher LTV) |
| Upcoming renewals (next 30 days) | List of merchants renewing soon — risk: those with failed past payments |
| Overdue / at-risk accounts | Merchants in grace period or with failed last payment |
| Revenue forecast (next 3 months) | Based on current subscriptions + historical churn rate |

#### Top merchants

| Metric | Description |
|---|---|
| Top 10 by GMV | Highest-volume merchants on the platform — for case studies, referrals |
| Top 10 by order count | Most active in terms of transactions |
| Top 10 by customer ratings | Platform quality leaders |
| Fastest growing (last 30 days) | Month-over-month GMV growth — identify rising stars |
| Recently churned | Merchants who cancelled — surface for win-back campaigns |

#### Platform-wide order analytics

| Metric | Description |
|---|---|
| Total orders processed | Platform cumulative + daily/weekly trend |
| Order type mix | Dine-in vs Takeaway vs Delivery (%) |
| Payment method distribution | QRIS vs Cash vs GoPay/OVO vs VA across all merchants |
| Average order value (platform-wide) | Trend over time |
| Peak hours (platform-wide) | When are orders placed across all restaurants |

#### Geographic distribution (future)

- Map view of merchant locations by city/province
- GMV density heatmap — where is the platform strongest
- Identifies expansion opportunities (high-density cities with few merchants)

#### Billing health

| Metric | Description |
|---|---|
| Invoices issued this month | Count + total IDR value |
| Invoices paid on time | % payment rate |
| Invoices overdue | Count + total IDR at risk |
| Average days to payment | Payment velocity trend |
| Total outstanding (unpaid) | Sum of all overdue `MerchantBillingInvoice` amounts |

---

### Merchant Owner Dashboard (Single Restaurant)

Accessible from `merchant-pos`. Merchant owners and staff with `reports:read` see this. Scope: one restaurant (or one branch if branch filter is applied).

#### Live operations panel (top of dashboard, real-time)

| Widget | Description |
|---|---|
| **Active orders** | Count of orders currently in `PENDING`, `CONFIRMED`, `PREPARING`, `READY` |
| **Tables occupied** | X of Y tables currently `OCCUPIED` |
| **Open waiter requests** | Unresolved `WaiterRequest` count |
| **Today's revenue so far** | Running IDR total for today |
| **Today's order count** | Running count for today |
| **Avg wait time today** | Average time from `CONFIRMED` to `READY` |

All live panel widgets update via Supabase Realtime — no refresh needed.

#### Revenue analytics

| Metric | Description |
|---|---|
| Revenue today / this week / this month / custom range | IDR with % change vs prior period |
| Revenue trend chart | Daily bar chart for selected period |
| Revenue by order type | Dine-in / Takeaway / Delivery split (IDR + %) |
| Revenue by payment method | QRIS / Cash / GoPay / OVO / VA breakdown |
| Revenue by branch | If multi-branch: compare branches side by side |
| Tax collected | PPN amount for accounting |
| Service charge collected | Amount for accounting |

#### Order analytics

| Metric | Description |
|---|---|
| Total orders | Count for selected period, with trend |
| Average order value (AOV) | IDR, trend week-over-week |
| Orders by hour (peak heatmap) | 7-day rolling hourly chart — shows breakfast rush, lunch peak, dinner peak |
| Orders by day of week | Monday–Sunday pattern |
| Repeat vs first-time customers | % of orders from returning registered customers (if loyalty enabled) |
| Cancellation rate | % of orders cancelled + reasons (if captured) |

#### Menu performance

| Metric | Description |
|---|---|
| Top 10 items by revenue | IDR generated per item |
| Top 10 items by order count | Most-ordered items |
| Slowest-moving items | Bottom 10 by order count in selected period — candidates for removal or promotion |
| Category performance | Revenue and order count per category |
| Items frequently ordered together | Item affinity pairs — informs combo promotions |
| AI recommendation impact | If AI enabled: orders that included a recommended item vs not; uplift % |

#### Table & session analytics

| Metric | Description |
|---|---|
| Table turnover rate | Average time a table is `OCCUPIED` per session |
| Average spend per table | IDR per session |
| Average items per order | Cart size trend |
| Busiest tables | Tables with most sessions in period |
| "Add More Items" frequency | How often customers place a second order in the same session |

#### Staff performance (requires `staff:manage` permission)

| Metric | Description |
|---|---|
| Orders processed by staff | If staff member handled (cashier, supervisor) |
| Avg order handling time | From order receipt to status update |
| Waiter requests resolved | Count per staff member |

#### Customer & loyalty analytics (if loyalty enabled)

| Metric | Description |
|---|---|
| Registered customers | Total + new this period |
| Loyalty points issued | Total IDR equivalent |
| Loyalty points redeemed | Total IDR equivalent redeemed |
| Redemption rate | % of eligible orders that used loyalty points |
| Top customers by spend | Leaderboard — for targeted promotions |
| Customer retention rate | % of customers who return within 30/60/90 days |

#### Ratings & feedback

| Metric | Description |
|---|---|
| Average order rating | 1–5 stars, trend over time |
| Rating distribution | Bar chart (1★ to 5★ count) |
| Recent comments | Latest 20 comments with star rating |
| Items with lowest ratings | Surface quality issues per item |

---

### Merchant Owner Dashboard — Chain / Multi-Restaurant View

When "All Restaurants" is selected in the restaurant switcher, the merchant sees a consolidated view across their entire portfolio.

#### Portfolio overview cards

| Card | Data |
|---|---|
| **Total revenue (all restaurants)** | Consolidated IDR for period |
| **Total orders (all restaurants)** | Consolidated count |
| **Best-performing restaurant** | Highest revenue this month |
| **Fastest-growing restaurant** | Highest month-over-month growth |
| **Restaurants needing attention** | Any with unusually low ratings or high cancellation rates |

#### Restaurant comparison table

A sortable table showing each restaurant side by side:

| Column | Description |
|---|---|
| Restaurant name | Link to drill into that restaurant's dashboard |
| Revenue (period) | IDR |
| Orders (period) | Count |
| AOV | Average order value |
| Avg rating | Star average |
| Active tables | Currently occupied |
| Subscription status | ACTIVE / TRIAL / SUSPENDED |

Sortable by any column. Click a row to drill into that restaurant's single-restaurant dashboard.

#### Consolidated accounting export

When exporting, the merchant can choose:
- Single restaurant → scoped export
- All restaurants → one combined Excel/CSV with a `restaurantName` column added

---

## Accounting Export

> **Required for established businesses.** Pak Budi's accountant needs data; Bu Sari's finance team needs it for 8 branches.

| Export format | Notes |
|---|---|
| **Excel (.xlsx)** | Itemized order report, daily/weekly/monthly, filterable by date range |
| **CSV** | Same as Excel but for any accounting tool |
| **Accurate Online** | Indonesia's most popular SME accounting software — direct integration (Phase 2) |
| **Jurnal.id** | Alternative popular Indonesian accounting tool (Phase 2) |

All exports include: date, order ID, items, quantities, prices, tax, service charge, payment method, discount applied.

---

## Permanent Free Tier (Warung / Lite Mode)

> **Deal-breaker for Mas Tono.** A 14-day trial that then requires payment will lose the warung segment entirely. They need to see sustained value before paying anything.

### Proposed tier structure

| Tier | Price | Limits | Unlocks subscription |
|---|---|---|---|
| **Free / Warung** | Rp 0 forever | 1 branch, 5 tables, 30 menu items, basic layout (List only), no AI, no branding, FBQR watermark on menu | If they grow past limits or want features, they upgrade |
| **Starter** | Paid monthly | 1 branch, 15 tables, all layouts, branding, basic AI | |
| **Pro** | Paid monthly | Multiple branches, unlimited, full AI, loyalty, delivery integration | |

> The Free tier is the acquisition strategy for the warung segment. A warung that grows into a small restaurant chain is a high-value future Pro subscriber.

**Free tier retention features:**
- FBQR logo/watermark on the customer menu (marketing for FBQR)
- "Upgrade" prompt visible when they hit a limit (not a hard block — a gentle nudge)
- Offline capability works on Free tier (important for warung connectivity)

---

## Post-Order Customer Rating

> Needed for Pak Budi (reputation matters for a seasoned restaurant) and for platform quality control.

After an order is marked COMPLETED:
- Customer sees a simple 1–5 star prompt on their order tracking screen ("Bagaimana makanannya?")
- Optional text comment
- Rating is stored per `Order` (not publicly visible by default — merchant sees aggregate)
- Merchant dashboard shows average rating, recent comments, trend over time
- FBQRSYS can see platform-wide ratings to identify quality issues (future: merchant score)

---

## What's Still Missing / Backlog

Features organized by impact. 🚨 = deal-breaker for at least one persona. ⚠️ = high friction. 📋 = nice-to-have.

| Feature | Level | Persona | Notes |
|---|---|---|---|
| **Takeaway / counter mode** | 🚨 Deal-breaker | Chain, warung | Documented above — `orderType`, queue number, counter QR |
| **Order queue number display** | 🚨 Deal-breaker | Chain, warung | Customer-facing screen showing pending/ready order numbers |
| **Cash / "Pay at Counter"** | 🚨 Deal-breaker | Warung, all | `CASH` payment method, cashier marks paid manually |
| **Multi-restaurant per merchant** | 🚨 Deal-breaker | Chain | One login, multiple restaurants; schema change required |
| **Delivery platform integration** | 🚨 Deal-breaker | Chain | GrabFood/GoFood/ShopeeFood webhook → unified kitchen view |
| **Permanent free / Warung tier** | 🚨 Deal-breaker | Warung | Free forever with limits; upgrade path clearly shown |
| **Push/sound notifications for new orders** | ⚠️ High friction | All | Web Push API + in-app audio; browser notification permission |
| **Printer integration** | ⚠️ High friction | Seafood, chain | Upgrade from backlog to high priority; `node-thermal-printer` |
| **Menu import / CSV migration** | ⚠️ High friction | Seafood, chain | CSV template + bulk entry UI + clone menu across branches |
| **ROI analytics dashboard** | ⚠️ High friction | All | Merchants must see measurable value to keep subscribing |
| **Accounting export** | ⚠️ High friction | Seafood, chain | Excel/CSV export; Accurate/Jurnal.id integration (Phase 2) |
| **Post-order customer rating** | ⚠️ High friction | Seafood | 1–5 stars after order complete; merchant dashboard aggregate |
| **WhatsApp Business integration** | ⚠️ High friction | Warung | Order notifications, invoice sharing via WA |
| **Refund / cancellation flow** | ⚠️ High friction | All | Midtrans refund API; reflected in reports |
| **Offline mode (merchant-pos)** | ⚠️ High friction | Warung | PWA local queue; sync on reconnect |
| **Stock / inventory tracking** | 📋 Nice-to-have | All | Auto-mark unavailable when stock hits 0 |
| **Discount codes / vouchers** | 📋 Nice-to-have | All | Customer-facing promo codes |
| **Export reports** | 📋 Nice-to-have | All | Excel/PDF download (see Accounting Export above) |
| **Group ordering (collaborative cart)** | 📋 Nice-to-have | Seafood | Multiple phones, shared cart, per-person attribution |
| **Kitchen multi-station routing** | ⚠️ High friction | All multi-station restaurants | Promoted from nice-to-have — see Kitchen Station Routing section; route by category to bar/kitchen/patisserie |
| **Privacy consent flow** | 📋 Nice-to-have | All | Data collection opt-in; minimal principle |
| **Table merge / split bill** | 📋 Nice-to-have | Seafood | Group dining; split payment between people |
| **Table reservation** | 📋 Nice-to-have | Seafood | Book in advance |
| **Staff shift management** | 📋 Nice-to-have | Chain | Clock-in/out, shift reports |
| **Multi-language menu items** | 📋 Nice-to-have | All | Per-item name/description in multiple languages |
| **Menu templates** | 📋 Nice-to-have | Warung | Pre-built menus to accelerate setup |
| **Branded QR code design** | 📋 Nice-to-have | Seafood, chain | Styled QR with restaurant logo |
| **Shareable menu URL** | 📋 Nice-to-have | All | Digital menu link without scanning |

---

## Architecture Decision Records (ADRs)

> **For AI agents reading this document:** This section exists to help you understand *why* decisions were made — not just *what* was decided. You are encouraged to challenge these decisions if you have evidence that a better approach exists, or to suggest improvements. Where a decision is marked **open**, it has not been finalised and your input is explicitly welcome.

### ADR-001: Monorepo (Turborepo) over Microservices

**Decision:** Use a Turborepo monorepo with two Next.js apps (`apps/web`, `apps/menu`) and shared packages.

**Rationale:** Microservices add significant operational overhead (separate deployments, inter-service auth, distributed tracing, network latency on every internal call). At the current stage — one developer, no traffic yet — that overhead provides no benefit. Turborepo gives clean domain separation (each sub-system is its own app/package) without the infra complexity. Individual apps can be extracted into independent services later if specific scaling pain points emerge (e.g. the customer menu app needs to scale independently of the admin panel).

**Tradeoffs accepted:** A monorepo means a single deployment pipeline. If one sub-system has a critical bug, all sub-systems may be affected by a bad deploy. Mitigated by: separate Vercel projects for `apps/web` and `apps/menu`.

**Status:** Decided. Open for revision if the team scales past ~10 engineers or if sub-systems require independent scaling.

---

### ADR-002: Supabase over Self-Managed PostgreSQL

**Decision:** Use Supabase for PostgreSQL, Realtime, and Storage.

**Rationale:** Supabase provides three critical services in one: managed PostgreSQL (removes infra burden), Realtime subscriptions (required for live kitchen display and order tracking), and file Storage (menu images, invoice PDFs). The free tier is sufficient for initial launch. Self-managing these three separately would require more infrastructure work with no product benefit at this stage.

**Tradeoffs accepted:** Supabase Realtime is constrained by their pricing tiers at high concurrent connections. If the kitchen display needs to support hundreds of simultaneous connections, Supabase Realtime costs could become a concern. Mitigation: monitor connection counts; switch to a dedicated Ably/Pusher subscription or self-hosted socket server if Supabase becomes a bottleneck.

**Status:** Decided. Re-evaluate if Realtime connection costs become material.

---

### ADR-003: Prisma ORM over Raw SQL or Drizzle

**Decision:** Use Prisma as the ORM.

**Rationale:** Prisma's type-safe client and migration system reduce an entire class of bugs (runtime type mismatches between DB and TypeScript). The schema file doubles as documentation. The developer ecosystem is well-established. Drizzle was considered — it has a smaller runtime footprint and is arguably faster for large queries, but Prisma's migration tooling and schema clarity are more valuable for a solo developer building a complex schema from scratch.

**Tradeoffs accepted:** Prisma's query builder occasionally requires raw SQL for complex aggregations (e.g. dashboard queries joining many tables with window functions). Use `prisma.$queryRaw` for these cases.

**Status:** Decided. Open to Drizzle migration if Prisma query performance becomes a bottleneck on complex dashboard queries.

---

### ADR-004: Payment-First Order Confirmation (No Cashier Approval Gate)

**Decision:** Orders are only confirmed (and routed to kitchen) after Midtrans payment webhook. No cashier must manually approve digital orders.

**Rationale:** See the QR Order Security section for full detail. Summary: payment IS the approval. Cashier gates re-introduce human bottleneck and degrade customer experience at exactly the moment when self-service value is highest (peak hours with multiple simultaneous orders). Midtrans webhook verification is cryptographically stronger than a human check anyway.

**Exception:** Cash orders use the same gate — cashier confirms after collecting money, which routes the order to kitchen. The confirming party differs (cashier vs Midtrans webhook) but the principle is identical: kitchen never sees an order until it is confirmed.

**Status:** Decided. This is a core product philosophy, not just an implementation detail.

---

### ADR-005: Dynamic RBAC (Permissions Hardcoded, Roles User-Created)

**Decision:** Permissions are system-defined atomic capability keys (e.g. `menu:manage`). Roles are fully user-created free-form names with any combination of permissions. Templates are suggestions only.

**Rationale:** Hardcoding roles (e.g. `CASHIER`, `SUPERVISOR`) creates a rigid system that does not match real Indonesian restaurant operations — every restaurant organises its staff differently. A "Koordinator Dapur" at one restaurant has different responsibilities than a "Kepala Dapur" at another. Permissions must be hardcoded because they correspond directly to code-level `requirePermission()` gate calls. Roles must be flexible because naming conventions and responsibility bundles vary by merchant.

**Tradeoffs accepted:** More complex UI for role management. Mitigated by showing pre-built template suggestions that cover 90% of common use cases — a merchant can use a template as-is and never need to understand the underlying permissions system.

**Status:** Decided. This is a core differentiator from simpler POS systems.

---

### ADR-006: Per-Category Kitchen Station Assignment (not per-item tagging)

**Decision:** Kitchen stations are assigned at the `MenuCategory` level. Per-item override is available but category is the primary assignment unit.

**Rationale:** See the Kitchen Station Routing section. Summary: merchants think in categories ("all Drinks go to Bar"), not individual items. Category-level assignment requires one setting per category, not one per item. Reduces configuration friction by ~90% for a typical 40-item menu.

**Status:** Decided.

---

### ADR-007: Multi-Branch via FBQRSYS EOI (Not Self-Service)

**Decision:** Merchants cannot self-add restaurants or branches. They submit an Expression of Interest (email/phone); FBQRSYS admin manually enables the feature and adds each restaurant/branch.

**Rationale:** Self-service branch creation bypasses plan enforcement. Manual approval ensures each branch is on the correct plan and billed appropriately. At current stage (few merchants), EOI volume is low and manual processing is faster to build than an automated approval workflow with plan enforcement logic.

**Tradeoffs accepted:** Friction for the merchant (they cannot instantly add a branch). Mitigated by fast turnaround — FBQRSYS admin adds the branch and merchant sees it immediately.

**Open question / improvement area:** If EOI volume grows, an in-app `MerchantRequest` queue for FBQRSYS admins would replace the email process. No schema changes needed — just a new `MerchantRequest` model and a FBQRSYS admin review UI.

**Status:** Decided for Phase 1. In-app EOI form is a clean Phase 2 addition.

---

### ADR-008: Only end-user-system is Merchant-Branded

**Decision:** FBQRSYS and `merchant-pos` always display FBQR's own UI. Only the `apps/menu` (customer-facing) app applies merchant branding (logo, colors, font).

**Rationale:** FBQRSYS is a B2B platform admin tool — merchants and FBQRSYS staff both need to know they are operating the FBQR platform. Branding FBQRSYS with merchant colors would cause confusion. `merchant-pos` retains FBQR UI chrome so support staff can recognise the system immediately when assisting merchants. Customers, however, should feel they are at the restaurant's own digital experience — they may not know or care that FBQR is the underlying platform.

**Status:** Decided. This is a deliberate product positioning choice.

---

### Open Questions for Future AI Agents

The following are areas where the design is incomplete or where a future AI agent is explicitly invited to propose an approach:

| Area | Current state | Question |
|---|---|---|
| **Table-level rate limiting** | Not yet specified | What is the right limit (N pending orders per table per hour) to balance fraud prevention against legitimate multi-round ordering (mains then desserts)? |
| **Anomaly detection for fake orders** | Not designed | Should FBQR auto-flag suspicious sessions (e.g. 10+ orders in 5 minutes from one table token)? What should the trigger threshold and response be? |
| **In-app EOI form for multi-branch** | Not built | When should this replace email EOI? What fields should it capture? Should it create a `MerchantRequest` model or reuse an existing model? |
| **Accurate / Jurnal.id accounting integration** | Phase 2 only | Which integration method (API, CSV export, webhook) best fits Accurate Online's API capabilities? |
| **FBQR Points cross-restaurant redemption** | Phase 2, not fully designed | What is the IDR-to-points exchange rate? Are points redeemable for cash, credits, or items only? Who funds the redemption cost — FBQR or the merchant? |
| **Delivery platform webhook auth** | Not designed | How should FBQR verify that an incoming webhook is genuinely from GrabFood/GoFood and not a spoofed request? |

---

## Git Configuration

- **Remote:** `http://local_proxy@127.0.0.1:35046/git/linnrobin/FBQR`
- **Default branch:** `master`
- **Author:** Robin <robinsalim@yahoo.com>

### Branch Conventions

- Claude-managed branches: `claude/<task-slug>-<session-id>`
- Feature branches: `feature/<short-description>`
- Bug fixes: `fix/<short-description>`
- Never push directly to `master` without explicit permission
- Push: `git push -u origin <branch-name>`

### Commit Message Style

Use concise, imperative messages:
```
Add Midtrans QRIS payment integration
Fix kitchen display not receiving real-time orders
Update menu item image upload to use Supabase Storage
```

---

## Working with Claude Efficiently

> This section is specifically for working on this project using Claude (claude.ai or Claude Code).

### Context budget guidance

Claude has a finite context window per session. To work efficiently:

1. **Start every session by reading CLAUDE.md** — it is the source of truth for all decisions made so far.
2. **Scope each session to one sub-system or one feature.** Don't try to build `merchant-pos` and `end-user-system` in the same session.
3. **Commit and push at the end of every session.** This means the next session starts clean without needing to re-read a lot of code.
4. **Update CLAUDE.md at the end of a session** if any new decisions were made (new models, new conventions, new packages chosen).
5. **Paste only the relevant code** when asking Claude to help debug — not the entire codebase.

### Recommended build order

Work through this sequence, one session at a time:

| Step | Task | Sub-system |
|---|---|---|
| 1 | Monorepo scaffold (Turborepo, packages, apps) | All |
| 2 | Prisma schema + migrations + seed | `packages/database` |
| 3 | Auth (email+password JWT, PIN auth, NextAuth) | `apps/web` |
| 4 | Dynamic RBAC — role/permission engine + middleware | `apps/web` |
| 5 | FBQRSYS — merchant management UI (create, view, suspend) | `apps/web/(fbqrsys)` |
| 6 | Merchant subscription & billing — plans, invoices, auto-lock, email reminders | `apps/web/(fbqrsys)` |
| 7 | Merchant onboarding — trial/free tier flow, plan selection | `apps/web/(merchant)` |
| 8 | Restaurant branding settings + CSS variable injection | `apps/web/(merchant)` + `apps/menu` |
| 9 | merchant-pos — menu & category management + layout + allergens + CSV import | `apps/web/(merchant)` |
| 10 | merchant-pos — table management + QR generation + floor map | `apps/web/(merchant)` |
| 11 | merchant-pos — promotions + discount codes | `apps/web/(merchant)` |
| 12 | end-user-system — QR validation + branded menu (Grid layout, dine-in) | `apps/menu` |
| 13 | end-user-system — List, Bundle, Spotlight layouts | `apps/menu` |
| 14 | end-user-system — item detail modal, variants, add-ons, allergens | `apps/menu` |
| 15 | end-user-system — cart + pre-invoice + Midtrans QRIS + Cash option | `apps/menu` |
| 16 | end-user-system — order tracking screen + real-time status + Call Waiter + rating | `apps/menu` |
| 17 | Takeaway / counter mode — counter QR, queue numbers, order queue display screen | `apps/menu` + `apps/web/(kitchen)` |
| 18 | Push notifications — Web Push API (new order alert, Call Waiter alert) | `apps/web` |
| 19 | Invoice + MerchantBillingInvoice PDF generation + storage | shared |
| 20 | merchant-kitchen — real-time queue + priority reordering + queue number display | `apps/web/(kitchen)` |
| 21 | merchant-pos — ROI analytics dashboard + accounting export | `apps/web/(merchant)` |
| 22 | Delivery platform integration — GrabFood/GoFood webhook → unified kitchen | `apps/web` + API |
| 23 | AI recommendation engine | `apps/menu` + API |
| 24 | Audit log — logging middleware + viewer UI | All |
| 25 | Merchant loyalty program + customer account | `apps/menu` + `apps/web/(merchant)` |
| 26 | Platform loyalty + gamification (Phase 2) | All |
| 27 | WhatsApp Business integration (notifications, invoice sharing) | shared |
| 28 | Remaining backlog items | TBD |

---

## Development Workflows

### Setup (once the project is initialized)

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in: DATABASE_URL, NEXTAUTH_SECRET, MIDTRANS_SERVER_KEY, SUPABASE_URL, etc.

# Run database migrations
npm run db:migrate

# Seed demo data
npm run db:seed

# Start all apps in dev mode
npm run dev
```

### Common Commands (Turborepo)

```bash
npm run dev          # Start all apps in development
npm run build        # Build all apps
npm run lint         # Lint all packages
npm run typecheck    # TypeScript check across all packages
npm run db:migrate   # Run Prisma migrations
npm run db:studio    # Open Prisma Studio (DB browser)
npm run db:seed      # Seed development data
```

### Running Individual Apps

```bash
npm run dev --filter=web    # merchant-pos + FBQRSYS + kitchen (apps/web)
npm run dev --filter=menu   # end-user-system (apps/menu)
```

---

## Environment Variables

Create `.env.local` in each app. A shared `.env.example` at the root documents all required keys:

```env
# Database (Supabase PostgreSQL)
DATABASE_URL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Auth
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Midtrans (customer payments + merchant billing)
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false

# Email (Resend)
RESEND_API_KEY=
EMAIL_FROM=noreply@fbqr.app

# App URLs
NEXT_PUBLIC_MENU_APP_URL=     # URL of apps/menu (for QR code generation)
NEXT_PUBLIC_WEB_APP_URL=      # URL of apps/web

# Cron secret (for Vercel Cron Jobs — billing checks, auto-lock)
CRON_SECRET=
```

---

## Key Conventions

- **Currency:** All prices stored as integers in **IDR (Rupiah)** — no decimals.
- **Timezone:** Default to `Asia/Jakarta` (WIB, UTC+7).
- **Language:** UI defaults to Bahasa Indonesia. Build with i18n hooks (`next-intl`) for future global expansion.
- **Images:** Upload to Supabase Storage. Store only the path/URL in the DB.
- **Real-time:** Use Supabase Realtime for order events. Do not poll — subscribe.
- **QR tokens:** Each table has a unique, non-guessable token (UUID). Rotating tokens invalidates old QR prints, so rotate only intentionally.
- **Soft deletes:** Use `deletedAt` timestamps rather than hard deletes for menu items, orders, staff, and promotions (important for historical reporting).
- **Audit log:** All state-changing mutations must write to `AuditLog`. Use a shared `auditLog()` helper — never write audit entries inline.
- **Price snapshots:** When an order is placed, copy item name, price, variants, and add-ons directly into `OrderItem`. Never join back to `MenuItem` for order history — prices change.
- **Permissions check:** All API routes and server actions must call `requirePermission(session, 'permission:key')` before mutating data.
- **No `.env` in git:** Add `.gitignore` before first code commit.

---

## Deployment

| App | Platform | Notes |
|---|---|---|
| `apps/web` | Vercel | Merchant POS, FBQRSYS, Kitchen display |
| `apps/menu` | Vercel | Customer-facing menu (high traffic) |
| Database | Supabase | PostgreSQL + Realtime + Storage |

Both Next.js apps are deployed as separate Vercel projects from the same monorepo using Vercel's root directory setting.

---

## Updating This File

As the project evolves, update this file to reflect:
- Final chosen tech stack versions
- Actual build/test/lint commands once configured
- Architecture decisions and the reasoning behind them
- Any third-party service accounts or configuration quirks
- Onboarding steps for new contributors
