# CLAUDE.md

This file provides guidance for AI assistants (Claude Code and similar tools) working in this repository.

---

## CURRENT STATE — Read This First

> **Every AI agent must read this block before doing anything else.**
> Update this block at the END of every session before pushing.

```
Last updated   : 2026-03-10
Version        : 2.1
Current phase  : Phase 0 — Requirements complete. Senior architect review (v2.1) applied. No code written yet.
Last completed : Senior architect review (v2.0 → v2.1): 9 correctness fixes, 8 logic flaw fixes,
                 12 improvements, 7 open questions resolved.
                 Key additions: Promotion model full spec; Self-Service Merchant Registration
                 section; Customer Account & Registration section; Seed Script Specification;
                 MenuItemVariant + MenuItemAddon field specs; BY_WEIGHT second payment channel
                 specified (same as original, paymentType field added); Session cookie
                 cross-table guard (ADR-011); QueueCounter WIB timezone; maxActiveOrders
                 atomic INSERT pattern; autoResetAvailability + stockCount constraint;
                 MerchantLoyaltyProgram cardinality (one active per restaurant); PreInvoice
                 removed from schema (computed); RoleTemplate storage (hardcoded JSON).
Next step      : Step 1 — Monorepo scaffold (Turborepo, packages, apps)
Active branch  : claude/claude-md-mmj9kfzjcs43k5bw-RRqsz
Open decisions : See "Open Questions for Future AI Agents" in the ADR section (remaining
                 items are Phase 2 concerns; all Phase 1 blockers resolved)
Known doc gaps : refund flow full detail — deferred to Step 15 and Step 19;
                 estimated wait time display for customers — formula documented, UI Phase 2;
                 Hidang mode full flow — deferred to Phase 2;
                 customer READY notification — resolved: Phase 1 accepts gap, Phase 2 WA message
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
| **Frontend** | [Next.js 15+](https://nextjs.org/) (App Router) | SSR, API routes, great DX |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) | Unstyled primitives you own; Tailwind-native; no Bootstrap conflict. See ADR-020. |
| **Admin layout** | [shadcn/ui Blocks](https://ui.shadcn.com/blocks) + shadcn Sidebar component | Pre-built dashboard layouts — no separate admin framework needed |
| **Data tables** | [TanStack Table](https://tanstack.com/table) via shadcn DataTable | Headless, type-safe sorting / filtering / pagination |
| **Charts** | [Recharts](https://recharts.org/) via shadcn Charts | Composable, Tailwind-compatible; all analytics dashboards |
| **Animation** | [Framer Motion](https://www.framer.com/motion/) | Page transitions, micro-interactions, mobile gesture handling |
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
| **API docs** | [Zod-to-OpenAPI](https://github.com/asteasolutions/zod-to-openapi) + Swagger UI | Auto-generated from Zod schemas; served at `/api/docs` (Phase 2) |
| **i18n** | [next-intl](https://next-intl-docs.vercel.app/) | Bahasa Indonesia default; multi-language expansion path |
| **Hosting** | [Vercel](https://vercel.com/) (Next.js) + [Supabase](https://supabase.com/) | Generous free tiers, auto-scaling |

> **Architecture note:** This project uses a **modular monolith** (not microservices).
> The Turborepo structure enforces clean domain boundaries between sub-systems.
> Individual apps can be extracted into independent services later if scaling demands it,
> but microservices add significant operational overhead that is not worth it at this stage.
>
> **UI framework decision:** CoreUI and AdminLTE are explicitly rejected — both are Bootstrap-based and conflict with Tailwind CSS. shadcn/ui Blocks + TanStack Table + Recharts + Framer Motion replaces all admin template needs without framework lock-in. See ADR-020.

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

> **PIN auth security:** PIN sessions must have an **inactivity timeout** (default: 4 hours, configurable per merchant) after which the device returns to the PIN entry screen. High-sensitivity actions — specifically order `CANCEL` and `REFUND` — require the acting staff member to have the `orders:manage` permission explicitly. Every such action is recorded in `AuditLog` with `actorId`, `actorName`, and `cancellationReason`. Merchants requiring an additional supervisor approval gate (e.g. for large-value cancellations) can configure a `requireSupervisorFor: CANCEL` flag in settings — Phase 2 feature, schema should anticipate it.
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
| `orders:refund` | Issue refunds and credit notes — distinct from `orders:manage` to allow granular control (e.g. Cashier can cancel but not refund) |
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
| Supervisor | `menu:manage`, `promotions:manage`, `reports:read`, `orders:view`, `orders:manage`, `orders:refund`, `tables:manage`, `invoices:read` |
| Cashier | `orders:view`, `orders:manage`, `invoices:read` |
| Kitchen Admin | `kitchen:view`, `kitchen:manage`, `orders:view` |
| Kitchen Staff | `kitchen:view`, `orders:view` |

> **Owner accounts are special.** The Merchant owner (email + password) always has full access and cannot be stripped of permissions. The FBQRSYS owner (the FBQR platform account) always has full platform access. These are the only hardcoded "super" roles.

> **Role template storage:** Templates are hardcoded as a JSON constant in `packages/config/roleTemplates.ts` — they are **not** database records. When a user picks a template in the UI, a new `MerchantRole` (or `SystemRole`) record is created with that template's permission list copied in. Modifications after creation only affect the new role. Templates cannot be edited at runtime; changes require a code deploy. This is intentional: templates are opinionated starting points, not live configurations. An agent building Step 4 must NOT create a `RoleTemplate` Prisma model.

> **Staff.branchId null semantics:** A `null` branchId means **restaurant-level access** — the staff member can see all branches. In practice, this applies only to special staff types: (a) the merchant owner themselves (who is a `Merchant` record, not a `Staff` record, but the distinction matters in auth middleware), and (b) restaurant managers intentionally created with branch-wide scope. All standard staff accounts created via the Staff management UI **must always have a branchId set** — the UI enforces this with a required branch selector. A null branchId on a Staff record is only valid when `multiBranchEnabled = false` (single-branch restaurant, where the sole branch is implicit). When `multiBranchEnabled = true`, null branchId on a Staff record triggers a warning in the RBAC middleware: staff should always be explicitly scoped.

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

## Merchant Onboarding & In-App Guidance

> **A merchant who feels lost in the first 10 minutes will churn.** Pak Budi has never used SaaS. Tante Lina is not a tech person. The system must guide them from "blank account" to "accepting first order" with zero support ticket. This is not optional — it is the difference between activation and abandonment.

### First-Login Setup Wizard

Displayed immediately after a merchant's first login. Blocking (cannot access dashboard until Step 1 and Step 3 are complete). All other steps skippable but tracked.

```
Welcome to FBQR! Let's get your restaurant ready in 5 steps.
────────────────────────────────────────────────────────────

Step 1 ✱  Restaurant Details          [REQUIRED]
          Name, address, cuisine type, logo upload
          → Sets Restaurant.name, Branch.address, RestaurantBranding.logoUrl

Step 2    Your First Menu             [recommended]
          "Add at least 3 items to your menu to preview how it looks."
          → Creates 1 MenuCategory + up to 5 MenuItems (simplified inline form)
          → Shows live preview of apps/menu as merchant types

Step 3 ✱  Create Your First Table     [REQUIRED]
          Table name/number → system generates QR code immediately
          → "Scan this QR now to see your menu on your phone!" ← the "aha" moment

Step 4    Payment Setup               [recommended]
          Enable QRIS (default, always available)
          Optionally enable Cash ("Bayar di Kasir")
          → Sets MerchantSettings.paymentMode

Step 5    Invite Your First Staff     [optional]
          Enter staff name + PIN → creates Staff account
          → Can skip; owner can do everything themselves initially

────────────────────────────────────────────────────────────
[ Skip to dashboard ]  ←  always visible after Step 1 + 3 complete
```

**Wizard UX rules:**
- One step per screen — no multi-field scroll of doom
- Each step shows estimated time: "~2 minutes"
- Progress bar at top (1 of 5)
- Back button always available (no data lost)
- Step 3 shows an animated QR code that the merchant can scan immediately — the single most powerful activation moment
- Wizard state is persisted in DB (`Merchant.onboardingStep: int`) so page refresh does not restart it

### Setup Completion Checklist (Persistent)

After wizard, a dismissible checklist card appears on the merchant-pos home dashboard until all items are checked:

```
┌─────────────────────────────────────────────┐
│  🚀  Selesaikan setup restoran Anda          │
│  ████████░░  80% selesai                    │
│                                              │
│  ✅  Info restoran diisi                    │
│  ✅  Menu pertama dibuat (3 item)           │
│  ✅  Meja & QR code dibuat                  │
│  ✅  Metode pembayaran dikonfigurasi        │
│  ⬜  Undang staff pertama          → Setup  │
│  ⬜  Atur branding & warna         → Setup  │
│  ⬜  Coba terima pesanan pertama   → Guide  │
│                                              │
│                          [ Sembunyikan ]    │
└─────────────────────────────────────────────┘
```

Checklist is stored in `Merchant.onboardingChecklist` (JSON array of completed keys). Dismissed permanently per merchant when they click "Sembunyikan" (but admin can reset it).

### In-App Contextual Help

**`?` icon tooltip on every non-obvious setting:**

Every field in MerchantSettings, RBAC role editor, kitchen station config, and tax settings gets a `?` icon that opens a popover with:
1. What this setting does in plain language
2. Example: "e.g. kalau Anda set 15, pesanan baru akan ditolak kalau ada 15 pesanan aktif di dapur"
3. Recommended value for most restaurants

**Coach marks (first-time tour):**
Shown once per feature area on first visit. Uses a simple highlight overlay (no third-party tour library — custom built with Framer Motion). Areas covered:
- First visit to kitchen display → highlight station tabs + priority drag handle
- First visit to floor map → highlight "Pause Orders" toggle + table status colours
- First visit to reports → highlight date range filter + export button

Coach marks are stored in `Staff.seenCoachMarks: string[]` (array of keys). Dismissed permanently per staff member.

**Empty state guidance (examples):**

| Screen | Empty state message | CTA |
|---|---|---|
| Menu categories (0 items) | "Belum ada kategori menu. Tambahkan kategori pertama untuk mulai menerima pesanan." | [ + Tambah Kategori ] |
| Tables (0 tables) | "Belum ada meja. Buat meja dan unduh QR code-nya untuk pelanggan." | [ + Tambah Meja ] |
| Staff (0 staff) | "Hanya Anda yang bisa login saat ini. Tambahkan staff untuk berbagi akses." | [ + Tambah Staff ] |
| Orders today (0 orders) | "Belum ada pesanan hari ini. Share QR code meja Anda ke pelanggan!" | [ Lihat QR Code ] |
| Kitchen display (no active orders) | "Dapur kosong — tidak ada pesanan aktif." | — (no CTA needed) |

### In-App Help Panel

A slide-out panel (shadcn `Sheet`) accessible from the `?` button in the main navigation. Contains:

**FAQ — Top 15 questions (searchable):**

| # | Question | Category |
|---|---|---|
| 1 | Bagaimana cara membuat QR code untuk meja? | Setup |
| 2 | Bagaimana cara menambahkan item menu? | Menu |
| 3 | Bagaimana cara memberi akses ke staff? | Staff |
| 4 | Pelanggan tidak bisa scan QR, kenapa? | Troubleshooting |
| 5 | Bagaimana cara pause pesanan saat dapur sibuk? | Operations |
| 6 | Bagaimana cara set harga diskon / promo? | Menu |
| 7 | Bagaimana cara melihat laporan penjualan? | Reports |
| 8 | Bagaimana cara mengatur pajak (PPN)? | Settings |
| 9 | Bagaimana cara cetak struk? | Hardware |
| 10 | Pesanan sudah dibayar tapi tidak muncul di dapur? | Troubleshooting |
| 11 | Bagaimana cara tandai item habis terjual? | Menu |
| 12 | Bagaimana cara tutup meja setelah tamu selesai? | Operations |
| 13 | Bagaimana cara export laporan ke Excel? | Reports |
| 14 | Bagaimana cara upgrade plan? | Billing |
| 15 | Bagaimana cara menghubungi support FBQR? | Support |

**Video guides** (embedded YouTube, 60–90 seconds each):
- "Setup pertama: dari daftar sampai terima pesanan pertama" (onboarding overview)
- "Cara menambahkan dan mengatur menu"
- "Cara menggunakan kitchen display"
- "Cara membaca laporan penjualan"

**Support contact:**
- WhatsApp Business button (direct link to FBQR support WA number)
- Email: support@fbqr.app
- Response time indicator: "Biasanya kami balas dalam 2 jam (07:00–22:00 WIB)"

### `Merchant.onboardingStep` Schema Field

Add to `Merchant` model:

| Field | Type | Notes |
|---|---|---|
| `onboardingStep` | int | 0 = not started, 1–5 = wizard step completed, 6 = wizard complete |
| `onboardingChecklist` | JSON | Array of completed checklist item keys |
| `wizardCompletedAt` | datetime? | Timestamp when wizard reached step 6 |

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
Redirect handler: https://menu.fbqr.app/r/{tableToken}
    → validates token, generates 24h signed URL (ADR-015)
    │
    ▼
URL: https://menu.fbqr.app/{restaurantId}/{tableId}?token={tableToken}&sig={sig}&exp={exp}
    │
    ▼
Server validates:
  - sig = HMAC-SHA256(tableToken + ":" + exp, SERVER_SECRET) and exp > now
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

Three distinct request types are available as separate buttons in the customer UI:

| Button label | `WaiterRequest.type` | Staff UI behaviour |
|---|---|---|
| [ Panggil Pelayan ] | `CALL` | Alert on merchant-pos: "Table 5 calls waiter" |
| [ Butuh Bantuan ] | `ASSISTANCE` | Alert: "Table 5 needs assistance" + optional free-text message |
| [ Minta Struk / Bill ] | `BILL` | Alert: "Table 5 requests bill" + shows current session total to approaching waiter so they arrive EDC machine ready |

- All three create a `WaiterRequest` record (restaurantId, tableId, type, message?, requestedAt, resolvedAt: null)
- Push real-time notification to merchant-pos floor view via Supabase Realtime
- `BILL` type additionally fetches the current session `grandTotal` from confirmed orders and attaches it to the alert — waiter sees the amount before walking to the table
- Staff marks request as resolved (`resolvedAt` set to current time)
- Auto-resolved when the CustomerSession closes (`resolvedAt` set by SYSTEM)
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
| Session TTL expires while order is PREPARING | Session → EXPIRED; table → `DIRTY` (if `enableDirtyState = true`) or `AVAILABLE` (if disabled). Existing orders in CONFIRMED/PREPARING/READY are **not** affected — they continue to completion in the kitchen. Only new order placement is blocked. The customer's order tracking screen continues to show live status via the order ID even after session expiry. |
| Customer accesses order tracking after session EXPIRED | The API checks for the `fbqr_session_id` cookie. If the `CustomerSession` is `EXPIRED`, the API grants **read-only access** to the `Order` rows linked to that session — the customer can view status updates but cannot place new orders. This is the simplest approach and requires no extra infrastructure (the cookie is already present). No new QR scan or login is required to view historical orders. |

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

## Kitchen Display — Order Card Format

> **The number one operational question in any kitchen: "Which table is this for?"** The kitchen display must answer this at a glance, without staff needing to cross-reference another screen.

Every order card on the kitchen display must show, in this visual hierarchy:

```
┌─────────────────────────────────────────────────────────┐
│  [ Table 8 ]   Order #042   •   Dine-in        12:34    │
│─────────────────────────────────────────────────────────│
│  2×  Nasi Goreng Spesial                    [Kitchen]   │
│  1×  Teh Manis Panas                        [Bar]       │
│  1×  Kepiting Saus Padang  ⚖️               [Kitchen]   │
├─────────────────────────────────────────────────────────┤
│  Note: "Nasi goreng no spicy please"                    │
└─────────────────────────────────────────────────────────┘
```

**Required fields per card:**

| Element | Source | Notes |
|---|---|---|
| Table identifier | `Order → CustomerSession → Table.name` | e.g. "Table 8", "Counter 2", "Takeaway #042"; always the first thing visible |
| Order number | `Order.queueNumber` | Sequential per branch per day; all order types; for dine-in this is secondary to the table name in visual hierarchy, but always present |
| Order type badge | `Order.orderType` | 🪑 Dine-in / 🥡 Takeaway / 🛵 Delivery |
| Time placed | `Order.createdAt` | Clock time only (HH:MM), not full date |
| Item lines | `OrderItem` rows | Quantity × name |
| Station badge | `OrderItem.kitchenStationId` snapshot | Colored pill; shown on "All" tab only — suppressed on per-station tabs |
| Special badges | Per OrderItem | ⚖️ Needs weighing, ⚠️ Stock-out flag, 🔥 high priority |
| Customer note | `Order.customerNote` (see below) | Free-text; shown only if non-empty |
| Elapsed timer | Live, from `Order.confirmedAt` | Ticks up in real time; turns yellow at 10 min, red at 20 min (thresholds configurable per merchant) |

**`Order.customerNote`** — add this field to the `Order` model: a free-text string (max 200 chars) that customers can enter at checkout for special requests ("no MSG", "extra spicy", "no cilantro"). Shown on the kitchen card and on the customer's order tracking screen.

**Delivery orders** show driver ETA instead of table: "🛵 GrabFood — Driver arrives ~12:50"

**Takeaway orders** show the queue number prominently: "🥡 Takeaway — #042"

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
- **New orders** at the time of deactivation: the routing engine treats any `MenuCategory.kitchenStationId` pointing to a deactivated station as if it were `null` — falls back to the default station. The FK on `MenuCategory` is **not nullified** when a station is deactivated; the reference is intentionally preserved for historical integrity and so that re-activating the station automatically restores the routing without re-configuration.
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
| `taxOnServiceCharge` | `true` | If true, PPN is applied to (subtotal + serviceCharge). Default `true` — Indonesian PPN regulation generally applies VAT to service charge. Set to `false` for merchants whose service charge is contractually excluded from the tax base. |
| `pricesIncludeTax` | `false` | If true, displayed prices are tax-inclusive |
| `paymentTimeoutMinutes` | `15` | Minutes before a PENDING order auto-expires; configurable per merchant. This value is also passed as `custom_expiry` in the Midtrans `snap_token` request so Midtrans independently expires the payment page at the same time — reducing late webhook occurrences to true edge cases. |
| `lateWebhookWindowMinutes` | `60` | Minutes after expiry during which a SUCCESS webhook revives the order; beyond this auto-refund |
| `paymentMode` | `PAY_FIRST` | `PAY_FIRST` or `PAY_AT_CASHIER` — controls whether Midtrans is required |
| `maxPendingOrders` | `3` | Max concurrent PENDING orders per CustomerSession |
| `maxOrderValueIDR` | `5000000` | Max single-order value in IDR; fraud guard |
| `enableDirtyState` | `false` | If true, table moves to DIRTY after session ends; staff must mark clean before next scan |
| `tableSessionTimeoutMinutes` | `120` | Minutes of inactivity before CustomerSession auto-expires; configurable per merchant |
| `eodCashCleanupHour` | `3` | Hour (0–23, Asia/Jakarta) at which the safety-net cron cancels any remaining abandoned PENDING_CASH orders; configurable for late-night venues |
| `roundingRule` | `NONE` | Rounding applied to `grandTotal` before display and charging: `NONE` (exact integer), `ROUND_50` (nearest 50 IDR), `ROUND_100` (nearest 100 IDR). Cash merchants should use `ROUND_100` since 1 and 5 Rupiah coins are no longer in circulation. Raw (unrounded) values are always stored in DB for reconciliation; only the display and charged amount is rounded. |
| `maxActiveOrders` | `null` | If set (int), new order placement is rejected with "Dapur sedang sibuk" when the count of orders in `CONFIRMED + PREPARING` status for this restaurant reaches this limit. Null = no cap. Overridden immediately by `orderingPaused = true`. |
| `orderingPaused` | `false` | Manual kill-switch. When `true`, no new orders can be placed regardless of `maxActiveOrders`. Staff toggle via [ Pause New Orders ] / [ Resume Orders ] button in merchant-pos floor view. Stored in DB (not just in-memory) so it survives server restarts. New customer order creation API checks this flag first and returns HTTP 503 with a merchant-configurable message (default: "Kami sedang tidak menerima pesanan baru saat ini. Silakan coba beberapa saat lagi."). Logged in AuditLog when toggled. |
| `orderingPausedMessage` | `null` | Optional custom message shown to customers when ordering is paused or `maxActiveOrders` is reached. Falls back to default message if null. |

---

## Kitchen Load Control

> **Prevents kitchen overwhelm.** Without this, a 20-order backlog grows to 40 while the QR system keeps accepting. Dinner service collapses, bad reviews happen, and the owner blames the software.

Two complementary mechanisms exist — merchants can use one or both:

### 1. Auto-cap via `maxActiveOrders`

When `MerchantSettings.maxActiveOrders` is set, the order creation API enforces the cap atomically to prevent race conditions under concurrent orders:

```
Customer taps "Place Order"
    │
    ▼
-- Atomic check using a Postgres advisory lock keyed on restaurantId,
-- or INSERT ... SELECT ... WHERE COUNT < cap pattern:
INSERT INTO "Order" (...)
SELECT ... WHERE (
  SELECT COUNT(*) FROM "Order"
  WHERE restaurantId = X AND status IN ('CONFIRMED', 'PREPARING')
) < $maxActiveOrders
-- affectedRows = 0 → cap reached → return HTTP 503
-- affectedRows = 1 → order created → proceed

    ├── Order created → proceed to payment (Midtrans or PENDING_CASH queue)
    │
    └── Cap reached → HTTP 503
            Customer sees: "Dapur sedang sibuk. Silakan coba dalam beberapa menit." (or custom message)
            No Order row created; no Midtrans charge initiated
```

**Why atomic:** A plain SELECT COUNT then INSERT has a TOCTOU race — under flash-sale concurrency, two workers can both read count=14 (cap=15) and both create order 15 and 16. The INSERT...WHERE...COUNT pattern prevents this at the DB level without an application-level lock.

The cap auto-lifts as orders move to `READY` or `COMPLETED` — no staff action required.

### 2. Manual pause via `orderingPaused`

Staff can instantly stop all new orders from the merchant-pos floor view:

```
[ Pause New Orders ]  ←→  [ Resume Orders ]
```

- Toggle stored in `MerchantSettings.orderingPaused` (DB-persisted, survives server restart)
- Takes effect immediately on all active customer sessions — the next "Place Order" attempt is rejected
- Logged in `AuditLog` (actor: staff, action: UPDATE, entity: MerchantSettings)
- Customer sees the `orderingPausedMessage` (custom or default)
- Existing orders in kitchen are **not affected** — they continue to `READY` / `COMPLETED` normally
- The merchant-pos header shows a prominent banner: 🔴 **Ordering is paused** while `orderingPaused = true`

### Estimated wait time (future Phase 2)

A future enhancement: derive and display an estimated wait time to the customer before they place an order, based on:
- Current `CONFIRMED + PREPARING` order count
- Rolling average `CONFIRMED → READY` duration for this restaurant (last 7 days)

Formula: `estimatedWait = (activeOrders × avgPrepTime) / kitchenCapacity`

Phase 2 addition — no schema change needed (all data is available at query time). Merchant can optionally surface this on the menu: "Estimasi waktu tunggu: ~25 menit."

---

## Menu Item — Full Field Specification

| Field | Type | Notes |
|---|---|---|
| `name` | string | Display name |
| `description` | string | Short description (shown in item detail) |
| `price` | int | IDR, no decimals |
| `imageUrl` | string | Supabase Storage path |
| `isAvailable` | bool | Soft toggle — hides from menu without deleting |
| `stockCount` | int? | If set, decrements when `Order → CONFIRMED` (not at PENDING creation). Deducting at PENDING would allow an attacker to deplete stock by opening many carts without paying. Decrement uses a DB-level atomic operation (`UPDATE ... WHERE stockCount > 0`) to prevent overselling under concurrent confirmations. **If the atomic decrement fails (stock already 0 at webhook time):** the order is pushed to the merchant-pos as `CONFIRMED` with a ⚠️ "Item sold out" flag on the affected `OrderItem`. A staff member is alerted to go to the table and offer a substitution. If the customer accepts → cashier updates the item in the order and the flag is cleared. If the customer refuses → cashier triggers a manual refund from merchant-pos. **Do NOT auto-refund immediately:** Midtrans e-wallet and QRIS refunds typically take 2–14 business days to reflect; auto-refunding a diner sitting at the table produces severe UX friction. The captured funds must remain with the merchant until a substitution decision is made. **Stock restoration on cancellation:** When an order is cancelled (`Order.status → CANCELLED`) and the order was previously `CONFIRMED` (stock was already decremented), stock is automatically restored via `UPDATE MenuItem SET stockCount = stockCount + qty WHERE id = $itemId`. This restoration is part of the same cancellation transaction. If the order never reached `CONFIRMED` (cancelled at `PENDING`), no stock was decremented so no restoration is needed. |
| `estimatedPrepTime` | int? | Minutes — shown to customer ("~15 min") |
| `isHalal` | bool | Shows Halal badge |
| `isVegetarian` | bool | Shows Vegetarian badge |
| `isVegan` | bool | Shows Vegan badge |
| `allergens` | string[] | e.g. `["nuts", "dairy", "gluten"]` — shown as warning badges |
| `spiceLevel` | int? | 0 = none, 1 = mild, 2 = medium, 3 = hot — shown as 🌶️ count |
| `sortOrder` | int | Display order within category |
| `autoResetAvailability` | bool | Default `false`. If `true`, a midnight cron job automatically sets `isAvailable = true` for this item at the start of each day. Useful for daily-stock items (e.g. "Today's Special" marked unavailable when sold out; auto-resets overnight). **Constraint: `autoResetAvailability` is ignored (treated as `false`) when `stockCount IS NOT NULL`.** If both are set, the API returns a validation error: "autoResetAvailability cannot be used with stockCount — stock depletion controls availability automatically." The midnight cron additionally skips any item where `stockCount IS NOT NULL`. |
| `priceType` | enum | `FIXED` (default) \| `BY_WEIGHT` — see Weight-Based Pricing below |
| `pricePerUnit` | int? | Required when `priceType = BY_WEIGHT`. IDR per unit (e.g. 50000 per 100g) |
| `unitLabel` | string? | Display unit for weight items (e.g. `"per 100g"`, `"per ekor"`, `"per kg"`) |
| `depositAmount` | int? | Upfront charge at checkout for `BY_WEIGHT` items (e.g. 50000 as a deposit). Final price is settled after weighing. |
| `deletedAt` | datetime? | Soft delete — preserved in order history |

## Weight-Based Pricing

> **Required for Chef Andi's segment (seafood) and common across Indonesian F&B:** ikan bakar, udang, kepiting, and other market-price items are sold by weight, not at a fixed price. The customer cannot know the final price until the item is caught and weighed.

### How it works

```
Customer orders "Kepiting Saus Padang" (priceType: BY_WEIGHT)
    │
    ▼
Checkout shows: Rp 50.000 deposit (depositAmount) — not the final price
Customer pays deposit via Midtrans (or in cash)
    │
    ▼
Order → CONFIRMED → pushed to kitchen with ⚖️ "Needs weighing" flag on OrderItem
    │
    ▼
Kitchen/cashier weighs the item (e.g. 1.2 kg)
Staff opens OrderItem in merchant-pos → enters actual weight
System calculates: finalPrice = pricePerUnit × weight = 50000/100g × 1200g = Rp 600.000
lineTotal updated: Rp 600.000 − Rp 50.000 deposit = Rp 550.000 remaining charge
    │
    ▼
[Charge Remaining Balance]
Customer pays remaining Rp 550.000 (QRIS or cash)
Second Payment row created linked to same Order
Invoice updated with final amounts
```

### Schema additions for weight-based items

| Model | Field | Type | Notes |
|---|---|---|---|
| `MenuItem` | `priceType` | enum | `FIXED` (default) \| `BY_WEIGHT` |
| `MenuItem` | `pricePerUnit` | int? | IDR per unit; required when `priceType = BY_WEIGHT` |
| `MenuItem` | `unitLabel` | string? | Display unit: `"per 100g"`, `"per ekor"`, `"per kg"`, `"per porsi"` |
| `MenuItem` | `depositAmount` | int? | Upfront charge at checkout; null = Rp 0 deposit (customer pays only after weighing) |
| `OrderItem` | `weightValue` | decimal? | Actual weight entered by staff after weighing |
| `OrderItem` | `weightUnit` | string? | Unit matching `MenuItem.unitLabel` |
| `OrderItem` | `needsWeighing` | bool | `true` when `priceType = BY_WEIGHT` and `weightValue` is not yet set — flags cashier |
| `OrderItem` | `finalLineTotal` | int? | Calculated after weighing: `pricePerUnit × weight`; null until weighed |

### Customer-facing display

- Checkout pre-invoice shows: `"Kepiting Saus Padang — Deposit Rp 50.000 (harga akhir ditentukan setelah ditimbang)"`
- Order tracking screen shows item with ⚖️ badge until weight is confirmed by staff
- After staff enters weight: order tracking updates to show final price; second payment prompt if remaining balance > 0

### Staff flow (merchant-pos)

```
Kitchen display shows ⚖️ "Needs weighing" badge on relevant OrderItems
    │
    ▼
Staff weighs item → opens OrderItem in merchant-pos → enters weight value
System auto-calculates finalLineTotal and remaining balance
    │
    ├── Remaining balance > 0 → [Charge Customer Rp XXX] button
    │     → second Payment row created (same Order, paymentType: BALANCE_CHARGE)
    │     → payment method: same as original order (QRIS generates a new Midtrans charge;
    │       CASH recorded manually by cashier)
    │     → CustomerSession state does NOT block this: the charge is initiated from
    │       merchant-pos directly, not from the customer's browser. If the session has
    │       expired, the cashier still completes the charge from merchant-pos; the customer
    │       pays at the table via EDC/QRIS displayed by staff. The second Payment row is
    │       linked to the Order ID, not the session.
    │     → Session TTL extended automatically when any OrderItem has needsWeighing = true
    │       (session stays ACTIVE until all pending weighings are resolved, overriding the
    │       standard tableSessionTimeoutMinutes for that session only)
    │
    └── Remaining balance = 0 (deposit covered or no deposit) → no action needed
```

### Constraints

- `BY_WEIGHT` items can have variants (e.g. "Crab — Steamed / Padang Sauce / Butter Garlic") but variant price deltas are applied to `depositAmount`, not `pricePerUnit`
- `BY_WEIGHT` items cannot use `stockCount` (incompatible — stock is managed by weight, not unit count)
- If a `BY_WEIGHT` order is cancelled before weighing, only `depositAmount` is charged; Midtrans refund processes the deposit if digital payment was used
- `Payment.paymentType` field (enum: `DEPOSIT` | `BALANCE_CHARGE` | `FULL`) distinguishes the two charges on the same order; add this to the Payment model in Phase 1 Prisma

---

## Menu Category — Full Field Specification

| Field | Type | Notes |
|---|---|---|
| `name` | string | Category name |
| `imageUrl` | string? | Optional category header image |
| `sortOrder` | int | Display order |
| `menuLayoutOverride` | enum? | `GRID` / `BUNDLE` / `LIST` / `SPOTLIGHT` — overrides restaurant default |
| `availableFrom` | time? | If set, category only shows after this time (e.g. `06:00`). Stored as plain `TIME` (HH:MM, no timezone). **Compared against current time in Asia/Jakarta (WIB).** Server: `toZonedTime(new Date(), 'Asia/Jakarta').getHours()` before comparing. |
| `availableTo` | time? | If set, category only shows before this time (e.g. `11:00`). Same WIB timezone rule. |
| `isActive` | bool | Toggle entire category without deleting |
| `kitchenStationId` | string? | Routes all items in this category to the specified kitchen station; null = default station |

**Time-based availability example:** A "Sarapan" category with `availableFrom: 06:00`, `availableTo: 11:00` is only shown to customers between 6am and 11am WIB. Outside that window, the category is hidden entirely from the menu. All time comparisons use `Asia/Jakarta` timezone regardless of server timezone (Vercel default is UTC). Use `date-fns-tz` or equivalent for WIB conversion.

## Menu Item Variants & Add-ons

Each `MenuItem` can have:
- **Variants** (mutually exclusive): e.g. Size → Small / Medium / Large, each with its own price delta
- **Add-ons** (optional, multi-select): e.g. Extra Cheese (+5,000), No Onion (0), Extra Spicy (+0)

Both are displayed in the `end-user-system` when the customer taps an item.
Selections are stored per `OrderItem` as a JSON snapshot (not foreign keys) to preserve historical accuracy.

### MenuItemVariant Fields

| Field | Type | Notes |
|---|---|---|
| `id` | string | UUID |
| `menuItemId` | string | FK → MenuItem |
| `name` | string | Display name (e.g. "Large", "Pedas", "Tanpa Santan") |
| `priceDelta` | int | IDR delta added to base price; negative allowed (e.g. "Small" = −5000) |
| `sortOrder` | int | Display order |
| `isDefault` | bool | Pre-selected option in the item detail modal |
| `deletedAt` | datetime? | Soft delete |

### MenuItemAddon Fields

| Field | Type | Notes |
|---|---|---|
| `id` | string | UUID |
| `menuItemId` | string | FK → MenuItem |
| `name` | string | Display name (e.g. "Extra Cheese", "No Onion", "Extra Spicy") |
| `priceDelta` | int | IDR; 0 = free modifier; negative allowed |
| `isDefault` | bool | Pre-checked in the add-on selector |
| `maxQuantity` | int? | Max units of this add-on per item (null = 1) |
| `sortOrder` | int | Display order |
| `deletedAt` | datetime? | Soft delete |

---

## Promotion — Full Field Specification

> **Step 11 dependency.** This model must be defined before Step 11 is built. The schema below is the canonical source of truth.

| Field | Type | Notes |
|---|---|---|
| `id` | string | UUID |
| `restaurantId` | string | FK → Restaurant |
| `name` | string | Display name shown to customer and in merchant-pos |
| `type` | enum | `PERCENTAGE` \| `FIXED_AMOUNT` \| `BOGO` \| `FREE_ITEM` |
| `discountValue` | int | Percentage (e.g. 20 = 20%) for PERCENTAGE; IDR amount for FIXED_AMOUNT; unused for BOGO/FREE_ITEM |
| `maximumDiscountAmount` | int? | Cap on PERCENTAGE discounts (e.g. max Rp 50,000 off regardless of cart size); null = no cap |
| `minimumOrderValue` | int? | Minimum subtotal (IDR) required to activate the promotion; null = no minimum |
| `applicableTo` | enum | `ALL_ITEMS` \| `SPECIFIC_CATEGORIES` \| `SPECIFIC_ITEMS` |
| `applicableItemIds` | string[] | IDs of `MenuItem` or `MenuCategory` records (based on `applicableTo`); empty array when `ALL_ITEMS` |
| `code` | string? | Customer-entered promo code (e.g. "PROMO10"); null = auto-applied to all eligible orders |
| `usageLimit` | int? | Total platform-wide uses before promotion deactivates; null = unlimited |
| `usageCount` | int | Running count of redemptions (incremented transactionally at Order CONFIRMED) |
| `perCustomerLimit` | int? | Max redemptions per registered customer account; null = unlimited; not enforced for anonymous sessions |
| `validFrom` | datetime? | Promotion start time; null = active immediately |
| `validTo` | datetime? | Promotion end time; null = no expiry |
| `isActive` | bool | Manual toggle; false overrides all other validity conditions |
| `deletedAt` | datetime? | Soft delete — preserved in order history |

**BOGO logic:** Buy One Get One — when customer adds ≥ 2 of an eligible item, the second (lower- or equal-priced) is free. Works at `OrderItem` level; the free item has `lineTotal = 0` and its `OrderItem` row carries a reference to the applied `promotionId`.

**FREE_ITEM logic:** A specific free item (set in `applicableItemIds`) is added to the cart automatically when `minimumOrderValue` is met. The free `OrderItem` has `unitPrice = 0` and carries `promotionId`.

**Stacking rule:** Only one promotion applies per order by default. If a merchant wants to allow stacking, configure `MerchantSettings.allowPromotionStacking: bool` (default false). When false, the highest-value eligible promotion wins.

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
- **DIRTY state is opt-in:** Merchants configure `MerchantSettings.enableDirtyState` (default: `false`). When disabled, `OCCUPIED → AVAILABLE` directly — the `DIRTY` status is **never entered** and the QR validation layer never checks for it. When enabled, `OCCUPIED → DIRTY` — staff must explicitly mark clean. Casual warungs do not need this; fine dining restaurants do.
- **QR validation for DIRTY:** The QR endpoint only rejects a scan with "This table is being prepared" if `enableDirtyState = true AND table.status = DIRTY`. When `enableDirtyState = false`, the DIRTY status is unreachable and no scan rejection occurs for that reason.

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
- `pointsCalculationBasis` on `MerchantLoyaltyProgram`: `SUBTOTAL` (points based on pre-discount item total — default, rewards gross spending) or `TOTAL` (points based on final paid amount — excludes discount value). Default `SUBTOTAL` prevents customers gaming the system by stacking promotions to maximize points while paying little.
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

## UI & Design Standards

> **UI is the product.** FBQR competes by being more beautiful, more intuitive, and more trustworthy than every other QR system a merchant has tried. A merchant decides to stay or churn within the first 10 minutes of using the merchant-pos. A customer decides whether to use the menu or ask a waiter within 3 seconds of it loading.

### Design Philosophy

| App | Target feeling | Reference products |
|---|---|---|
| `apps/menu` (customer) | Premium restaurant's own digital experience — the customer should feel they are at the restaurant, not using a SaaS tool | Kopi Kenangan app, Nobu digital menu, Grab Food item detail screens |
| `apps/web` merchant-pos | Clean, fast, zero clutter — works under pressure at dinner rush | Linear, Notion, Vercel dashboard |
| `apps/web` merchant-kitchen | High contrast, glanceable at 3 metres, touch-friendly | Airport departure boards, Grafana dashboards in dark mode |
| `apps/web` FBQRSYS | Professional B2B admin — trustworthy and data-dense | Stripe dashboard, Vercel admin |

### Design Tokens (shared via `packages/config/tokens`)

Define these once; import in Tailwind config for both apps.

```ts
// Color palette
primary:   '#E8622A'   // warm coral-orange — energy, appetite, Indonesian warmth
                        // change per restaurant via CSS variables in apps/menu only
surface:   '#FAFAF9'   // off-white — cleaner than pure white
neutral:   '#1C1917'   // stone-950 — body text
muted:     '#78716C'   // stone-500 — secondary text
border:    '#E7E5E4'   // stone-200 — dividers

// Status colors (consistent across all apps)
success:   '#16A34A'   // green-600
warning:   '#D97706'   // amber-600
danger:    '#DC2626'   // red-600
info:      '#2563EB'   // blue-600

// Spacing scale: Tailwind default (4px base unit)
// Border radius: --radius: 0.625rem (matches shadcn default)
// Font: Geist Sans (Next.js default, clean and modern)
// Font (apps/menu): overridden per restaurant via RestaurantBranding.fontFamily
```

> **`apps/menu` branding override:** Every color above can be overridden per restaurant via CSS custom properties injected at session load time (`--color-primary`, `--color-surface`, etc.). The default palette above applies to FBQR's own restaurant demo and to merchants who have not customised branding.

### Typography Scale

```
Display:  font-size 36px / line-height 40px / font-weight 700  — hero headings (apps/menu)
H1:       30px / 36px / 700   — page titles
H2:       24px / 32px / 600   — section headings
H3:       20px / 28px / 600   — card headings
Body:     16px / 24px / 400   — default body text
Small:    14px / 20px / 400   — secondary labels, metadata
Micro:    12px / 16px / 400   — badges, timestamps, table captions
Mono:     14px / 20px / 400   — invoice numbers, order IDs, code
```

### Component Rules

**Loading states — always use skeletons, never spinners:**
```
❌ <Spinner />              — user sees a vague "something is happening"
✅ <Skeleton className="h-4 w-[200px]" />  — user sees the shape of the content about to arrive
```
Exception: full-page initial load may use a branded splash screen (apps/menu only).

**Empty states — never show a blank div:**
Every list, table, and grid must have an empty state that:
1. Explains why it is empty (not just "No data")
2. Provides the next action the user should take
3. Uses a relevant illustration or icon (not stock clipart)

```
Example — empty menu categories:
  [🍽️ illustration]
  "Belum ada kategori menu"
  "Tambahkan kategori pertama Anda untuk mulai menerima pesanan."
  [ + Tambah Kategori ]
```

**Error states — friendly language + recovery action:**
```
❌ "Error 500: Internal Server Error"
✅ "Terjadi kesalahan. Coba lagi, atau hubungi support jika masalah berlanjut."
   [ Coba Lagi ]  [ Hubungi Support ]
```

**Toast notifications — use Sonner (ships with shadcn/ui):**
```ts
// Success
toast.success('Menu berhasil disimpan')
// Error
toast.error('Gagal menyimpan. Periksa koneksi internet Anda.')
// Info
toast.info('3 pesanan baru masuk')
// Warning (use sparingly)
toast.warning('Stok Nasi Goreng tersisa 2 porsi')
```

**Confirmation dialogs — only for destructive or irreversible actions:**
```
✅ Deleting a menu item, cancelling an order, revoking staff access
❌ Saving a form, changing a toggle — these should save immediately with a toast
```

### Motion & Animation (Framer Motion)

```ts
// Page transitions — subtle fade + slight upward slide
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 }
}
transition: { duration: 0.15, ease: 'easeOut' }

// List item stagger (kitchen display, menu items)
transition: { staggerChildren: 0.04 }

// Order status badge pulse (PREPARING state)
animate: { scale: [1, 1.05, 1] }
transition: { repeat: Infinity, duration: 2 }

// Drawer / Sheet slide-in — use shadcn Sheet (Framer Motion built-in)
```

**Rule:** Animation must never slow down a task. If an animation makes staff wait, remove it. Motion is for orientation (where did that card go?) and delight (the order just arrived!) — not decoration.

### Accessibility Baseline

- **WCAG 2.1 AA** minimum for all interactive elements
- All interactive elements reachable by keyboard (`Tab`, `Enter`, `Space`, `Esc`)
- All images have `alt` text (menu item images: use item name as alt)
- Colour contrast ratio ≥ 4.5:1 for body text, ≥ 3:1 for large text
- Focus ring always visible (Tailwind `focus-visible:ring-2`)
- Screen reader labels on icon-only buttons (`aria-label`)
- `apps/menu`: touch targets ≥ 44×44px (thumb-friendly on mobile)
- `apps/web` merchant-pos: designed for both tablet (1024px) and desktop (1280px+)
- `merchant-kitchen`: designed primarily for 1080p TV/monitor in landscape, dark mode

### Responsive Breakpoints

```
apps/menu:        Mobile-first. Primary target: 375–430px (iPhone SE → iPhone 15 Pro Max)
                  Tablet (768px+): optional enhancement; most customers use phone
apps/web:         Tablet (1024px) as minimum — kitchen staff use iPads
                  Desktop (1280px+): primary for merchant owner dashboard
merchant-kitchen: 1080p landscape (1920×1080) — TV/monitor in kitchen
FBQRSYS:          Desktop only (1280px+) — platform admin always at a workstation
```

### `apps/menu` — Specific UI Requirements

The customer menu app is the **revenue-generating surface** and the shop window for every restaurant on the platform. It must be held to a higher visual standard than the admin apps.

- **First render < 1.5 seconds** on Indonesian 4G (Lighthouse score > 85)
- **No layout shift** (CLS < 0.1) — menu items must not jump as images load
- **Optimistic UI** — add to cart is instant (no server round-trip before updating cart count)
- **Swipe gestures** — Spotlight layout items swipeable left/right (Framer Motion drag)
- **Haptic feedback** — `navigator.vibrate(10)` on "Add to Cart" confirmation (Android)
- **Bottom sheet for item detail** on mobile (slides up from bottom, not a modal) — matches native app patterns customers already know
- **Sticky bottom cart bar** — always visible, shows item count + total, animates on change
- **Cart additions** — item count badge on cart button springs (scale 1 → 1.3 → 1) when item added
- **Color theming** — CSS custom properties applied within 50ms of session load (no flash of unstyled menu)

### Code Quality for UI

- No inline styles — Tailwind only (exception: dynamic CSS custom properties for branding)
- No magic numbers — use Tailwind spacing/color tokens
- Components in `packages/ui` must be truly generic (no business logic)
- Business-aware components live in each app's `components/` directory
- Every new page component needs a `loading.tsx` (Next.js built-in skeleton)
- Every new page component needs an `error.tsx` (Next.js built-in error boundary)

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
    │       API checks maxActiveOrders at confirm time (not at order creation time):
    │         SELECT COUNT(*) FROM Order WHERE restaurantId = X AND status IN ('CONFIRMED','PREPARING')
    │         If count ≥ maxActiveOrders → reject confirmation:
    │           "Dapur sudah penuh (X aktif). Konfirmasi setelah ada pesanan selesai."
    │         If count < maxActiveOrders → proceed:
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

**Webhook branch routing:** GrabFood and GoFood webhook payloads include a `store_id` / `merchant_id` that identifies which physical store received the order. Multi-branch chains often have one centralized API credential with the delivery platform routing to different stores dynamically. FBQR routes the incoming webhook to the correct `Branch` by looking up `Branch.platformStoreId` that matches the payload's store identifier. This replaces any rigid single-branch mapping and requires no manual re-configuration as long as each branch's `platformStoreId` is set correctly.

**Delivery webhook idempotency:** GrabFood, GoFood, and ShopeeFood all retry failed webhooks. To prevent duplicate orders: `Order.platformOrderId` has a **unique constraint scoped to `platformName`** — i.e. the combination of (`platformName`, `platformOrderId`) is unique. When a delivery webhook arrives, the handler attempts an INSERT with the platform order ID; if the unique constraint is violated, the webhook is a duplicate and HTTP 200 is returned immediately without creating a new order. Each platform's webhook must also have its signature or bearer token verified before processing (HMAC-SHA256 for GrabFood, OAuth 2.0 bearer token for GoFood — implement per-platform at Step 22).

> **Phase 1:** Manual integration — delivery orders entered by staff on merchant-pos. **Phase 2:** Automated webhook integration per platform using `Branch.platformStoreId` for dynamic routing.

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
| `Branch` | `platformStoreId` | string? — delivery platform store identifier (e.g. GrabFood `merchant_id`, GoFood `store_id`). Used to route incoming delivery webhooks to the correct branch dynamically. Set per-branch when configuring delivery platform integration. Null for branches with no delivery integration. |

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
- **Browser push notification:** Web Push API — merchant-pos asks for notification permission on first login; sends push even when tab is not in focus.
  > **iOS limitation:** Web Push requires the PWA to be installed to the Home Screen on iOS (Safari 16.4+). Standard Safari browser tabs on iOS do NOT support Web Push — the notification permission API is unavailable. On first login, detect iOS Safari (`/iPad|iPhone|iPod/.test(navigator.userAgent)`) and show a banner: "Install this app to your Home Screen to receive order notifications." This is a platform constraint, not an FBQR limitation. Android Chrome supports Web Push natively with no installation required.
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
- **Duplicate webhook handling:** The `unique(midtransTransactionId)` DB constraint prevents duplicate Payment rows. The `UPDATE WHERE status='PENDING'` atomic check prevents duplicate confirmations. On duplicate delivery, the webhook handler detects `affectedRows = 0` and returns HTTP 200 without error — Midtrans retries must not cause crashes or 4xx/5xx responses.
- A daily **reconciliation job** (Vercel Cron) compares `PENDING` orders older than 30 minutes against Midtrans transaction status API and resolves any discrepancies. This catches webhooks that were missed or delivered out of order.

### Order expiry cron job

A separate scheduled job (Vercel Cron, runs every minute) handles PENDING order expiry:

```
Every 1 minute:
  -- Atomic batch update — prevents overlapping cron invocations from double-expiring
  -- Filter by Payment.method to exclude cash orders (paymentMode lives on MerchantSettings,
  -- not on the Order row; the Payment row is the correct place to check cash vs digital)
  -- Join MerchantSettings to get per-merchant paymentTimeoutMinutes (not a global constant)
  UPDATE "Order" o
    SET status = 'EXPIRED'
    FROM "Restaurant" r
    JOIN "MerchantSettings" ms ON ms."restaurantId" = r.id
    WHERE o."restaurantId" = r.id
      AND o.status = 'PENDING'
      AND o.createdAt < NOW() - (INTERVAL '1 minute' * ms."paymentTimeoutMinutes")
      AND NOT EXISTS (
        SELECT 1 FROM "Payment" p
        WHERE p.orderId = o.id AND p.method = 'CASH'
      )
    RETURNING o.id

  -- Wrap the following in a single DB transaction to prevent inconsistent state
  -- if the Vercel function times out mid-loop
  BEGIN TRANSACTION
    FOR EACH returned id:
      UPDATE "Payment" SET status = 'EXPIRED' WHERE orderId = id
      Log OrderEvent(fromStatus: PENDING, toStatus: EXPIRED, actorType: SYSTEM)
      -- Note: stockCount is deducted at CONFIRMED, not PENDING, so no stock release is needed here
  COMMIT
```

> **Why filter via Payment.method:** `paymentMode` is a `MerchantSettings` configuration field — it is not a column on the `Order` table. The `Payment` row created at the same time as the `Order` row has `method = 'CASH'` for cash orders, which is the correct predicate to exclude them. Using `NOT EXISTS (SELECT 1 FROM Payment WHERE orderId = id AND method = 'CASH')` is the accurate, schema-correct filter.
>
> **Why join MerchantSettings:** `paymentTimeoutMinutes` is a per-merchant setting, not a global constant. Different merchants can have different timeout windows (e.g. a fine dining restaurant may set 30 minutes, a fast-food chain may set 10 minutes). The cron must use each order's merchant's configured timeout, not a single platform-wide value. The join `Order → Restaurant → MerchantSettings` resolves this correctly.
>
> **Why PENDING_CASH is excluded:** Cash orders waiting for cashier confirmation do not have a Midtrans timeout. Their lifecycle is: either the cashier confirms (same shift) or rejects (explicit action). The `paymentTimeoutMinutes` setting applies only to digital (Midtrans) payments. Cash orders that are abandoned should be cleared via cashier rejection or the end-of-day cron (see EOD Cleanup section) — not by the digital expiry cron.
>
> **Why wrap in a transaction:** The `UPDATE...RETURNING` step is atomic for the `Order` table, but the subsequent `Payment` update in the loop is a separate statement. If the Vercel function times out between the two, `Order.status = EXPIRED` but `Payment.status = PENDING` — a dangling inconsistency that breaks the daily Midtrans reconciliation job. Wrapping both updates in a transaction guarantees both succeed or both roll back.

This is distinct from the reconciliation job. Expiry is local; reconciliation cross-checks with Midtrans.

### End-of-Day PENDING_CASH Cleanup

PENDING_CASH orders excluded from the digital expiry cron must be cleaned up separately. Two mechanisms are used together:

**Primary: "Close Register" button in merchant-pos**

```
Cashier / supervisor taps [Close Register] (end of shift / close of business)
    │
    ▼
System shows: "X PENDING cash order(s) still open. Review before closing."
    │
    ├── Cashier reviews each → [Confirm] or [Cancel] each one
    │
    └── After all are resolved → register is marked closed
        → Any remaining PENDING_CASH orders auto-cancelled (should be zero after review)
```

**Secondary: Safety-net cron at 03:00 WIB**

```
Every night at 03:00 Asia/Jakarta:
  -- Batch-cancel any PENDING_CASH orders older than 12 hours
  -- (i.e. placed before 15:00 the previous day — safely past any business shift)
  UPDATE "Order" o
    SET status = 'CANCELLED'
    WHERE o.status = 'PENDING'
      AND EXISTS (
        SELECT 1 FROM "Payment" p WHERE p.orderId = o.id AND p.method = 'CASH'
      )
      AND o.createdAt < NOW() - INTERVAL '12 hours'
    RETURNING o.id

  BEGIN TRANSACTION
    FOR EACH returned id:
      UPDATE "Payment" SET status = 'EXPIRED' WHERE orderId = id
      -- EXPIRED not FAILED: cash orders were never confirmed and timed out (like digital EXPIRED)
      -- FAILED is reserved for gateway rejections (declined card, insufficient balance, etc.)
      Log OrderEvent(fromStatus: PENDING, toStatus: CANCELLED,
                     actorType: SYSTEM, cancellationReason: SYSTEM_EXPIRED)
  COMMIT
```

The "Close Register" button provides operational accountability (cashiers must actively clear their queue). The 03:00 cron is a fallback for merchants who forget to close the register. Both mechanisms together ensure no abandoned cash orders ever persist past the next business day.

> **MerchantSettings note:** Add `eodCashCleanupHour` (int, default: `3`) — the hour (0–23, WIB) at which the safety-net cron runs. Configurable so late-night venues (e.g. bars open until 02:00) can set a later time (e.g. 05:00).

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
| **Open waiter requests** | Unresolved `WaiterRequest` count — grouped by type (🔔 Call / 🤝 Assistance / 💳 Bill) |
| **Today's revenue so far** | Running IDR total for today (gross) |
| **Today's order count** | Running count for today |
| **Avg wait time today** | Average time from `CONFIRMED` to `READY` |
| **Ordering status** | 🟢 Accepting orders / 🔴 Paused — prominent toggle; shows active order count vs `maxActiveOrders` cap if set |

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
| **Gross revenue** | Sum of all `Order.grandTotal` for confirmed orders in period |
| **Estimated payment gateway fees** | Calculated display (not stored): QRIS orders × 0.7%, EWALLET orders × 2%, VA orders × Rp 4.000 flat, CARD orders × 2.9%. Shown as an estimate — actual fees confirmed in Midtrans dashboard |
| **Net revenue (est.)** | Gross revenue − estimated gateway fees − tax collected. This is the merchant's approximate pocket revenue. |
| **Cash vs digital split** | IDR and % — useful for reconciliation: cash must match physical till |

> **Fee transparency rationale:** Indonesian restaurant owners ask "berapa yang saya terima?" (how much do I actually receive?) immediately. Without a net revenue figure, they do not trust the system and manually calculate fees in Excel. Showing the breakdown builds trust and reduces churn. The fees are estimates — exact amounts are always confirmed via the Midtrans merchant dashboard, and we must label them clearly as estimates in the UI.

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
| **Split bill / multiple payments per order** | 📋 Nice-to-have | Seafood, chain | Phase 1: one payment per order. Phase 2: multiple payments (split bill). Schema must not preclude this — `Payment[]` on `Order` already supports it. |
| **Offline mode (merchant-pos / kitchen)** | ⚠️ High friction | Warung | PWA service worker caches last known state; orders queued locally; sync on reconnect. Kitchen display shows stale data warning when disconnected. |
| **Indonesian tax compliance (NPWP / Faktur Pajak)** | 📋 Nice-to-have | Enterprise, B2B | Add `taxId` (NPWP) field to `Merchant` and optional `Customer` for corporate dinners requiring formal tax invoices (Faktur Pajak). Phase 2. |
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
| **Hidang / hybrid ordering mode** | ⚠️ High friction | Padang restaurants | Padang-style "Hidang" means waiter brings 15–20 pre-plated dishes to the table; customer only pays for what they ate. Current QR flow requires pre-ordering. Solution: a "Hidang Mode" toggle in `MerchantSettings` where the customer scans to start a session but does not order — the waiter uses merchant-pos to add consumed items post-meal. Uses `PAY_AT_CASHIER` flow; waiter acts as order-taker after the meal. Schema supports this today; the UI flow needs design in Phase 2. |
| **Thermal label printing for cup/item labels** | ⚠️ High friction | Boba, kiosk | High-volume counter service needs a sticker label printed on each cup at the moment the order is CONFIRMED — staff cannot look at an iPad for every drink. ESC/POS label printer support (Bluetooth or USB) for Ibu Sari's boba kiosk use case. Distinct from kitchen ticket printing (which is a larger A6/thermal receipt). Phase 2. |
| **Booking deposit / down payment** | ⚠️ High friction | Private dining, catering | Tante Lina (home dining) needs a 50% DP before cooking. Requires: `Order.depositRate` (%, e.g. 50%), partial Midtrans charge at booking, remaining charge triggered by staff. Closely related to table reservation and pre-order flow. Full design deferred to Phase 2 when reservation system is built. |
| **Per-branch item availability override** | ⚠️ High friction | Chain (Kevin) | Menu is shared across all branches (by design), but Branch A may run out of a specific item while Branch B still has it. Solution: a `BranchMenuOverride` junction model (`branchId`, `menuItemId`, `isAvailable`) that overrides per-branch without duplicating the menu. This is the correct pattern — NOT separate menus per branch (see ADR-019). Phase 2. |
| **Waiter-assisted / staff order mode** | ⚠️ High friction | All | Older customers, families, and tourists often say "Mas, saya pesan lewat kamu aja." Staff need to input orders on behalf of customers from merchant-pos. Flow: staff opens table → selects items → submits → goes straight to `CONFIRMED` (no payment step for dine-in; cashier handles payment at table close). Uses existing PAY_AT_CASHIER flow. Phase 2 UI; schema supports it today. |
| **Inventory / COGS tracking** | 📋 Nice-to-have | Chain (Kevin) | Kevin wants to reconcile sales vs. raw ingredient purchases to detect shrinkage. This is an ERP-level feature (stock in / stock out per ingredient, linked to recipes). Out of FBQR's core scope — recommend integration with Accurate Online or Jurnal.id rather than building in-house. Track as Phase 3 consideration only. |

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

### Schema (stub in Phase 1 Prisma — no UI until Phase 2)

```
MerchantApiKey
  id            string UUID PK
  merchantId    string FK → Merchant
  name          string          — human label ("Accurate Online integration")
  keyHash       string          — bcrypt hash; full key shown once at creation only
  keyPrefix     string          — first 8 chars for display ("fbqr_liv…")
  permissions   string[]        — subset of merchant permission keys
  lastUsedAt    datetime?
  expiresAt     datetime?       — null = never expires
  revokedAt     datetime?       — null = active
  createdAt     datetime

WebhookEndpoint
  id              string UUID PK
  merchantId      string FK → Merchant
  url             string          — HTTPS only (validated at creation)
  events          string[]        — subscribed event type keys
  secret          string          — random 32-byte hex; shown once at creation
  isActive        bool            — false after 5 consecutive failures
  failureCount    int             — resets to 0 on success
  lastTriggeredAt datetime?
  createdAt       datetime

WebhookDeliveryLog
  id             string UUID PK
  endpointId     string FK → WebhookEndpoint
  event          string
  requestBody    JSON
  responseCode   int?
  responseBody   string?
  attemptNumber  int
  deliveredAt    datetime
```

**Additional indexes:**
```
MerchantApiKey:      (merchantId, revokedAt)       — list active keys
MerchantApiKey:      (keyPrefix)                   — fast auth lookup
WebhookEndpoint:     (merchantId, isActive)        — list active endpoints
WebhookDeliveryLog:  (endpointId, deliveredAt DESC) — delivery log pagination
```

**API documentation:** Auto-generated OpenAPI spec from Zod schemas via `zod-to-openapi`; served at `api.fbqr.app/docs` (Swagger UI). Phase 2.

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

## Self-Service Merchant Registration

> **Both admin-created and self-service signup paths must be supported.** The self-service path is the scalable acquisition model; admin-created is for enterprise/negotiated accounts.

### Registration Flow

```
Visitor hits /register
    │
    ▼
Form: Business name, email, password (min 8 chars), agree to Terms
    │
    ▼
POST /api/auth/register
  → validate inputs
  → check email uniqueness (HTTP 409 if duplicate)
  → create records in one DB transaction:
      Merchant { email, hashedPassword, status: TRIAL,
                 trialEndsAt: NOW() + 14 days, onboardingStep: 0 }
      Restaurant { name: businessName, merchantId }
      Branch { name: "Pusat", restaurantId }  ← default first branch
  → send email verification link (Resend) with signed token (24h expiry)
  → return HTTP 201 with { message: "Verification email sent" }
    │
    ▼
Merchant clicks verification link
  → POST /api/auth/verify-email?token=...
  → set Merchant.emailVerifiedAt = NOW()
  → redirect to /login
    │
    ▼
First login → redirect to onboarding wizard (Step 1)
```

**Bot protection:** Phase 1 — none (low abuse surface for B2B SaaS in Indonesia). Phase 2 — add Cloudflare Turnstile or hCaptcha on the register form if bot signups become an issue.

**Schema addition:** Add `emailVerifiedAt: DateTime?` to `Merchant` model. Unverified merchants can access the wizard but not place real orders until email is verified (QR menu endpoint checks `Merchant.emailVerifiedAt IS NOT NULL`).

**Admin-created path:** FBQRSYS admin fills a simpler form (email, restaurant name, plan). System creates the same records, skips email verification (admin vouches), and emails the merchant a "set your password" link (password reset flow with a first-time flag).

---

## Customer Account & Registration

> **Customer login is optional.** Anonymous QR sessions work for all ordering features. Login unlocks loyalty point earning and order history.

### When Login is Prompted

1. **At checkout** — after customer reviews cart, before payment: "Log in to earn loyalty points on this order"
2. **Post-order** — after order confirmed: "Create an account to track your order history and earn points"
3. **Never blocking** — customer can always dismiss and continue anonymously

### Registration/Login Options

- **Email + password** — standard form; email verification required before loyalty points credited
- **Google OAuth** — fastest path (Phase 2, optional depending on Google approval timeline)

### Session-to-Customer Linking

When a customer logs in or registers **during an active CustomerSession**:
- `CustomerSession.customerId` is set to the newly authenticated `Customer.id`
- All `Order` records linked to that session that are `CONFIRMED` or later have loyalty points credited retroactively (if merchant loyalty is enabled)
- Loyalty points are credited by the Order, not the session — idempotency guard prevents double-crediting if the link happens after points were already issued

### Schema Additions

| Model | Field | Notes |
|---|---|---|
| `Customer` | `emailVerifiedAt` | datetime? — points only credited after verification |
| `Customer` | `googleId` | string? — Phase 2 Google OAuth |
| `CustomerSession` | `customerId` | string? FK → Customer — set when customer authenticates during session |

### Token Storage (apps/menu)

Customer auth tokens for `apps/menu` are stored as `httpOnly` cookies (not localStorage) to prevent XSS access. The cookie is scoped to `menu.fbqr.app` and distinct from the `fbqr_session_id` session cookie. Both coexist without conflict.

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

**Decision:** On QR scan, a session cookie (`fbqr_session_id`) is set on the customer's browser. On subsequent page loads (including refresh), the server checks for this cookie before creating a new session. If a valid ACTIVE session exists **for that cookie AND that specific table**, it is resumed without requiring a re-scan.

**Critical implementation rule — the session resume query must be:**
```sql
SELECT * FROM CustomerSession
WHERE id = $cookieValue
  AND tableId = $scannedTableId   -- ← REQUIRED: prevents cross-table session leakage
  AND status = 'ACTIVE'
```
If the cookie matches a session on a **different** table (e.g. customer moves from Table 5 to Table 8), the server treats the request as a new session for Table 8. It does NOT resume the Table 5 session. This guard is mandatory — without it, a customer's order would be routed to the wrong table.

**Rationale:** Without this, a customer who refreshes the page loses their order tracking. This is a critical UX failure. The cookie approach is the simplest implementation — no login required, no QR re-scan, no user action needed.

**Security:** The cookie contains only the `CustomerSession.id` (a UUID). It has no elevated permissions. Even if stolen, it only allows viewing the menu and order status for one table — no payment information is accessible.

**Post-expiry read access:** When a `CustomerSession` moves to `EXPIRED`, the API continues to honour the `fbqr_session_id` cookie for read-only access to the session's `Order` rows. The customer can view their order status and download their invoice without re-scanning. Write operations (place new order, call waiter) are rejected with "Your session has ended." This is the correct design: session expiry ends ordering, not visibility.

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

When `pricesIncludeTax = false` (default):
- `serviceCharge = round(subtotal * serviceChargeRate)`
- `taxBase = taxOnServiceCharge ? (subtotal + serviceCharge) : subtotal`
- `tax = round(taxBase * taxRate)`
- `total = subtotal + serviceCharge + tax`

Indonesian PPN regulation typically applies to both the item price and any service charge. The `taxOnServiceCharge` flag (default: `true`) ensures compliance while allowing merchants to override if their contract specifies otherwise.

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

**Redirect handler specification:** The `/r/{tableToken}` endpoint performs these steps:
1. Lookup `Table` by `tableToken` — return human-friendly HTML error page (not a JSON 4xx) if:
   - Not found
   - `table.status = CLOSED` → "This table is currently unavailable. Please ask staff."
   - `table.status = RESERVED` → "This table is reserved. Please ask staff."
   - `table.status = DIRTY` AND `MerchantSettings.enableDirtyState = true` → "This table is being prepared. Please ask staff."
   - Restaurant `status ≠ ACTIVE` → "This restaurant is temporarily unavailable."
2. Get `restaurantId` and `tableId` via `Table → Branch → Restaurant`
3. Generate `expiryTimestamp = now + 24h` (Unix seconds)
4. Generate `sig = HMAC-SHA256(tableToken + ":" + expiryTimestamp, SERVER_SECRET)`
5. Redirect (HTTP 302) to: `https://menu.fbqr.app/{restaurantId}/{tableId}?token={tableToken}&sig={sig}&exp={expiryTimestamp}`

The menu app validates on load: `sig` must match `HMAC-SHA256(token + ":" + exp, SERVER_SECRET)` and `exp` must be in the future. Invalid or expired requests redirect back to `/r/{tableToken}` (the redirect handler), which issues a fresh signed URL — so legitimate customers are never permanently locked out.

**Status:** Decided.

---

### ADR-016: Configurable Payment Timing (Pay-First vs Pay-at-Cashier)

**Decision:** Payment timing is configurable per restaurant via `MerchantSettings.paymentMode`:
- `PAY_FIRST` (default): customer must pay via Midtrans before order reaches kitchen
- `PAY_AT_CASHIER`: customer orders → alert sent to merchant-pos cash queue → cashier collects cash and taps [Confirm & Send to Kitchen] → Order pushed to kitchen. **The kitchen never receives a PAY_AT_CASHIER order without explicit cashier confirmation.** The confirmation gate is the same in principle as the Midtrans webhook gate — the confirming party is the cashier rather than the payment processor, but the kitchen sees no order until confirmation occurs in both modes.

**Rationale:** Some Indonesian restaurants — particularly fine dining and family restaurants — prefer the traditional model where customers pay at the end. Forcing pay-first on them would be a deal-breaker. The QR ordering UX still works in pay-at-cashier mode, it just replaces the Midtrans payment step with a cashier confirmation step.

**Security implications for PAY_AT_CASHIER:** The fraud risk is the same as a traditional restaurant that takes verbal orders — a customer could walk out before paying. Merchants who enable this mode accept this risk. CASH payment method must be enabled for this mode to be useful.

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

**Fixed before v1.4 review:**

| Reviewer challenge | Status | Where addressed |
|---|---|---|
| merchant-kitchen suspension inconsistency across doc versions | ✅ Consolidated in v1.3 | Single canonical rule in Merchant Account Status section |
| QR token URL predictable (`/restaurantId/tableId`) | ✅ Fixed in v1.2 | ADR-015: `/r/{tableToken}` with HMAC-SHA256 signed `sig` |
| Realtime backpressure / broadcast storms | ✅ Fixed in v1.3 | Per-branch channel, minimal payload |
| Suspension during payment webhook | ✅ Fixed in v1.3 | Auto-refund rule; suspended restaurant always auto-refunds |
| OrderItem model missing | ✅ Fixed in v1.2 | Explicit price fields: unitPrice, variantPriceDelta, addonPriceTotal, lineTotal |
| PPN tax in invoice spec missing | ✅ Already in spec | ADR-013 + `## Pre-Invoice and Invoice` section |
| Kitchen multi-device order status conflict | ✅ Fixed in v1.3 | Last-write-wins + AuditLog for all transitions |
| Order modifications after submission | ✅ Resolved in ADR-014 | New items = new Order row; session supports multiple orders |
| DIRTY table state undefined | ✅ Fixed in v1.4 | Full transition table + opt-in via `enableDirtyState` |
| serviceChargePercent missing | ✅ Already in spec | `serviceChargeRate` in MerchantSettings (same field, different name) |
| Refund flow ownership | ✅ Resolved in v1.3 | Automated via Midtrans API on status CANCELLED; RBAC `orders:refund` |
| Subscription 30-min "soft-lock" window | ❌ Rejected — not implemented | Suspension must take immediate effect for financial integrity; a grace window for in-progress payments creates an attack surface where merchants game the suspension timing. The correct model (already in spec): payments confirmed before suspension go through; new payments after suspension are auto-refunded. |
| BranchCode "resets daily" misread | ✅ Already correct | The *counter* resets daily per branch; `branchCode` is a static identifier. Doc is unambiguous. |

**Fixed before v1.6 review:**

| Reviewer challenge | Status | Where addressed |
|---|---|---|
| PENDING→CANCELLED missing cashier reject path | ✅ Fixed in v1.6 | State machine table updated: cashier rejecting cash order is a valid trigger |
| REFUNDED Payment moves COMPLETED Order to CANCELLED | ✅ Fixed in v1.6 | Payment→Order mapping table split: pre-completion refund → CANCELLED; post-completion refund → Order stays COMPLETED, only Payment.status changes; credit note generated |
| stockCount deducted at PENDING (DoS vulnerability) | ✅ Fixed in v1.6 | stockCount field doc updated: deduction at CONFIRMED; if stock exhausted at webhook time, auto-refund issued |
| PENDING_CASH orders expired by digital expiry cron | ✅ Fixed in v1.6 | Expiry cron updated with `WHERE paymentMode != 'PAY_AT_CASHIER'` clause + rationale |
| Cron SELECT+loop race condition under overlapping invocations | ✅ Fixed in v1.6 | Cron pseudocode rewritten as atomic `UPDATE...RETURNING` — no separate SELECT loop |
| iOS Web Push requires PWA (not documented) | ✅ Fixed in v1.6 | Push notification section updated: iOS limitation explained, browser detection + install prompt documented |
| paymentTimeoutMinutes not synced to Midtrans snap_token expiry | ✅ Fixed in v1.6 | MerchantSettings table updated: `paymentTimeoutMinutes` now explicitly passed as `custom_expiry` in snap_token request |
| No autoResetAvailability for daily-stock items | ✅ Fixed in v1.6 | `autoResetAvailability` bool added to MenuItem spec with midnight cron behaviour |
| WaiterRequest has no resolvedAt; stale alerts after session close | ✅ Fixed in v1.6 | `resolvedAt` added to WaiterRequest model; auto-resolve rule on CustomerSession close/expiry documented |

**Fixed before v1.7 review:**

| Reviewer challenge | Status | Where addressed |
|---|---|---|
| Cron SQL uses `paymentMode` column that doesn't exist on Order table | ✅ Fixed in v1.7 | Cron updated to filter via `NOT EXISTS (SELECT 1 FROM Payment WHERE method = 'CASH')` — correct schema-aware predicate |
| AuditLog actorId/actorRole/actorName not nullable, breaks SYSTEM events | ✅ Fixed in v1.7 | All three fields marked `string?`; `actorType` enum (`STAFF\|ADMIN\|CUSTOMER\|SYSTEM`) added to AuditLog spec |
| Sold-out-at-webhook auto-refund causes 2–14 day refund delay for diner at table | ✅ Fixed in v1.7 | stockCount field doc updated: stock-out at webhook → order CONFIRMED with ⚠️ flag on OrderItem; cashier offers substitution; refund only if customer refuses |
| Cron FOR EACH loop inconsistency if function times out mid-loop | ✅ Fixed in v1.7 | Cron pseudocode wrapped in BEGIN/COMMIT transaction block; rationale documented |
| Delivery webhook routing relies on rigid manual single-branch mapping | ✅ Fixed in v1.7 | `Branch.platformStoreId` added; webhook routes dynamically by matching payload store ID to branch record |
| Menu images unoptimized (5MB+ photos, 100MB+ page load on Indonesian 4G) | ✅ Fixed in v1.7 | Key Conventions updated: `next/image` mandatory in apps/menu; server-side compression to max 800×800 WebP at upload; Supabase Image Transformation documented as alternative |
| Customer cannot access order tracking after CustomerSession EXPIRES | ✅ Fixed in v1.7 | Edge case table + ADR-011 updated: expired session cookie grants read-only access to Order rows; write ops rejected with "session ended" |
| No mechanism for EOD PENDING_CASH cleanup (known doc gap) | ✅ Fixed in v1.7 | "End-of-Day PENDING_CASH Cleanup" section added: primary = "Close Register" button with forced cashier review; fallback = 03:00 WIB safety-net cron; `eodCashCleanupHour` added to MerchantSettings |

**Fixed before v1.8 review:**

| Reviewer challenge | Status | Where addressed |
|---|---|---|
| Edge case "Session TTL expires" always says table → AVAILABLE (ignores enableDirtyState) | ✅ Fixed in v1.8 | Edge case row updated: table → DIRTY or AVAILABLE depending on `enableDirtyState` setting |
| `orders:refund` permission missing from RBAC list | ✅ Fixed in v1.8 | `orders:refund` added to merchant permissions table; Supervisor template updated to include it |
| Webhook handler transaction scope not specified (partial state risk) | ✅ Fixed in v1.8 | Full webhook handler transaction spec added to idempotency section; stock decrement confirmed in same transaction |
| `EXPIRED → CANCELLED` missing from valid state machine transitions | ✅ Fixed in v1.8 | `EXPIRED → CANCELLED` added (system only, late webhook refund); "invalid transitions" example updated to remove it |
| Cron `paymentTimeoutMinutes` treated as global constant (it's per-merchant) | ✅ Fixed in v1.8 | Cron SQL updated to join `Order → Restaurant → MerchantSettings` for per-merchant timeout value |
| EOD cleanup sets `Payment.status = 'FAILED'` (should be `EXPIRED`) | ✅ Fixed in v1.8 | EOD cleanup cron updated to `Payment.status = 'EXPIRED'`; rationale: FAILED reserved for gateway rejections |
| No stock availability check in late webhook revival flow | ✅ Fixed in v1.8 | Revival condition 4 added: check stock for all items; insufficient stock → revive with ⚠️ flag (substitution flow) rather than auto-refund |
| Service charge taxability unspecified (PPN applies to service charge in Indonesia) | ✅ Fixed in v1.8 | `taxOnServiceCharge: true` added to MerchantSettings; ADR-013 formula updated: `taxBase = taxOnServiceCharge ? (subtotal + serviceCharge) : subtotal` |
| Stock decrement not confirmed to be in same transaction as Order/Payment update | ✅ Fixed in v1.8 | Webhook transaction spec explicitly includes stock decrement as step 3 of the same DB transaction |
| No merchant-configurable rounding rule (IDR 1-coin obsolete; cash needs ROUND_100) | ✅ Fixed in v1.8 | `roundingRule: NONE\|ROUND_50\|ROUND_100` added to MerchantSettings |
| Delivery webhook retries can create duplicate orders (no idempotency spec) | ✅ Fixed in v1.8 | `platformOrderId` unique constraint (scoped to `platformName`) documented; per-platform auth method noted |
| Deactivated `KitchenStation.isActive` FK behavior on `MenuCategory` not specified | ✅ Fixed in v1.8 | Explicit note: routing engine treats deactivated station as null (fallback to default); FK preserved for re-activation |
| No rule for stock restoration when order is cancelled post-CONFIRMED | ✅ Fixed in v1.8 | Stock restoration rule added to `stockCount` field notes: restore when cancelling from CONFIRMED state within same cancellation transaction |
| Loyalty points calculation basis undefined (pre-discount vs post-discount) | ✅ Fixed in v1.8 | `pointsCalculationBasis: SUBTOTAL\|TOTAL` added to `MerchantLoyaltyProgram`; default SUBTOTAL with rationale |
| Currency field missing — multi-currency expansion would be a breaking migration | ✅ Fixed in v1.8 | `currency` field (default `"IDR"`) added to all money-bearing models as scaffolding; treated as infrastructure not live feature |
| QR redirect URL format not specified in ADR-015 | ✅ Fixed in v1.8 | ADR-015 expanded with full redirect handler 5-step spec; menu app validation described; fallback for expired sig documented |
| Kitchen priority gaps/duplicates from concurrent reorder (non-sequential after last-write-wins) | ❌ No change — intentional design | Kitchen priority is a **relative ordering signal**, not a sequential 1..N counter. Drag-and-drop UX operates on relative position, not absolute numbers. Re-sequencing after every write adds a transaction on a high-frequency mutation path for zero user benefit (staff see order on screen, not numbers). Last-write-wins with Realtime broadcast is the correct design for this low-contention operation. |
| WaiterRequest auto-resolve vs manual resolve idempotency concern | ❌ No change needed — already correct | Reviewer themselves confirmed "no action needed". The system must handle idempotent resolution gracefully (already implied by `resolvedAt` being a nullable timestamp — setting it when already set is a no-op). No schema change required. |
| Partial refund flow not documented | 📋 Deferred to Phase 2 | Schema already supports it: `Payment[]` on `Order` allows multiple payment rows; Midtrans API supports partial refund. Full flow deferred to Step 15 + Step 19 design sessions. |
| Per-item `OrderItem.status` not designed | 📋 Deferred to Phase 2 | Phase 1 design keeps order-level status for simplicity. Per-item status (PENDING/PREPARING/READY per item) is a Phase 2 enhancement. Adding `OrderItem.status` in Phase 2 is a non-breaking schema addition. |
| Delivery platform webhook auth specifics | 📋 Research at implementation time | GrabFood: HMAC-SHA256; GoFood: OAuth 2.0 bearer token; ShopeeFood: similar. Implement per-platform at Step 22 per each platform's current API documentation. Credentials stored per-branch in `Branch` settings. |

**Fixed before v1.9 review (operational gaps from owner personas):**

| Reviewer challenge | Status | Where addressed |
|---|---|---|
| No kitchen load control — kitchen overwhelm with no way to pause orders | ✅ Fixed in v1.9 | `maxActiveOrders` + `orderingPaused` + `orderingPausedMessage` added to MerchantSettings; Kitchen Load Control section added; live panel toggle documented |
| WaiterRequest has no type — "panggil bill" treated same as general help | ✅ Fixed in v1.9 | `WaiterRequest.type` enum added: `ASSISTANCE \| BILL \| CALL`; BILL type fetches session total for approaching waiter; customer UI updated with three distinct buttons |
| Weight-based pricing missing — seafood/ikan bakar sold by weight (50k/100g) | ✅ Fixed in v1.9 | `MenuItem.priceType`, `pricePerUnit`, `unitLabel`, `depositAmount` added; `OrderItem.needsWeighing`, `weightValue`, `weightUnit`, `finalLineTotal` added; Weight-Based Pricing section with full staff flow documented |
| Kitchen display format unspecified — "which table is this order?" not answered | ✅ Fixed in v1.9 | Kitchen Display Order Card Format section added: table name, queue number, order type badge, elapsed timer, station badges, ⚖️/⚠️/🔥 item badges; `Order.customerNote` field added |
| No customer special request / free-text note field | ✅ Fixed in v1.9 | `Order.customerNote` (string?, max 200 chars) added to Order model and kitchen display card spec |
| Revenue dashboard missing Midtrans fee breakdown — owners ask "berapa yang saya terima?" | ✅ Fixed in v1.9 | Gross revenue, estimated gateway fees, net revenue (est.), cash vs digital split added to merchant revenue analytics; fee estimation rationale documented |
| WaiterRequest type not grouped in live panel | ✅ Fixed in v1.9 | Live panel widget updated to show waiter requests grouped by type (🔔 Call / 🤝 Assistance / 💳 Bill) |
| Per-branch separate menus requested by chain owner | ❌ Rejected — ADR-019 | Per-branch menus violate the 1 Restaurant = 1 Menu invariant. Correct pattern: `BranchMenuOverride` junction for per-branch item availability. See ADR-019. |
| No Padang "Hidang" / hybrid post-pay ordering mode | 📋 Deferred to Phase 2 | Added to backlog; schema supports it via PAY_AT_CASHIER + staff order mode; UI design deferred |
| No thermal label printer for boba cup stickers | 📋 Deferred to Phase 2 | Added to backlog; distinct from kitchen ticket printing; ESC/POS label printer support |
| No booking deposit / down payment for private dining | 📋 Deferred to Phase 2 | Added to backlog; requires reservation system + partial Midtrans charge; full design at Phase 2 |
| Per-branch item availability override not designed | 📋 Deferred to Phase 2 | Added to backlog as `BranchMenuOverride` junction model; non-breaking schema addition; see ADR-019 |
| Waiter-assisted / staff order mode not designed | 📋 Deferred to Phase 2 | Added to backlog; schema supports it today via PAY_AT_CASHIER flow; UI is Phase 2 |
| Inventory / COGS tracking not designed | 📋 Out of scope | ERP-level feature; recommend Accurate Online / Jurnal.id integration over building in-house |

**Future agents:** If you are about to raise any of these as issues, read the referenced ADRs first.

**Fixed before v2.0 review (product maturity: onboarding, API, UI, Phase 2 prep):**

| Reviewer challenge | Status | Where addressed |
|---|---|---|
| No merchant onboarding wizard — new users overwhelmed on first login | ✅ Fixed in v2.0 | Full first-login wizard (5 steps), setup checklist, in-app help panel, FAQ, coach marks, empty states all documented in Merchant Onboarding section; `Merchant.onboardingStep`, `onboardingChecklist`, `wizardCompletedAt` fields added |
| No public API — merchants cannot integrate inventory / accounting without two systems | ✅ Fixed in v2.0 | Public REST API + Webhooks section added; `MerchantApiKey`, `WebhookEndpoint`, `WebhookDeliveryLog` schema stubbed in Phase 1 Prisma; ADR-021 documents design decisions |
| No UI framework decision — CoreUI / AdminLTE vs shadcn/ui unresolved | ✅ Fixed in v2.0 | ADR-020: CoreUI and AdminLTE rejected (Bootstrap conflict); shadcn/ui + Tailwind + shadcn Blocks + TanStack Table + Recharts + Framer Motion decided; tech stack table updated |
| Phase 2 prep unclear — which Phase 1 schema items must be stubbed now | ✅ Fixed in v2.0 | Phase 2 Schema Scaffolding section added: 8 new tables + 9 new nullable fields to include in Phase 1 Prisma; rationale per item |
| No design standards — "beautiful UI" undefined in the spec | ✅ Fixed in v2.0 | UI & Design Standards section added: design philosophy per app, design tokens, typography scale, component rules (skeletons not spinners, empty states, error states), motion spec, accessibility baseline, responsive breakpoints, apps/menu-specific requirements |
| apps/menu has zero design direction — customer experience undefined | ✅ Fixed in v2.0 | apps/menu specific section in UI standards: <1.5s first render, optimistic cart, swipe gestures, haptic feedback, bottom sheet, sticky cart bar, CSS theming <50ms |

**Fixed before v2.1 review (correctness, logic, improvements from senior architect review):**

| Reviewer challenge | Status | Where addressed |
|---|---|---|
| ADR-016 contradicts every other section (PAY_AT_CASHIER kitchen gate) | ✅ Fixed in v2.1 | ADR-016 corrected: kitchen never receives PAY_AT_CASHIER order without explicit cashier confirmation |
| QR scan validation missing RESERVED and DIRTY table status checks | ✅ Fixed in v2.1 | Section 1 (Customer scans QR) updated with all 5 blocking conditions + correct sig/exp URL format |
| QR URL in section 1 missing sig/exp params from ADR-015 | ✅ Fixed in v2.1 | Full ADR-015 URL format with &sig=&exp= shown in section 1; sig validation described |
| BranchCode collision algorithm produces inconsistent lengths (JAKA2 vs JAK2) | ✅ Fixed in v2.1 | Step 3 clarified: truncate to 3 chars then append counter digit → always 4 chars total |
| Order.confirmedAt field missing from schema (kitchen elapsed timer uses it) | ✅ Fixed in v2.1 | `confirmedAt: DateTime?` added to Order model; set in same transaction as CONFIRMED |
| Order.idempotencyKey field missing from schema and indexing strategy | ✅ Fixed in v2.1 | `idempotencyKey: String?` added to Order model; unique partial index added to DB Indexing Strategy |
| Merchant.onboardingStep rationale says "Phase 1 feature" (should be Phase 3) | ✅ Fixed in v2.1 | Rationale corrected: Phase 3 feature (Step 7), schema stubbed in Phase 1 for migration safety |
| WaiterRequest.notifyRoleId undocumented semantics (dangling FK) | ✅ Fixed in v2.1 | Role-based alert routing documented; Phase 1 = always null; Phase 2 UI design noted |
| maxActiveOrders bypass via batch PAY_AT_CASHIER cashier confirmation | ✅ Fixed in v2.1 | Cashier [Confirm] action checks maxActiveOrders at confirm time, not at order creation |
| TOCTOU race in late webhook revival stock pre-check | ✅ Fixed in v2.1 | Revival condition 4 (pre-check stock) removed; atomic decrement inside transaction handles it |
| BY_WEIGHT second payment — no session context after CustomerSession expires | ✅ Fixed in v2.1 | Session TTL extended while needsWeighing=true; charge triggered from merchant-pos; channel = same as original |
| ADR-015 redirect handler only checks CLOSED, not RESERVED or DIRTY | ✅ Fixed in v2.1 | Redirect handler step 1 expanded: human-friendly error pages for CLOSED, RESERVED, DIRTY (when enabled), SUSPENDED |
| autoResetAvailability + stockCount creates midnight availability glitch | ✅ Fixed in v2.1 | Validation constraint: autoResetAvailability ignored when stockCount IS NOT NULL; cron skips those items |
| Session cookie may link new table scan to wrong table's session | ✅ Fixed in v2.1 | ADR-011: session resume query explicitly requires tableId = scannedTableId; documented as critical guard |
| QueueCounter midnight reset timezone unspecified | ✅ Fixed in v2.1 | QueueCounter: date column stores WIB date; cron uses cron-timezone: Asia/Jakarta; midnight = WIB midnight |
| maxActiveOrders race condition under high concurrency | ✅ Fixed in v2.1 | Atomic INSERT...WHERE COUNT < cap pattern documented; SELECT+INSERT TOCTOU explained and rejected |
| Promotion model has no field specification — Step 11 unimplementable | ✅ Fixed in v2.1 | Full Promotion model added (type, discountValue, applicableTo, code, usageLimit, stacking rule) |
| Self-service merchant signup flow unspecified | ✅ Fixed in v2.1 | Self-Service Merchant Registration section added with full flow, DB records created, emailVerifiedAt |
| Customer registration/login flow entirely undesigned | ✅ Fixed in v2.1 | Customer Account & Registration section added: trigger points, OAuth path, session-to-customer linking, token storage |
| BY_WEIGHT second payment mechanism unspecified (channel unclear) | ✅ Fixed in v2.1 | Same channel as original; `Payment.paymentType: DEPOSIT|BALANCE_CHARGE|FULL` added; Open Questions resolved |
| RoleTemplate has no storage specification | ✅ Fixed in v2.1 | Hardcoded JSON in packages/config/roleTemplates.ts; not a DB record; copy-in on role creation |
| Menu caching cache key will be wrong after Phase 2 BranchMenuOverride | ✅ Fixed in v2.1 | Cache key changed to restaurantId:branchId:locale from day one; invalidation scoped to branch |
| Order.queueNumber description says counter/takeaway only (kitchen card shows all types) | ✅ Fixed in v2.1 | All order types receive queueNumber; dine-in: table name is primary, queueNumber secondary but always present |
| FBQRSYS first SystemAdmin has no bootstrapping process | ✅ Fixed in v2.1 | Seed Script Specification section added; FBQRSYS_ADMIN_EMAIL/PASSWORD env vars; idempotent |
| Staff.branchId null semantics underdefined (contradicts branch selector note) | ✅ Fixed in v2.1 | Null = restaurant-level access for restaurant managers; all standard staff must have branchId set; single-branch exception documented |
| PreInvoice listed in schema but never defined (stored or computed?) | ✅ Fixed in v2.1 | PreInvoice is computed, not stored; removed from schema diagram; Order fields serve this purpose |
| Time-based category availability has no timezone for comparison | ✅ Fixed in v2.1 | availableFrom/availableTo: stored as plain TIME, compared in Asia/Jakarta (WIB); toZonedTime() required |
| MenuItemVariant and MenuItemAddon have no field specifications | ✅ Fixed in v2.1 | Full field specs added to Menu Item Variants & Add-ons section |
| MerchantLoyaltyProgram cardinality undefined | ✅ Fixed in v2.1 | One active program per restaurant; isActive + activatedAt + deactivatedAt added; historical programs retained |

---

### ADR-019: Per-Branch Separate Menus — Rejected; Correct Pattern is Per-Branch Availability Override

**Challenge received (v1.9 operational review):** Kevin (chain owner) wants "Branch A menu, Branch B menu" — implying each branch should have its own independent menu.

**Decision: REJECTED — menu remains shared at restaurant level.**

**Reasoning:**

1. **The 1 Restaurant = 1 Menu invariant is a core architectural pillar.** It is what makes multi-branch manageable. If a chain owner had to maintain 6 separate menus, they would spend more time on menu management than running the restaurant. The entire value of the branch architecture is that a central menu change (price update, new item, seasonal promotion) propagates to all branches instantly.

2. **The legitimate use case is item availability, not menu structure.** Kevin's actual problem is not "Branch A has a completely different menu" — it is "Branch A ran out of ayam goreng today." The correct solution is a per-branch item availability override, not per-branch menu duplication.

3. **`BranchMenuOverride` junction model is the correct pattern:**
   ```
   BranchMenuOverride (branchId FK, menuItemId FK, isAvailable bool)
   ```
   This allows any item to be toggled off at a specific branch without affecting others or duplicating the menu. Adding this in Phase 2 is a non-breaking schema addition.

4. **If a chain genuinely needs completely different menus** (different concept, different pricing, different items), those are two different restaurant brands and should be two separate Merchant accounts — which is already the documented design (see ADR-007).

**Future agents:** Do not add per-branch menu duplication to the schema. Implement `BranchMenuOverride` in Phase 2 for per-branch item availability control.

---

### ADR-020: UI Framework — shadcn/ui + Tailwind; CoreUI and AdminLTE Rejected

**Decision:** Use Tailwind CSS + shadcn/ui as the single UI system across all apps. Use shadcn/ui Blocks for admin layout scaffolding. Do not use CoreUI, AdminLTE, or any Bootstrap-based admin template.

**Alternatives considered:**

| Option | Reason rejected |
|---|---|
| **CoreUI** | Bootstrap-based — conflicts with Tailwind CSS (competing reset stylesheets, specificity wars, doubled bundle). React version brings `@coreui/react` which ships Bootstrap CSS. |
| **AdminLTE** | Bootstrap 4/5 + jQuery. jQuery is incompatible with React's virtual DOM model. No viable Next.js App Router integration. Dated visual aesthetic. |
| **Ant Design** | Brings its own design system (not Tailwind-compatible). 500kb+ bundle. Conflicts with Tailwind utility classes. |
| **Material UI (MUI)** | Same problem as Ant Design — own design system, not Tailwind-compatible, emotion/styled-components dependency. |

**Why shadcn/ui wins:**
1. **You own the code** — shadcn copies component source into your repo. No external dependency to upgrade or break.
2. **Tailwind-native** — every component is Tailwind classes. No specificity conflicts.
3. **Next.js App Router native** — server components, `use client` boundaries, all handled correctly.
4. **shadcn Blocks** — full dashboard page templates (sidebar layout, data tables, settings pages) added in 2024. Replaces the "pre-built admin chrome" value proposition of CoreUI/AdminLTE.
5. **`apps/menu` compatibility** — the same component system works for both admin and customer apps. CoreUI/AdminLTE are admin-only aesthetics.
6. **Community dominance** — the dominant React + Tailwind component library as of 2025/2026. AI assistance, tutorials, and community support are unmatched.

**Complementary libraries chosen:**
- TanStack Table (via shadcn DataTable) — data grids
- Recharts (via shadcn Charts) — analytics
- Framer Motion — animation and gestures
- Sonner — toast notifications (ships with shadcn)

**Future agents:** Do not propose replacing Tailwind with Bootstrap. Do not suggest adding CoreUI or AdminLTE. If a UI component need arises that shadcn/ui does not cover, evaluate Radix UI primitives (which shadcn already wraps) before any other option.

**Status:** Decided.

---

### ADR-021: Public API Design — REST + Webhooks, Bearer Token Auth, No GraphQL

**Decision:** The FBQR public API is a REST API with bearer token authentication. Webhook subscriptions for event-driven integration. No GraphQL. No OAuth2 for server-to-server integrations.

**Why REST over GraphQL:**
1. **Target audience** — Accurate Online, Jurnal.id, and inventory systems used by Indonesian SMEs are built by teams that know REST. GraphQL adoption in Indonesia's SME software ecosystem is minimal. A REST API will be integrated by more merchants with less friction.
2. **Simplicity** — a REST API with 10 endpoints is easier to document, easier to debug ("just curl it"), and easier for Pak Budi's nephew who maintains the accounting system.
3. **Caching** — REST responses can be cached at the edge; GraphQL POST requests cannot without additional tooling.

**Why bearer token over OAuth2:**
1. **Use case is server-to-server** — OAuth2 is designed for delegating user authentication ("Login with Google"). Merchants are connecting their own server (Accurate Online) to their own FBQR data. Bearer tokens are the correct, simple mechanism.
2. **OAuth2 complexity** — implementing OAuth2 properly requires authorization server, token refresh flows, and redirect URIs. The implementation cost vastly exceeds the security benefit for this use case.
3. **Security parity** — bearer tokens over HTTPS + short expiry + per-permission scope + revocation endpoint is equivalent security to OAuth2 client credentials for this use case.

**Why webhooks for events (not polling):**
1. External systems polling FBQR's `/orders` endpoint every minute would create unnecessary load and 1-minute lag.
2. Webhooks deliver events in near-real-time with zero polling overhead.
3. Retry logic and delivery logs are owned by FBQR — the integrating system just needs to expose an HTTPS endpoint.

**Versioning strategy:** `/api/v1/` prefix. Version bump only on breaking changes. Non-breaking additions (new fields, new endpoints) are added without version bump. Deprecated versions maintained for 6 months minimum with email notice to all merchants using the old version (tracked via `MerchantApiKey.lastUsedAt` + version header logging).

**Status:** Decided.

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
| **BY_WEIGHT second payment channel** | Same channel as original payment. If original was QRIS → staff triggers a new Midtrans charge from merchant-pos (server-initiated). If original was CASH → cashier records manually. Second `Payment` row has `paymentType: BALANCE_CHARGE`. CustomerSession TTL extended while any OrderItem has `needsWeighing = true`. | Preserves consistent payment audit trail; cashier flow unchanged from standard PAY_AT_CASHIER |
| **PreInvoice storage** | Not stored. Computed on-the-fly at checkout and returned in the API response. The `Order` record already holds `subtotal`, `taxAmount`, `serviceChargeAmount`, `grandTotal` at creation time — these are the pre-invoice data. No `PreInvoice` Prisma model. | Eliminates a table with no unique data; avoids dual-write complexity; Order fields already serve this purpose |
| **First SystemAdmin bootstrap** | Seed script using `FBQRSYS_ADMIN_EMAIL` + `FBQRSYS_ADMIN_PASSWORD` env variables. Seed is idempotent. Admin role has all FBQRSYS permissions. Password must be changed on first production login. See Seed Script Specification. | Clearest, most repeatable mechanism; works in CI for integration tests; no one-time setup route needed |
| **Do dine-in orders get a queueNumber?** | Yes — all order types (DINE_IN, TAKEAWAY, DELIVERY) receive a `queueNumber`. For dine-in it is secondary in the UI (table name is primary), but always present on the kitchen card. `QueueCounter` resets at midnight Asia/Jakarta. | Consistent order creation logic; no conditional branching; kitchen card spec already shows it for all types |
| **Self-service merchant signup** | Minimal Phase 1 flow: email + restaurant name + password → create Merchant/Restaurant/Branch → send verification email → on verify → redirect to onboarding wizard. No CAPTCHA in Phase 1. `emailVerifiedAt` field on Merchant. See Self-Service Merchant Registration section. | Fastest to build; bot signups unlikely for B2B SaaS in Indonesia at launch scale |
| **Customer READY notification (browser tab closed)** | Phase 1: accept the gap. Staff delivery to table covers the READY case. Display a banner at checkout: "Pelayan akan mengantarkan pesanan Anda. Tidak perlu menunggu di layar ini." Phase 2: WhatsApp notification when order moves to READY (customer provides phone at checkout). | Waiter service is the norm in Indonesian restaurants; Phase 1 scope is already large; WA notification is the right channel for Indonesia (not SMS) |
| **MerchantLoyaltyProgram cardinality** | One active program per restaurant at a time. `isActive: bool` + `activatedAt/deactivatedAt: DateTime?` on the model. Deactivating a program retains historical records for balance integrity — existing customer point balances remain valid under the old program's exchange rate until redeemed. | Merchants may want seasonal programs or rate changes; historical integrity requires keeping old program records rather than editing in-place |
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

# Seed demo data (includes first FBQRSYS admin — see seed script spec below)
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

### Seed Script Specification

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
