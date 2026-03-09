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
| **merchant-kitchen** | Kitchen staff | Real-time order queue display |
| **end-user-system** | Customers | Scan QR → browse menu → order → pay |

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
| **File Storage** | Supabase Storage | Menu item images, restaurant logos |
| **Hosting** | [Vercel](https://vercel.com/) (Next.js) + [Supabase](https://supabase.com/) | Generous free tiers, auto-scaling |

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
| **Merchant staff** (cashier, manager) | PIN (4–6 digit) | Assigned restaurant/branch |
| **Kitchen staff** | PIN (4–6 digit) | Kitchen display only |
| **Customer** | Anonymous | Table-scoped session via QR token |

> **Important:** One email = one restaurant. If a merchant owns multiple restaurants, they register a separate account for each. This may be revisited in future.

---

## Key Data Models (Prisma Schema)

```
SystemAdmin          ← FBQRSYS super-admins
Merchant             ← Restaurant owner account (email + hashed password)
  └── Restaurant     ← The restaurant entity
        ├── Branch   ← Physical locations
        │     └── Table          ← Each table with unique QR token
        ├── MenuCategory
        │     └── MenuItem       ← Price, description, image, availability
        ├── Promotion            ← Discounts, combos (linked to MenuItems)
        ├── Staff                ← Kitchen/cashier accounts (PIN auth)
        └── MerchantSettings     ← Feature flags (AI recommendations on/off per type)

Order                ← Created when customer submits cart
  ├── OrderItem      ← Line items (MenuItem + quantity + price snapshot)
  └── Payment        ← Midtrans transaction record

CustomerSession      ← Anonymous session scoped to Restaurant + Table (via QR token)
```

---

## Order Flow

```
Customer scans QR (encoded: restaurantId + tableId + token)
    │
    ▼
end-user-system loads menu for that restaurant/table
    │
    ▼
Customer builds cart → reviews → proceeds to checkout
    │
    ▼
Payment via Midtrans (QRIS / OVO / GoPay / VA)
    │
    ▼
Midtrans webhook → FBQR API marks Order as PAID
    │
    ▼
Supabase Realtime pushes new order to merchant-kitchen display
    │
    ▼
Kitchen prepares → marks items as READY / ORDER COMPLETE
    │
    ▼
merchant-pos sees real-time order status + can generate reports
```

---

## Payment Gateway — Midtrans

Fee structure (for merchant reference):
- **QRIS:** 0.7% (recommended — lowest fee)
- **GoPay / OVO / DANA:** 2%
- **Virtual Account:** Rp 4,000 flat per transaction
- **Credit/Debit Card:** ~2.9%

Default payment method presented to customers: **QRIS** (covers all e-wallets via single QR).

---

## AI / Smart Recommendation Features

All features are **configurable per merchant** via `MerchantSettings`. Merchants can enable/disable each independently.

| Feature | Description |
|---|---|
| **Best-seller highlights** | Items ranked by order frequency, shown prominently |
| **Personalized suggestions** | Based on current cart contents (collaborative filtering) |
| **Upsell prompts** | "Add a drink?" type suggestions during checkout |
| **Time-based recommendations** | Breakfast/lunch/dinner items surfaced by time of day |

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
- **Soft deletes:** Use `deletedAt` timestamps rather than hard deletes for menu items and orders (important for historical reporting).
- **No `.gitignore` yet** — add one before committing generated files, `.env` files, or `node_modules`.

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
