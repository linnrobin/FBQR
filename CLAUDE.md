# CLAUDE.md

This file provides guidance for AI assistants (Claude Code and similar tools) working in this repository.

---

## CURRENT STATE — Read This First

> **Every AI agent must read this block before doing anything else.**
> Update this block at the END of every session before pushing.

```
Last updated   : 2026-03-10
Version        : 1.4
Current phase  : Phase 0 — Requirements complete. Fourth architecture review fixes applied. No code written yet.
Last completed : Fourth pre-code architecture review (v1.3 → v1.4): fixed 5 correctness/logic
                 issues (QRIS provider optional+OTHER, DIRTY table state, queue scope per-branch,
                 unique midtransTransactionId, order state machine transitions); added
                 tableSessionTimeoutMinutes + enableDirtyState to MerchantSettings; analytics
                 events in backlog; ADR-018 rebuttals expanded. All Phase 1 blockers resolved.
Next step      : Step 1 — Monorepo scaffold (Turborepo, packages, apps)
Active branch  : claude/claude-md-mmj9kfzjcs43k5bw-RRqsz
Open decisions : See "Open Questions for Future AI Agents" in the ADR section (remaining items
                 are Phase 2 concerns — all Phase 1 blockers resolved)
Known doc gaps : customer READY notification when browser tab is closed — not yet designed;
                 merchant first-time onboarding guided setup flow — not yet documented;
                 refund flow full detail — deferred to Step 15 and Step 19
```

---

## Phase Tracker

Work through phases in order. Do not start a phase until all steps in the previous phase are committed and pushed.

### Phase 0 — Requirements & Documentation
- [x] CLAUDE.md created with full project spec
- [x] Data models, flows, RBAC, billing, dashboards documented
- [x] Architecture Decision Records (ADRs) written
- [x] Kitchen station routing designed
- [x] QR order security designed
- [x] Multi-branch EOI flow designed
- [x] Pre-code architecture review: correctness issues, logic flaws, and open questions resolved (ADRs 009–013 added)

### Phase 1 — Foundation
- [ ] **Step 1** — Monorepo scaffold: Turborepo, `apps/web`, `apps/menu`, `packages/database`, `packages/ui`, `packages/types`, `packages/config`
- [ ] **Step 2** — Prisma schema + migrations + seed data (`packages/database`)

### Phase 2 — Auth & Platform Admin (FBQRSYS)
- [ ] **Step 3** — Auth: email+password JWT, PIN auth, NextAuth.js (`apps/web`)
- [ ] **Step 4** — Dynamic RBAC: role/permission engine + middleware (`apps/web`)
- [ ] **Step 5** — FBQRSYS: merchant management UI — create, view, suspend (`apps/web/(fbqrsys)`)
- [ ] **Step 6** — Merchant subscription & billing: plans, invoices, auto-lock, email reminders (`apps/web/(fbqrsys)`)

### Phase 3 — Merchant POS
- [ ] **Step 7** — Merchant onboarding: trial/free tier flow, plan selection (`apps/web/(merchant)`)
- [ ] **Step 8** — Restaurant branding settings + CSS variable injection (`apps/web/(merchant)` + `apps/menu`)
- [ ] **Step 9** — merchant-pos: menu & category management, layouts, allergens, CSV import (`apps/web/(merchant)`)
- [ ] **Step 10** — merchant-pos: table management, QR generation, floor map (`apps/web/(merchant)`)
- [ ] **Step 11** — merchant-pos: promotions + discount codes (`apps/web/(merchant)`)

### Phase 4 — Customer Ordering (end-user-system)
- [ ] **Step 12** — QR validation + branded menu, Grid layout, dine-in (`apps/menu`)
- [ ] **Step 13** — List, Bundle, Spotlight layouts (`apps/menu`)
- [ ] **Step 14** — Item detail modal: variants, add-ons, allergens (`apps/menu`)
- [ ] **Step 15** — Cart + pre-invoice + Midtrans QRIS + cash option (`apps/menu`)
- [ ] **Step 16** — Order tracking screen: real-time status, Call Waiter, rating (`apps/menu`)

### Phase 5 — Kitchen & Operations
- [ ] **Step 17** — Takeaway / counter mode: counter QR, queue numbers, queue display screen (`apps/menu` + `apps/web/(kitchen)`)
- [ ] **Step 18** — Push notifications: Web Push API, new order alert, Call Waiter alert (`apps/web`)
- [ ] **Step 19** — Invoice + MerchantBillingInvoice PDF generation + Supabase Storage (shared)
- [ ] **Step 20** — merchant-kitchen: real-time queue, priority reordering, station tabs, queue number display (`apps/web/(kitchen)`)

### Phase 6 — Analytics & Intelligence
- [ ] **Step 21** — merchant-pos: ROI analytics dashboard + accounting export (`apps/web/(merchant)`)
- [ ] **Step 22** — Delivery platform integration: GrabFood/GoFood webhook → unified kitchen (`apps/web` + API)
- [ ] **Step 23** — AI recommendation engine: bestsellers, upsell, personalized, time-based (`apps/menu` + API)

### Phase 7 — Platform Hardening
- [ ] **Step 24** — Audit log: logging middleware + viewer UI (all)
- [ ] **Step 25** — Merchant loyalty program + customer account (`apps/menu` + `apps/web/(merchant)`)
- [ ] **Step 26** — Platform loyalty + gamification — Phase 2 (all)
- [ ] **Step 27** — WhatsApp Business integration (shared)
- [ ] **Step 28** — Remaining backlog items (TBD)

---

## AI Agent Operating Protocols

### Session Start Protocol

Run these checks at the start of every session before writing any code:

1. **Read the CURRENT STATE block** (top of this file) — find `Next step` and `Open decisions`
2. **Check the Phase Tracker** — confirm which step is next and that all previous steps are checked off
3. **Run `git status`** — make sure you are on the correct branch and there are no uncommitted changes from a previous agent
4. **Read the relevant section(s)** of this file for the step you are about to build — do not rely on memory
5. **Read the existing code files** that you will be modifying before editing them — never edit blind

Only after these 5 steps should you begin writing code.

---

### Session End Protocol

Before the session ends (and before context runs out), always:

1. **Commit and push all changes** — partial work is better than lost work
2. **Update the CURRENT STATE block** at the top of this file:
   - Increment `Version` (patch: 1.0 → 1.1 for doc changes; minor: 1.1 → 1.2 for schema or ADR changes; major: 1.x → 2.0 for phase completion)
   - Set `Last updated` to today's date
   - Set `Last completed` to what was just finished
   - Set `Next step` to the next uncompleted item in the Phase Tracker
   - Note any new open decisions or doc gaps discovered
3. **Check off completed steps** in the Phase Tracker
4. **If new decisions were made** (new packages chosen, schema changes, conventions added) — update the relevant section of this file
5. **Push CLAUDE.md** as the final commit of the session

---

### Context Recovery Protocol

If a session ran out of context mid-task and you are resuming:

1. Read the CURRENT STATE block — it tells you where the previous session stopped
2. Run `git log --oneline -10` — read the last few commit messages to understand what was done
3. Run `git diff HEAD~1` if the last commit was partial — see what changed
4. Read the specific code files that were being worked on (named in the commit messages)
5. Do **not** re-read the entire CLAUDE.md from scratch — jump to the section relevant to the current step
6. If genuinely unclear what state the code is in, ask the user: *"I can see the last session was working on [X]. Should I continue from [specific point] or review the current state first?"*

---

### Context Limit Warning Signs

If you notice any of these, start the Session End Protocol immediately — do not wait:
- You are struggling to recall details from earlier in the conversation
- Tool results are being truncated or summarised automatically
- You have made more than ~15 tool calls in the session
- The user's messages are taking noticeably longer to process

Do not try to finish one more thing. Stop, commit, update CURRENT STATE, push.

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

> **Important:** One email = one restaurant brand. This is a firm design decision, not a temporary constraint.
> - `Merchant` represents the **owner account** for one restaurant brand (e.g. "Ayam Bakar Sari")
> - `Restaurant` represents that **brand** — its menu, branding, settings, and identity
> - `Branch` represents a **physical location** of that brand (e.g. Sudirman, Kelapa Gading)
>
> If a merchant owns two different brands (e.g. "Ayam Bakar Sari" and "Mie Lezat"), they register a separate `Merchant` account with a different email for each brand. The two brands are completely independent on the platform. Multiple physical locations of the **same brand** are handled as `Branch[]` records within one account — see the Multi-Branch section.

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
  │  queueNumber (int) — auto-increments per branch per day for counter/takeaway;
  │                       generated via a transactional counter table (QueueCounter) to
  │                       prevent race conditions under concurrent orders; resets at midnight
  │  platformName (nullable) — GRABFOOD | GOFOOD | SHOPEEFOOD
  │  platformOrderId (nullable) — external delivery platform reference
  │
  ├── OrderItem      ← unitPrice (int), variantPriceDelta (int), addonPriceTotal (int), lineTotal (int)
  │                    variantSnapshot (JSON), addonSnapshot (JSON) — metadata only
  │                    kitchenPriority (int, per-station), kitchenStationId (snapshot)
  ├── OrderEvent     ← Immutable log of order lifecycle transitions
  │     (orderId, fromStatus, toStatus, actorId?, actorType, note?, createdAt)
  ├── WaiterRequest  ← Customer pressed "Call Waiter"; resolved by staff
  ├── OrderRating    ← Post-completion 1–5 star rating + optional comment from customer
  ├── PreInvoice     ← Generated at checkout (before payment) — not a legal document
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

MerchantLoyaltyProgram ← Per-restaurant loyalty config (name, IDR per point, redemption rate)
  └── LoyaltyTier    ← Tier name, threshold, multiplier, custom title, badge (Phase 2)

── PLATFORM ──────────────────────────────────────────────────────────
AuditLog             ← Immutable. actor, action, entity, oldValue, newValue, IP, timestamp
QueueCounter         ← Transactional counter for queue numbers; prevents race conditions
                       (branchId, date, lastNumber) — SELECT FOR UPDATE when issuing next number
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
| `PENDING` | `CANCELLED` | Customer or system (payment failed) |
| `PENDING` | `EXPIRED` | System (payment timeout cron) |
| `CONFIRMED` | `PREPARING` | Kitchen staff |
| `CONFIRMED` | `CANCELLED` | Merchant owner / supervisor (triggers refund) |
| `PREPARING` | `READY` | Kitchen staff |
| `PREPARING` | `CANCELLED` | Merchant owner / supervisor (triggers refund) |
| `READY` | `COMPLETED` | Staff or system (after configurable hold period) |
| `EXPIRED` | `CONFIRMED` | System only (late webhook revival within window) |

All other transitions (e.g. `COMPLETED → CANCELLED`, `READY → PREPARING`, `EXPIRED → CANCELLED`) are invalid and must return an error. The `OrderEvent` log records every transition with actor and timestamp.

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
| `FAILED` | `CANCELLED` | Payment declined; customer notified |
| `EXPIRED` | `EXPIRED` | No confirmation within 15 min; terminal state |
| `REFUNDED` | `CANCELLED` | Post-confirmation cancellation; triggers refund flow |

**Idempotency rule — use atomic update, not a read-then-write:**
```sql
UPDATE "Order" SET status = 'CONFIRMED' WHERE id = $orderId AND status = 'PENDING'
-- check affectedRows: if 0, webhook is duplicate → log and return HTTP 200 immediately
```
A plain read-then-write (`SELECT` status → `UPDATE` if PENDING) has a race condition under concurrent Midtrans retries: two workers can both read `PENDING` before either writes `CONFIRMED`. The atomic `WHERE status = 'PENDING'` clause is the correct guard. This prevents duplicate kitchen pushes even under concurrent webhook delivery.

**Late webhook rule:** If a `SUCCESS` webhook arrives for an `EXPIRED` order, consult `MerchantSettings.lateWebhookWindowMinutes` (default: 60):
- If order expired **less than** the window ago → **revive**: `Order.status → CONFIRMED`, order pushed to kitchen. Rationale: the customer paid real money.
- If order expired **more than** the window ago → **auto-refund** via Midtrans Refund API + notify merchant. Kitchen may be closed, items may be restocked — revival is unsafe.
- If the restaurant is suspended at time of revival → auto-refund regardless of window.
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

A `CustomerSession` moves to `COMPLETED` when **any one** of the following occurs:

| Trigger | Who/What | Resulting Table status |
|---|---|---|
| Staff taps "Close Table" in merchant-pos | Staff (cashier/supervisor/owner) | DIRTY (if `enableDirtyState = true`) or AVAILABLE |
| Session inactivity timeout (`tableSessionTimeoutMinutes`) | System (cron) | DIRTY or AVAILABLE |
| FBQRSYS admin closes the session | Platform admin | AVAILABLE (admin bypass, no DIRTY) |

A session does **not** auto-complete when an order is `COMPLETED` — customers may order again (dessert, drinks) within the same session. The session stays `ACTIVE` until explicitly closed or timed out.

- Table status reverts to `DIRTY` (or `AVAILABLE` if DIRTY state disabled) when session moves to `COMPLETED` or `EXPIRED`
- Loyalty points are credited per order at the moment each `Order` moves to `CONFIRMED` (not at session close)

### 9. CustomerSession state transitions

```
[QR scan]
    │
    ▼
ACTIVE ──────────────────────────────────────────────────────┐
    │                                                         │
    ├── Staff closes table → COMPLETED → Table: AVAILABLE     │
    │                                                         │
    ├── Session TTL expires (default: 2 hours of inactivity)  │
    │   → EXPIRED → Table: AVAILABLE                          │
    │                                                         │
    └── Restaurant suspended mid-session → session preserved  │
        but new orders blocked; existing orders continue      │
        to display on customer tracking screen                │
```

**Edge cases:**

| Scenario | Behaviour |
|---|---|
| Token rotation (staff closes session) | Old session → COMPLETED; old token immediately invalid; new token issued on next scan; any in-flight `PENDING` orders of the old session are auto-cancelled |
| Customer refreshes page | Session cookie re-links to existing ACTIVE session — no new QR scan required |
| Table set to RESERVED while session is ACTIVE | Staff cannot set an OCCUPIED table to RESERVED; RESERVED only applies to AVAILABLE tables |
| Restaurant suspended while session ACTIVE | New orders blocked with "Restaurant unavailable" message; customer can still view existing order status |
| Two phones scan same QR simultaneously | Second scan resumes the same ACTIVE session — one session per table at all times (see ADR-009) |
| Session TTL expires while order is PREPARING | Session → EXPIRED; table → AVAILABLE. Existing orders in CONFIRMED/PREPARING/READY are **not** affected — they continue to completion in the kitchen. Only new order placement is blocked. The customer's order tracking screen continues to show live status via the order ID even after session expiry. |

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
| **Token rotation on session close** | When staff close a table session, the table's QR token is regenerated. The old token is immediately invalid for new sessions. Any `PENDING` orders belonging to the old session are auto-cancelled. Customers mid-order (page open) see "Your session has ended. Please scan the new QR code." |
| **Session expiry** | `CustomerSession` has a configurable TTL (default: 2 hours of inactivity). An expired session rejects new orders even with a valid token. |
| **Short-lived signed session token** | The QR URL contains a static `tableToken` (permanent UUID on the table record) plus a short-lived `sig` parameter: `HMAC-SHA256(tableToken + expiry, SERVER_SECRET)`. The `sig` expires every 24 hours. Scanning the printed QR always works because the QR links to a redirect endpoint that issues a fresh `sig` before forwarding to the menu URL. If someone screenshots and shares the full URL, it stops working after 24 hours. The static `tableToken` alone is never sufficient — the `sig` must be valid. |
| **Token scoped to table + restaurant** | The URL encodes `restaurantId + tableId + tableToken`. Even if someone enumerates tokens, it only works for one specific table at one restaurant — not the whole platform. |
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

The kitchen display shows all active `OrderItem` rows, grouped by order but sortable within each station.

- Each `OrderItem` has a `kitchenPriority` integer field (default: order of insertion)
- **Priority is scoped per station** — reordering items at the Bar does not affect the Kitchen queue, and vice versa. Global priority reordering across all stations is not supported and would be confusing for multi-station kitchens.
- Kitchen staff can drag-and-drop or use up/down controls to reprioritize within their station tab
- Priority changes are real-time (Supabase Realtime broadcast) so all screens viewing the same station stay in sync
- Priority reordering is logged in `AuditLog` with actor = kitchen staff
- In the "All" tab (no station filter), items are shown sorted by station then by priority — not globally sortable from this view

**Example:** Bar has: Coffee (pos 1), Juice (pos 2). Kitchen has: Burger (pos 1), Salad (pos 2).
Bar staff reprioritizes Juice to pos 1 → only Bar queue changes. Kitchen queue unaffected.

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
MenuItem        ← inherits station from its category; kitchenStationOverride takes precedence
    ↑
OrderItem       ← routed to station at order time; station stored as snapshot
```

**Station routing priority (explicit precedence order):**
1. `MenuItem.kitchenStationOverride` — if set, always wins
2. `MenuCategory.kitchenStationId` — if set and no item override
3. Restaurant default station — if neither category nor item override is set

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

### Station deletion / deactivation fallback

If a `KitchenStation` is deactivated (`isActive = false`) or deleted after `OrderItem`s have been routed to it:
- **Historical `OrderItem`s** (status CONFIRMED/PREPARING/READY) retain their snapshotted `kitchenStationId` — they remain visible in the "All" tab. The kitchen display labels them with a ⚠️ "Station deactivated" badge so staff can handle them manually.
- **New orders** at the time of deactivation: the routing engine falls back to the default station for any category that was pointing to the deactivated station.
- **Merchants cannot delete a station** that has active (CONFIRMED/PREPARING/READY) `OrderItem`s — the UI must reject the delete with: "This station has X active items. Reassign or complete them first."
- `isActive = false` (soft toggle) is preferred over deletion to preserve historical integrity.

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
Format: `INV-{branchCode}-{YYYYMMDD}-{sequence}` — e.g. `INV-JKT1-20260309-0042`

- `branchCode` is a short 4-character code set when the Branch is created (e.g. `JKT1`, `BDG2`)
- Sequence resets daily **per branch** — each branch maintains its own counter
- For single-branch restaurants, `branchCode` defaults to the first 4 characters of the restaurant slug
- This prevents number collision when two branches issue invoices on the same day

### BranchCode generation rule

When a Branch is created, `branchCode` is auto-generated as follows:
1. Take the branch name, uppercase and strip spaces/punctuation → e.g. "Jakarta Selatan" → `JAKARTASELATAN`
2. Take the first 4 characters → `JAKA`
3. Check for uniqueness within the restaurant; if collision, append a counter → `JAK2`, `JAK3`
4. Merchant can edit the `branchCode` at any time from branch settings (max 6 chars, alphanumeric, uppercase)
5. Editing `branchCode` does **not** renumber historical invoices — it only applies to new invoices from that point

### Invoice URL Security
Invoice PDFs are stored in Supabase Storage and accessed via **signed, expiring URLs** — not permanent public URLs.
- URL validity: 24 hours from generation
- Customer receives the URL immediately after payment; it is valid for the day
- Re-generation: calling the invoice endpoint again issues a fresh signed URL
- Rationale: invoice numbers are sequential and guessable; a permanent public URL would allow enumeration of all invoices

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
| `paymentTimeoutMinutes` | `15` | Minutes before a PENDING order auto-expires; configurable per merchant |
| `lateWebhookWindowMinutes` | `60` | Minutes after expiry during which a SUCCESS webhook revives the order; beyond this auto-refund |
| `paymentMode` | `PAY_FIRST` | `PAY_FIRST` or `PAY_AT_CASHIER` — controls whether Midtrans is required |
| `maxPendingOrders` | `3` | Max concurrent PENDING orders per CustomerSession |
| `maxOrderValueIDR` | `5000000` | Max single-order value in IDR; fraud guard |
| `enableDirtyState` | `false` | If true, table moves to DIRTY after session ends; staff must mark clean before next scan |
| `tableSessionTimeoutMinutes` | `120` | Minutes of inactivity before CustomerSession auto-expires; configurable per merchant |

---

## Menu Item — Full Field Specification

| Field | Type | Notes |
|---|---|---|
| `name` | string | Display name |
| `description` | string | Short description (shown in item detail) |
| `price` | int | IDR, no decimals |
| `imageUrl` | string | Supabase Storage path |
| `isAvailable` | bool | Soft toggle — hides from menu without deleting |
| `stockCount` | int? | If set, decrements per order; auto-marks unavailable at 0. Decrement uses a DB-level atomic operation (`UPDATE ... WHERE stockCount > 0`) to prevent overselling under concurrent orders. If the decrement fails (stock = 0), the order item is rejected and the customer sees "Item is sold out" before payment. |
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
| `kitchenStationId` | string? | Routes all items in this category to the specified kitchen station; null = default station |

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
| `AVAILABLE` | No active session — QR scan starts a new CustomerSession |
| `OCCUPIED` | Active customer session in progress |
| `RESERVED` | Reserved (future: reservation system) — QR scan blocked; customer sees "This table is reserved. Please ask staff." |
| `DIRTY` | Session ended, table needs cleaning before it can be used — QR scan blocked; customer sees "This table is being prepared. Please ask staff." |
| `CLOSED` | Temporarily unavailable (maintenance, taken out of service) — QR scan blocked; customer sees "This table is currently unavailable. Please ask staff." |

### Table status rules

| Transition | Who can trigger |
|---|---|
| `AVAILABLE → OCCUPIED` | System — automatically when first Order is `CONFIRMED` on this table |
| `OCCUPIED → DIRTY` | System — when `CustomerSession` moves to `COMPLETED` or `EXPIRED` (default flow) |
| `OCCUPIED → AVAILABLE` | System — when `CustomerSession` completes AND merchant has disabled DIRTY state in settings |
| `DIRTY → AVAILABLE` | Staff (cashier/supervisor/owner) taps "Mark Clean" on floor map |
| `AVAILABLE → RESERVED` | Staff (cashier/supervisor/owner) via merchant-pos floor map |
| `RESERVED → AVAILABLE` | Staff via merchant-pos |
| `AVAILABLE → CLOSED` | Staff or FBQRSYS admin |
| `CLOSED → AVAILABLE` | Staff or FBQRSYS admin |
| `OCCUPIED → CLOSED` | Not allowed — must close session first |
| `DIRTY → CLOSED` | Staff or FBQRSYS admin |

- **A RESERVED table cannot be scanned** — QR validation server rejects with: "This table is reserved. Please ask staff."
- **A DIRTY table cannot be scanned** — rejects with: "This table is being prepared. Please ask staff."
- **A CLOSED table cannot be scanned** — rejects with: "This table is currently unavailable. Please ask staff."
- `RESERVED` status is manual-only in Phase 1. Future reservation system (Phase 2) may set this automatically
- **DIRTY state is opt-in:** Merchants configure `MerchantSettings.enableDirtyState` (default: `false`). When disabled, `OCCUPIED → AVAILABLE` directly (original behaviour). When enabled, `OCCUPIED → DIRTY` — staff must explicitly mark clean. Casual warungs do not need this; fine dining restaurants do.

merchant-pos shows a real-time floor map of table statuses via Supabase Realtime.

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
| 8 | **Kitchen multi-station routing matters at scale** — needed for larger restaurants | ✅ Designed — see Kitchen Station Routing section; category-level assignment, per-item override, station snapshot on OrderItem |
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
- Order numbers auto-generated per branch per day (resets at midnight)
- Ready numbers shown for configurable duration, then cleared

### Cash / "Pay at Counter" Option

Some customers — especially at warungs and older demographics — pay cash.

- Merchant can enable `CASH` as a payment option per restaurant in `MerchantSettings` (off by default)
- Customer selects "Bayar di Kasir" at checkout — order submitted with `Payment.status: PENDING_CASH`
- Order sits in `merchant-pos` cash queue, **not yet sent to kitchen**
- Cashier collects cash → taps [Confirm & Send to Kitchen] → `Payment.status → SUCCESS`, `Payment.amount` recorded → `Order.status → CONFIRMED` → routed to kitchen (same flow as digital)
- Cash orders appear in reports separately from QRIS/digital payments

#### Full PAY_AT_CASHIER confirmation flow

```
Customer submits order (selects "Bayar di Kasir")
    │
    ▼
Order created: status PENDING
Payment created: method CASH, status PENDING_CASH, provider null
Kitchen does NOT see this order
    │
    ▼
merchant-pos shows alert: "New cash order — Table X — awaiting cashier"
Sound alert plays
    │
    ▼
Cashier reviews order on merchant-pos → collects correct cash amount from customer
    │
    ├── [Confirm & Send to Kitchen]
    │       Payment.status → SUCCESS
    │       Payment.amount → cash amount collected (entered by cashier)
    │       Order.status → CONFIRMED
    │       Order pushed to kitchen (same Supabase Realtime event as digital)
    │       AuditLog: APPROVE, entity: Order, actor: cashier
    │
    └── [Reject Order]
            Order.status → CANCELLED
            Customer sees: "Your order was cancelled by the cashier."
            AuditLog: CANCEL, entity: Order, actor: cashier
```

**Rate limiting for cash:** Max `maxPendingOrders` concurrent `PENDING_CASH` orders per `CustomerSession` (same limit as digital). A customer cannot flood the cashier queue.

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

## Multi-Branch Per Merchant Account

> **Deal-breaker for chains.** A chain owner operating 8 branches under one restaurant name cannot manage them as separate disconnected accounts.

### Core rule

**1 Merchant account = 1 Restaurant brand. Always.**

The three-level hierarchy:
- `Merchant` = owner account (login, billing, subscription)
- `Restaurant` = the brand (menu, branding, settings) — exactly one per Merchant
- `Branch` = physical location of that brand — one or many per Restaurant

If a merchant owns two different brands, they register a new Merchant account with a different email for each brand. The two brands are fully independent on the platform.

Multi-branch means: **one brand, multiple physical locations** (e.g. "Ayam Bakar Sari — Sudirman", "Ayam Bakar Sari — Kelapa Gading", "Ayam Bakar Sari — BSD").

### Data model

```
Merchant (owner account)  — 1-to-1 with Restaurant
  └── Restaurant           — exactly one per Merchant
        └── Branch[]       — multiple physical locations (gated by multiBranchEnabled)
```

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

### What the merchant sees after activation

- A **branch selector** in `merchant-pos` — switches the dashboard view to a specific branch or "All Branches" aggregate
- Staff accounts are scoped to one branch — they do not see the selector
- No "restaurant switcher" exists — a merchant has exactly one restaurant

### What each branch owns

Each `Branch` has its own:
- Tables (and their QR codes)
- Staff assignments
- Branch-level order history and reports

The following are **shared across all branches** (set at restaurant level):
- Menu (categories, items, variants, add-ons)
- Branding
- Promotions
- Kitchen stations
- Merchant settings (tax, service charge, payment methods)

### Schema fields

| Model | Field | Notes |
|---|---|---|
| `Merchant` | `multiBranchEnabled` | bool — set by FBQRSYS admin only; default false |
| `Merchant` | `branchLimit` | int — max branches allowed; set by FBQRSYS admin |
| `Restaurant` | `merchantId` | FK to owning Merchant (unique — enforces 1-to-1) |
| `Branch` | `restaurantId` | FK to owning Restaurant |

Permissions, subscriptions, and audit logs are **restaurant-scoped**, not branch-scoped.

### Design rationale

> **Why not self-service branch creation?**
> Allowing merchants to freely add branches bypasses plan enforcement (e.g. a Starter plan merchant adding 10 branches). Manual FBQRSYS approval keeps `branchLimit` enforced without building a complex automated guard. At current scale, the volume of EOIs is low enough that manual processing is faster to build and maintain than an automated approval workflow.

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

### Realtime reliability

Supabase Realtime is the primary channel for all live updates (kitchen display, order tracking, floor map). To guard against missed events:
- **Kitchen display** and **merchant-pos**: on mount, fetch current order state via REST API, then subscribe to Realtime delta. This ensures no orders are missed if a connection drop occurred before the component mounted.
- **Customer order tracking**: same pattern — REST fetch on load, Realtime for updates. Additionally, customer page polls every 30 seconds as a fallback (silent, no visible loading state).
- **Connection drop handling**: on Supabase Realtime disconnect, show a subtle "Reconnecting…" banner. On reconnect, re-fetch current state before resuming subscription.
- **Channel strategy:** Supabase Realtime subscriptions are scoped per branch: `channel: orders:branchId`. Never subscribe per-order — that creates O(N) channels per kitchen screen. One channel per branch receives all order events for that branch.

### Kitchen multi-device priority conflict resolution

When two kitchen screens reorder the same station queue simultaneously:
- **Last write wins** — `OrderItem.kitchenPriority` is updated by whichever write arrives last at the DB.
- Supabase Realtime broadcasts the change to all subscribers; all screens receive the final state within milliseconds and re-render.
- There is no lock or conflict UI — in practice, two kitchen staff simultaneously reordering the same queue is extremely rare and the last-write-wins behaviour is acceptable. Staff naturally coordinate verbally.
- All priority changes are logged in `AuditLog` with the actor's ID, so any disputed reorder is auditable.

### Midtrans webhook reliability

- Midtrans retries failed webhooks up to 5 times with exponential backoff
- FBQR must respond with HTTP 200 within 10 seconds; use a background job queue if processing takes longer
- A daily **reconciliation job** (Vercel Cron) compares `PENDING` orders older than 30 minutes against Midtrans transaction status API and resolves any discrepancies. This catches webhooks that were missed or delivered out of order.

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
| **Copy menu to a new branch** | Menu is shared across branches (restaurant-level), so this is mainly useful when a merchant registers a second restaurant under a new account |

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

1 Merchant = 1 Restaurant. Multi-branch means multiple `Branch` records under that one restaurant. There is no restaurant switcher — only a branch selector.

#### Branch selector

When `multiBranchEnabled = true`, a branch selector appears at the top of `merchant-pos`:
- "All Branches" (default) — aggregate view across the entire restaurant
- Individual branch — drill-down to one physical location

Staff accounts are scoped to one branch and see that branch's view directly, with no selector shown.

#### Branch-level data

Each branch has its own: orders, revenue, table status, staff activity, queue display.

Shared across all branches (no per-branch override): menu, branding, promotions, kitchen stations, tax/service charge settings.

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

### Merchant Owner Dashboard — Multi-Branch Aggregate View

When "All Branches" is selected in the branch selector, the merchant sees a consolidated view across all physical locations of their one restaurant.

#### Overview cards

| Card | Data |
|---|---|
| **Total revenue (all branches)** | Consolidated IDR for period |
| **Total orders (all branches)** | Consolidated count |
| **Best-performing branch** | Highest revenue this month |
| **Fastest-growing branch** | Highest month-over-month growth |
| **Branches needing attention** | Any with unusually low ratings or high cancellation rates |

#### Branch comparison table

A sortable table showing each branch side by side:

| Column | Description |
|---|---|
| Branch name | Link to drill into that branch's view |
| Revenue (period) | IDR |
| Orders (period) | Count |
| AOV | Average order value |
| Avg rating | Star average |
| Active tables | Currently occupied |

Sortable by any column. Click a row to drill into that branch's individual view.

#### Consolidated accounting export

When exporting, the merchant can choose:
- Single branch → scoped export
- All branches → one combined Excel/CSV with a `branchName` column added

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
| **Multi-branch per merchant** | 🚨 Deal-breaker | Chain | One login, multiple branches; enabled via FBQRSYS EOI |
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
| **Analytics event tracking** | 📋 Nice-to-have | All | `AnalyticsEvent` model for funnel conversion, abandoned cart tracking, upsell performance. `AuditLog` covers state changes; this is for product analytics. Phase 2. |
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

## Database Indexing Strategy

Define these indexes at migration time (Step 2). Missing indexes on these tables will cause slow queries at scale.

| Table | Index | Reason |
|---|---|---|
| `Order` | `(branchId, createdAt DESC)` | Dashboard date-range queries |
| `Order` | `(status)` | Filtering active orders for kitchen display |
| `Order` | `(customerSessionId)` | Fetching all orders for a session |
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

> **Note:** These are starting defaults. Merchants can adjust `maxPendingOrders` and `maxOrderValue` from `MerchantSettings`. FBQRSYS can override limits for Enterprise accounts.

---

## Menu Caching Strategy

The menu endpoint (`GET /api/menu/{restaurantId}`) is the highest-traffic read in the system. Caching is mandatory at launch.

- **Cache layer:** Vercel Edge Cache (built-in with Next.js `fetch` cache)
- **Cache key:** `restaurantId` + `locale` (for future i18n)
- **TTL:** 5 minutes
- **Invalidation:** When a merchant saves any menu change (category, item, branding), call `revalidatePath` to purge the cache immediately
- **What is cached:** Full menu JSON (categories + items + branding) — the entire payload for the customer app on first load
- **What is NOT cached:** Order status, table status, session state — these are always real-time

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

### ADR-007: 1 Merchant = 1 Restaurant; Multi-Branch via FBQRSYS EOI

**Decision:** One Merchant account always maps to exactly one Restaurant. A second restaurant (different brand/concept) requires a new Merchant account with a different email. Multiple physical locations of the same restaurant are supported as `Branch[]` records under that one Restaurant, gated by `multiBranchEnabled` and `branchLimit` set by FBQRSYS admin via EOI.

**Rationale:** Strict 1-to-1 simplifies the entire permission, billing, and subscription model — everything is restaurant-scoped with no ambiguity. A merchant wanting a genuinely different restaurant concept has different branding, menu, and potentially different subscription needs anyway, so a separate account is the right boundary. Multi-branch (same restaurant, multiple locations) is the legitimate scaling use case and is fully supported within one account.

**Tradeoffs accepted:** A merchant with two different restaurant brands must manage two separate accounts. This is an intentional constraint, not an oversight. If a merchant outgrows this and wants a true multi-brand account, that is an Enterprise-tier feature to design separately.

**On EOI being manual:** Self-service branch creation bypasses plan enforcement. Manual approval ensures `branchLimit` is set correctly per plan. At current scale, EOI volume is low enough that manual processing is faster to build than an automated workflow.

**Open question / improvement area:** If EOI volume grows, an in-app `MerchantRequest` queue for FBQRSYS admins would replace email. No schema conflicts — just a new `MerchantRequest` model and admin review UI.

**Status:** Decided. In-app EOI form is a clean Phase 2 addition.

---

### ADR-008: Only end-user-system is Merchant-Branded

**Decision:** FBQRSYS and `merchant-pos` always display FBQR's own UI. Only the `apps/menu` (customer-facing) app applies merchant branding (logo, colors, font).

**Rationale:** FBQRSYS is a B2B platform admin tool — merchants and FBQRSYS staff both need to know they are operating the FBQR platform. Branding FBQRSYS with merchant colors would cause confusion. `merchant-pos` retains FBQR UI chrome so support staff can recognise the system immediately when assisting merchants. Customers, however, should feel they are at the restaurant's own digital experience — they may not know or care that FBQR is the underlying platform.

**Status:** Decided. This is a deliberate product positioning choice.

---

---

### ADR-009: One CustomerSession per Table (not per device)

**Decision:** Exactly one `CustomerSession` can be ACTIVE per table at any time. If a second device scans the same QR code while a session is already ACTIVE, the second scan resumes the existing session (using the session cookie).

**Rationale:** A single-session model is simpler to implement, simpler to reason about for reporting, and matches how restaurants think ("Table 5 has one bill"). Group ordering (multiple phones adding to the same cart) is a Phase 2 feature; the schema supports it but the UI does not implement it in Phase 1. The session cookie allows any phone that scanned to reconnect without re-scanning.

**Consequence:** In Phase 1, "group ordering" means: one person orders, others view the tracking screen. This is the common case in Indonesian casual dining. Full collaborative cart (each person adds items from their own phone) is deferred to Phase 2 but the schema is designed to support it.

**Status:** Decided.

---

### ADR-010: Table Occupancy on First Confirmed Order (not on QR Scan)

**Decision:** A table's status changes from `AVAILABLE` to `OCCUPIED` when the first `Order` for that session is `CONFIRMED` (payment successful), not when the QR is scanned.

**Rationale:** QR scanning is cheap and accidental — a customer might scan to look at the menu and leave without ordering. Marking the table `OCCUPIED` on scan would pollute the floor map with false occupancies. A confirmed payment is the definitive signal that a customer is actually at the table and has committed.

**Consequence:** There is a brief window where a customer has scanned and is browsing but the table still shows `AVAILABLE`. This is acceptable — the floor map is a rough guide for staff, not a real-time seat sensor. Staff can always manually update table status.

**Status:** Decided.

---

### ADR-011: Customer Session Continuity via Cookie

**Decision:** On QR scan, a session cookie (`fbqr_session_id`) is set on the customer's browser. On subsequent page loads (including refresh), the server checks for this cookie before creating a new session. If a valid ACTIVE session exists for that cookie+table, it is resumed without requiring a re-scan.

**Rationale:** Without this, a customer who refreshes the page loses their order tracking. This is a critical UX failure. The cookie approach is the simplest implementation — no login required, no QR re-scan, no user action needed.

**Security:** The cookie contains only the `CustomerSession.id` (a UUID). It has no elevated permissions. Even if stolen, it only allows viewing the menu and order status for one table — no payment information is accessible.

**Status:** Decided.

---

### ADR-012: Delivery Order Branch Assignment

**Decision:** Delivery orders (GrabFood/GoFood/ShopeeFood) are assigned to a specific `Branch` based on the merchant's configuration. Each delivery platform account is linked to exactly one branch. FBQRSYS admin or merchant sets this mapping in the restaurant settings.

**Rationale:** A merchant with 3 branches may have separate delivery platform accounts per branch. The webhook must know which branch to route to. Hardcoding a restaurant-level default (without branch routing) would be wrong for multi-branch operators. The mapping is set once during setup and rarely changes.

**Consequence for Phase 1:** Manual entry of delivery orders in merchant-pos allows the staff to select which branch the order belongs to. Phase 2 automated webhook uses the pre-configured mapping.

**Status:** Decided.

---

### ADR-013: Tax-Inclusive Price Computation

**Decision:** When `MerchantSettings.pricesIncludeTax = true`, displayed prices are tax-inclusive. The tax amount is back-calculated as: `taxAmount = round(price * taxRate / (1 + taxRate))`. Subtotal = sum of item prices. Tax = back-calculated from subtotal. Total = subtotal (prices already include tax — no addition needed).

When `pricesIncludeTax = false` (default): subtotal = sum of prices, tax = `round(subtotal * taxRate)`, total = subtotal + tax + serviceCharge.

**Example (tax-inclusive, 11% PPN):**
- Item price: Rp 55,000 (tax-inclusive)
- Tax back-calculated: `round(55000 * 0.11 / 1.11)` = Rp 5,450
- Net price (ex-tax): Rp 49,550

**Rationale:** Indonesia's PPN regulation allows either tax-inclusive or tax-exclusive pricing. Most warungs and casual restaurants display tax-inclusive prices. The formula is standard and must be documented precisely to avoid rounding discrepancies between the pre-invoice and the final invoice.

**All amounts stored as integers (IDR, no decimals).** Rounding uses `Math.round()` (round half up).

**Status:** Decided.

---

### ADR-014: Multiple Orders per CustomerSession

**Decision:** A `CustomerSession` supports multiple `Order` records. Customers can order mains, then later add desserts or drinks — each becomes a new `Order` linked to the same `CustomerSession`. The order tracking screen shows all orders from the session grouped together.

**Rationale:** This is normal Indonesian restaurant behavior. A group orders food, eats, then orders drinks or desserts as a second round. A single-order-per-session design would force staff to open a new session for the second round, which is operationally clunky.

**Consequence:** The kitchen display groups `OrderItem`s by `Order`, not by session. Each `Order` has its own status lifecycle independently.

**Status:** Decided.

---

### ADR-015: QR Token Strategy — Static Table Token + Short-Lived Signed URL

**Decision:** Each `Table` has a permanent `tableToken` (UUID, never changes unless staff explicitly rotate it). The QR code printed for the table encodes a redirect URL at FBQR's domain: `https://menu.fbqr.app/r/{tableToken}`. When scanned, this redirect endpoint generates a short-lived signed URL with a 24-hour `sig` parameter and forwards the customer to the actual menu URL. The `sig` is `HMAC-SHA256(tableToken + expiryTimestamp, SERVER_SECRET)`.

**Why not put the sig in the QR code itself?**
The QR code on a physical table cannot be updated dynamically. Encoding the `sig` in the QR would require reprinting every 24 hours. Using a redirect endpoint means: the physical QR never changes; the security layer is server-side.

**What this prevents:** A customer who screenshots and shares the full redirect URL after scanning — the URL contains only `tableToken`, not a `sig`. The redirect endpoint always generates a fresh `sig`. The resulting menu URL (with `sig`) expires in 24 hours, making shared screenshots useless the next day.

**Status:** Decided.

---

### ADR-016: Configurable Payment Timing (Pay-First vs Pay-at-Cashier)

**Decision:** Payment timing is configurable per restaurant via `MerchantSettings.paymentMode`:
- `PAY_FIRST` (default): customer must pay via Midtrans before order reaches kitchen
- `PAY_AT_CASHIER`: customer orders, kitchen receives immediately, cashier collects payment at end

**Rationale:** Some Indonesian restaurants — particularly fine dining and family restaurants — prefer the traditional model where customers pay at the end. Forcing pay-first on them would be a deal-breaker. The QR ordering UX still works in pay-at-cashier mode, it just skips the Midtrans payment step.

**Security implications for PAY_AT_CASHIER:** Without payment gating, any order with a valid session goes straight to the kitchen. The fraud risk is the same as a traditional restaurant that takes verbal orders. Merchants who enable this mode accept this risk. CASH payment method must be enabled for this mode to be useful.

**Status:** Decided.

---

### ADR-017: Keeping `Restaurant` as the Model Name (not `RestaurantBrand`)

**Challenge received:** Architecture review v1.2 suggested renaming `Restaurant` to `RestaurantBrand` to clarify the 3-level hierarchy (Merchant → RestaurantBrand → Branch).

**Decision: REJECTED — keep `Restaurant` as the model name.**

**Reasoning:**
1. `Restaurant` is the idiomatic name for this concept in every major F&B software system. Developers and the domain model align on it immediately.
2. The Brand vs Location distinction is explained in the documentation (`## Authentication Model` and `## Multi-Branch Per Merchant Account`). Model naming is not the primary place to communicate design intent — documentation is.
3. `RestaurantBrand` as a FK appears in ~15 models: `restaurantBrandId` is 30% more verbose than `restaurantId` with no functional benefit. It makes every query, join, and API response noisier.
4. The risk of confusion was already addressed in v1.2 by clearly writing: "`Restaurant` represents the **brand** — its menu, branding, settings, and identity." This is sufficient.

**Future agents:** Do not rename `Restaurant` to `RestaurantBrand` in schema or code. The concept is documented; the name is intentional.

**Status:** Decided. Challenge considered and rejected.

---

### ADR-018: Review Rebuttals — Items Already Addressed Before v1.2 Review

This ADR exists so future AI agents do not re-raise issues that were already addressed.

**Fixed before v1.2 review:**

| Reviewer challenge | Status | Where addressed |
|---|---|---|
| Payment method enum mismatch (GOPAY/OVO vs EWALLET) | ✅ Fixed in v1.2 | `Payment` model: `method` + `provider` fields |
| QR URL sharing / abuse (shared screenshots) | ✅ Fixed in v1.2 | ADR-015: static QR + 24h signed URL via redirect |
| Missing database indexing strategy | ✅ Added in v1.2 | `## Database Indexing Strategy` section |
| Missing menu caching strategy | ✅ Added in v1.2 | `## Menu Caching Strategy` section |
| Multiple orders per session unclear | ✅ Addressed in v1.2 | ADR-014: multiple Orders per CustomerSession |
| Table token security unclear | ✅ Addressed in v1.2 | ADR-015: HMAC-SHA256 signed URL strategy |

**Fixed before v1.3 review:**

| Reviewer challenge | Status | Where addressed |
|---|---|---|
| Order creation contradicts payment initiation (PENDING wording) | ✅ Fixed in v1.2 | Two-path explanation: PAY_FIRST + PAY_AT_CASHIER |
| EXPIRED state missing from lifecycle diagram | ✅ Fixed in v1.3 | Visual branch diagram: `PENDING ──► EXPIRED` |
| CustomerSession hijacking via shared QR link | ✅ Fixed in v1.2 | ADR-015 (24h signed URL), rate limiting, session cookie |
| Midtrans webhook timeout / late webhook | ✅ Fixed in v1.3 | `lateWebhookWindowMinutes` in MerchantSettings |
| Kitchen station routing priority ambiguous | ✅ Fixed in v1.3 | Item override > category station > default (explicit precedence) |
| AI recommendation design underspecified | ✅ Already documented | Pure SQL analytics starting point documented; ML upgrade path noted |
| Real-time channel scaling | ✅ Fixed in v1.3 | Per-branch channel `orders:branchId` (not per-order) |
| Refund authority unclear | ✅ Resolved in v1.3 | Merchant owner + admin; auto-trigger in 2 edge cases |
| Multiple active orders per table unclear | ✅ Resolved in ADR-014 | Multiple Orders per CustomerSession |
| Service charge configuration missing | ✅ Already in spec | `serviceChargeRate` + `serviceChargeLabel` in MerchantSettings |
| Table QR token rotation policy | ✅ Resolved in ADR-015 | Rotate on table reset (staff closes session); static QR + short-lived sig |

**Future agents:** If you are about to raise any of these as issues, read the referenced ADRs first.

---

### Open Questions for Future AI Agents

The following are areas where the design is incomplete or where a future AI agent is explicitly invited to propose an approach:

| Area | Current state | Question |
|---|---|---|
| **Table-level rate limiting** | Not yet specified | What is the right limit (N pending orders per table per hour) to balance fraud prevention against legitimate multi-round ordering (mains then desserts)? Suggested starting point: max 5 PENDING orders per session at one time, configurable per merchant. |
| **Anomaly detection for fake orders** | Not designed | Should FBQR auto-flag suspicious sessions (e.g. 10+ orders in 5 minutes from one table token)? What should the trigger threshold and response be? |
| **In-app EOI form for multi-branch** | Not built | When should this replace email EOI? Fields: restaurant name, number of branches needed, locations, timeline. Creates a `MerchantRequest` model. Phase 2 addition. |
| **Accurate / Jurnal.id accounting integration** | Phase 2 only | Which integration method (API, CSV export, webhook) best fits Accurate Online's API capabilities? |
| **Delivery platform webhook authentication** | Not designed | Use platform-specific signature verification: GrabFood uses HMAC-SHA256 with a shared secret, GoFood uses a bearer token. Each platform's auth method must be implemented separately. Reference each platform's API documentation at implementation time. |

**Resolved decisions (previously open):**

| Area | Decision | Rationale |
|---|---|---|
| **Refund authority** | Merchant owner + FBQRSYS admin can both trigger refunds. System auto-triggers in two cases: payment webhook on a suspended merchant, and late webhook beyond `lateWebhookWindowMinutes`. Partial refund supported (Midtrans API supports it). Triggers: `Order → CANCELLED`, `Payment → REFUNDED`, credit note generated. Full flow designed in Step 15 + Step 19. | Merchant owner needs it for customer disputes; admin needs it for platform-level issues; auto-trigger needed for the two edge cases above |
| **FBQR Points redemption funding** | Merchant-funded. When a customer redeems FBQR Points at a restaurant, the cost is borne by that merchant (deducted from their settlement). FBQR acts as the points ledger but does not subsidise redemption. Exchange rate and per-restaurant redemption cap are set by FBQRSYS. | Cleaner unit economics; aligns merchant incentive with loyalty program participation; avoids FBQR taking on unbounded liability |

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

> **See the Phase Tracker at the top of this file** for the live checkbox state of each step. The table below is the canonical sequence — the Phase Tracker is the authoritative record of what has been completed.

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
