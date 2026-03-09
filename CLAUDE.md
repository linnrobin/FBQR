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
| **Payment** | [Midtrans](https://midtrans.com/) | Indonesia's lowest-fee gateway (QRIS 0.7%) |
| **QR Codes** | [`qrcode`](https://www.npmjs.com/package/qrcode) npm package | Generate per-table QR codes |
| **PDF** | [`@react-pdf/renderer`](https://react-pdf.org/) | Invoice and pre-invoice generation |
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
| `reports:read` | View platform-level reports |
| `settings:manage` | Modify platform-level settings |
| `admins:manage` | Create/manage other FBQRSYS staff accounts |

#### FBQRSYS Role Templates (suggestions only — owner can rename/modify)

| Suggested Name | Default Permissions |
|---|---|
| Platform Owner | All |
| Merchant Manager | `merchants:create`, `merchants:read`, `merchants:update` |
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
SystemAdmin          ← FBQRSYS owner account (email + password, full platform access)
SystemRole           ← User-created FBQRSYS roles (name, description, [permissions])
SystemRoleAssignment ← Links SystemAdmin to a SystemRole
SystemPermission     ← Enum of all platform-level permission keys (system-defined)

Merchant             ← Restaurant owner account (email + hashed password)
  └── Restaurant     ← The restaurant entity
        ├── RestaurantBranding   ← Logo, colors, font, layout — shown to customers only
        ├── MerchantSettings     ← Feature flags (AI, loyalty, tax, service charge, etc.)
        ├── Branch               ← Physical locations
        │     └── Table          ← Each table with unique QR token + status
        ├── MenuCategory         ← menuLayoutOverride per category (optional)
        │     └── MenuItem       ← Price, description, image, availability
        │           └── MenuItemVariant   ← e.g. small/medium/large, spice level
        │           └── MenuItemAddon     ← e.g. extra cheese, no onion
        ├── Promotion            ← Discounts, combos (linked to MenuItems)
        ├── Staff                ← Staff accounts (PIN auth, linked to one or more Roles)
        ├── MerchantRole         ← User-created roles (name, description, [permissions])
        └── MerchantRoleAssignment ← Links Staff to a MerchantRole

Order                ← Created when customer submits cart
  ├── OrderItem      ← Line items (MenuItem + quantity + price snapshot + kitchenPriority)
  ├── PreInvoice     ← Generated at checkout, before payment
  ├── Invoice        ← Generated after payment confirmed
  └── Payment        ← Midtrans transaction record

Customer             ← Optional registered customer account
  ├── PlatformLoyaltyBalance  ← FBQR platform-wide points (Phase 2)
  └── MerchantLoyaltyBalance  ← Per-restaurant points (one per enrolled merchant)

MerchantLoyaltyProgram ← Per-restaurant loyalty configuration (if enabled)
  └── LoyaltyTier    ← Tiers with thresholds, titles, benefits (Phase 2 gamification)

CustomerSession      ← Anonymous or authenticated session scoped to Restaurant + Table

AuditLog             ← Immutable record of all state-changing actions
```

---

## Order Flow

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

## Kitchen Order Priority

The kitchen display shows all active `OrderItem` rows, grouped by order but sortable globally.

- Each `OrderItem` has a `kitchenPriority` integer field (default: order of insertion)
- Kitchen staff can drag-and-drop or use up/down controls to reprioritize
- Priority changes are real-time (Supabase Realtime broadcast) so all kitchen screens stay in sync
- Priority reordering is logged in `AuditLog` with actor = kitchen staff

**Example:** Three items arrive — Burger (pos 1), French Fries (pos 2), Salad (pos 3).
Kitchen moves Salad to pos 2 and French Fries to pos 3. Burger and Salad are prepared first.

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

## What's Still Missing / Backlog

The following features are identified but not yet specified in detail. Ordered by priority:

| Feature | Priority | Source | Notes |
|---|---|---|---|
| **Refund / cancellation flow** | High | Core | Partial/full refund via Midtrans, reflected in reports |
| **Stock / inventory tracking** | Medium | Core | Track inventory per `MenuItem`, auto-mark unavailable when stock hits 0 |
| **Discount codes / vouchers** | Medium | Core | Customer-facing promo codes separate from merchant promotions |
| **Export reports** | Medium | Core | Download sales/order reports as Excel or PDF |
| **WhatsApp notifications** | Medium | Core | Send invoice link and order status via WhatsApp Business API |
| **Email delivery** | Medium | Core | Invoices and order confirmations via email (Resend or Nodemailer) |
| **Printer integration** | Medium | Core | Thermal printer for kitchen tickets and receipts (`node-thermal-printer`) |
| **Group ordering (collaborative cart)** | Medium | China insight | Multiple phones at same table add to shared cart; show who ordered what |
| **Kitchen multi-station routing** | Medium | China insight | Route `OrderItem` to kitchen station (grill/cold/drinks) by `MenuCategory` |
| **Privacy consent flow** | Medium | China insight | Explicit data consent UI; minimal collection principle; clear opt-in for loyalty |
| **Warung / Lite mode** | Medium | Singapore insight | Simplified setup flow for single-stall operators; fewer features, faster onboarding |
| **Table reservation** | Low | Core | Customers or staff can book a table in advance |
| **Split bill** | Low | Core | Allow multiple payments against one order |
| **Staff shift management** | Low | Core | Clock-in/out, shift reports |
| **Offline mode (merchant-pos)** | Low | Core | PWA with local queue if internet drops briefly |
| **Multi-language menu items** | Low | Core | Per-item name/description in multiple languages |
| **Customer waitlist** | Low | Core | Join digital queue when restaurant is full |
| **Multi-restaurant per merchant** | Low | Core | Currently one email = one restaurant; revisit when needed |

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
| 5 | FBQRSYS — merchant management UI | `apps/web/(fbqrsys)` |
| 6 | Restaurant branding settings + CSS variable injection | `apps/web/(merchant)` + `apps/menu` |
| 7 | merchant-pos — menu & category management + layout config | `apps/web/(merchant)` |
| 8 | merchant-pos — table management + QR generation | `apps/web/(merchant)` |
| 9 | merchant-pos — promotions | `apps/web/(merchant)` |
| 10 | end-user-system — Grid layout (base layout, branded) | `apps/menu` |
| 11 | end-user-system — List, Bundle, Spotlight layouts | `apps/menu` |
| 12 | end-user-system — cart + variants + add-ons | `apps/menu` |
| 13 | end-user-system — pre-invoice + Midtrans checkout | `apps/menu` |
| 14 | Invoice PDF generation + storage | shared |
| 15 | merchant-kitchen — real-time order queue | `apps/web/(kitchen)` |
| 16 | merchant-kitchen — item priority reordering | `apps/web/(kitchen)` |
| 17 | merchant-pos — reports + analytics | `apps/web/(merchant)` |
| 18 | AI recommendation engine | `apps/menu` + API |
| 19 | Audit log — logging + viewer UI | All |
| 20 | Merchant loyalty program + customer account | `apps/menu` + `apps/web/(merchant)` |
| 21 | Platform loyalty + gamification (Phase 2) | All |
| 22 | Remaining backlog items | TBD |

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

# Midtrans
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false

# App URLs
NEXT_PUBLIC_MENU_APP_URL=     # URL of apps/menu (for QR code generation)
NEXT_PUBLIC_WEB_APP_URL=      # URL of apps/web
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
