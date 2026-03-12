# CLAUDE.md

This is the **command center** for AI agents working on this repository. It contains the current state, phase tracker, operating protocols, and operational conventions. All detailed specifications live in `docs/` — read the relevant file before writing any code.

---

## CURRENT STATE — Read This First

> **Every AI agent must read this block before doing anything else.**
> Update this block at the END of every session before pushing.

```
Last updated   : 2026-03-12
Version        : 3.0
Current phase  : Phase 0 — Requirements complete. No code written yet.
Last completed : Phase 0 complete — final gap closed (v3.0):
                 iOS Web Push limitation documented in two places:
                   docs/merchant.md § Notifications: full note covering iOS 15 (no support),
                   iOS 16.4+ (PWA/Add to Home Screen required), Android/desktop (standard),
                   kitchen display iPad implications, and onboarding banner requirement.
                   docs/architecture.md tech stack table: Web Push row updated with iOS
                   limitation summary and cross-reference to merchant.md.
                 All 100% of v2.0 content now present, refined, and consistent across docs/.
Next step      : Step 1 — Monorepo scaffold (Turborepo, packages, apps)
Active branch  : claude/claude-md-mmj9kfzjcs43k5bw-RRqsz
Open decisions : See "Open Questions for Future AI Agents" in docs/architecture.md
Known doc gaps : refund flow full detail — deferred to Step 15 and Step 19;
                 estimated wait time display — formula in docs/merchant.md, UI Phase 2;
                 Hidang mode full flow — deferred to Phase 2;
                 customer READY notification — Phase 1 accepts gap, Phase 2 WA message;
                 BY_WEIGHT BALANCE_REFUND via same Midtrans channel — Midtrans partial
                   refund API integration detail deferred to Step 15
```

---

## Phase Tracker

Work through phases in order. Do not start a phase until all previous steps are committed and pushed.

### Phase 0 — Requirements & Documentation
- [x] CLAUDE.md created with full project spec
- [x] Data models, flows, RBAC, billing, dashboards documented
- [x] Architecture Decision Records (ADRs) written
- [x] Kitchen station routing designed
- [x] QR order security designed
- [x] Multi-branch EOI flow designed
- [x] Pre-code architecture review: correctness issues, logic flaws, and open questions resolved (ADRs 009–013 added)
- [x] `docs/` reference directory created: data-models.md, platform-owner.md, merchant.md, customer.md, architecture.md
- [x] CLAUDE.md refactored to command center only — all specs delegated to docs/

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
4. **Read the relevant `docs/` file(s) for the step you are about to build** — see the Step→Doc routing table in `## Reference Documentation` below. Do not rely on this file alone or on memory. CLAUDE.md is the index; `docs/` files are the specs.
5. **Read the existing code files** you will be modifying before editing them — never edit blind

Only after these 5 steps should you begin writing code.

---

### Session End Protocol

Before the session ends (and before context runs out), always:

1. **Commit and push all changes** — partial work is better than lost work
2. **Update the CURRENT STATE block** at the top of this file:
   - Increment `Version` (patch bump for doc/config changes; minor bump for schema or ADR changes; major bump for phase completion)
   - Set `Last updated` to today's date
   - Set `Last completed` to what was just finished
   - Set `Next step` to the next uncompleted item in the Phase Tracker
   - Note any new open decisions or doc gaps discovered
3. **Check off completed steps** in the Phase Tracker
4. **Update the relevant `docs/` file(s)** if any of the following occurred:
   - Added/removed/changed a Prisma model or field → `docs/data-models.md`
   - Changed billing logic, cron jobs, FBQRSYS flows, or PDP compliance → `docs/platform-owner.md`
   - Changed RBAC, menu management, kitchen, promotions, or onboarding flows → `docs/merchant.md`
   - Changed customer session, ordering, QR flow, or loyalty logic → `docs/customer.md`
   - Added/revised an ADR, changed tech stack, or updated backlog → `docs/architecture.md`
5. **Update CLAUDE.md** with any project-wide conventions or operational changes not covered in a docs/ file
6. **Push CLAUDE.md and all updated docs/ files together** as the final commit of the session

---

### Context Recovery Protocol

If a session ran out of context mid-task and you are resuming:

1. Read the CURRENT STATE block — it tells you where the previous session stopped
2. Run `git log --oneline -10` — read the last few commit messages to understand what was done
3. Run `git diff HEAD~1` if the last commit was partial — see what changed
4. Read the relevant `docs/` file for the step being worked on (see Step→Doc routing table below)
5. Read the specific code files being worked on (named in the commit messages)
6. Do **not** try to re-read this entire file — jump to CURRENT STATE and the relevant docs/ file
7. If genuinely unclear, ask the user: *"I can see the last session was working on [X]. Should I continue from [specific point] or review the current state first?"*

---

### Context Limit Warning Signs

If you notice any of these, start the Session End Protocol immediately:
- You are struggling to recall details from earlier in the conversation
- Tool results are being truncated or summarised automatically
- You have made more than ~15 tool calls in the session
- The user's messages are taking noticeably longer to process

Do not try to finish one more thing. Stop, commit, update CURRENT STATE and docs/, push.

---

## Reference Documentation

> **CLAUDE.md is the command center** — it holds CURRENT STATE, Phase Tracker, protocols, and operational conventions. The `docs/` files hold all detailed specifications. Always start here, then navigate to the relevant `docs/` file. Never implement from CLAUDE.md alone.

### What each docs/ file owns

| File | Authoritative on | Do NOT put in CLAUDE.md |
|---|---|---|
| `docs/data-models.md` | Every Prisma model and field, schema conventions, DB indexes, seed spec, caching strategy, fraud/rate-limit rules | Model field lists, index definitions |
| `docs/platform-owner.md` | FBQRSYS permissions/roles, subscription & billing, cron job specs, PDP compliance, platform dashboard, monitoring, data retention | Billing flow details, cron SQL, compliance rules |
| `docs/merchant.md` | Merchant RBAC, onboarding wizard, branding, menu management, kitchen routing, promotions, table management, analytics dashboard, delivery integration (merchant side) | Menu field specs, kitchen display format, role templates |
| `docs/customer.md` | QR flow (all 9 sections), customer session, order lifecycle, payment flow, customer UI requirements, loyalty (customer side), AI recommendations | QR validation steps, payment→order mapping, customer UI rules |
| `docs/architecture.md` | All ADRs, authentication model, tech stack decisions, competitive research, feature backlog, open questions | ADR content, auth table, backlog items |

### Step → Doc routing table

Read **all listed files** before writing code for a step.

| Step(s) | What it builds | Read these docs/ files |
|---|---|---|
| **Step 1** | Monorepo scaffold | `architecture.md` (repo structure, tech stack) |
| **Step 2** | Prisma schema + migrations + seed | `data-models.md` ← primary; `architecture.md` (ADRs explaining why) |
| **Step 3** | Auth: JWT, PIN auth, NextAuth | `data-models.md` (Merchant, Staff, Customer models); `architecture.md` (auth model, ADR-005) |
| **Step 4** | Dynamic RBAC — role/permission engine | `merchant.md` (RBAC section); `platform-owner.md` (FBQRSYS permissions); `architecture.md` (ADR-005) |
| **Step 5** | FBQRSYS — merchant management UI | `platform-owner.md` ← primary; `data-models.md` (Merchant model) |
| **Step 6** | Merchant subscription & billing | `platform-owner.md` ← primary (billing section, cron specs) |
| **Step 7** | Merchant onboarding — trial/free tier | `merchant.md` (onboarding wizard, checklist) |
| **Step 8** | Restaurant branding + CSS injection | `merchant.md` (branding section); `customer.md` (how branding renders in apps/menu) |
| **Step 9** | Menu & category management, CSV import | `merchant.md` ← primary (menu fields, variants, add-ons, CSV spec) |
| **Step 10** | Table management, QR generation, floor map | `merchant.md` (table status, QR spec); `customer.md` (QR flow, ADR-015) |
| **Step 11** | Promotions + discount codes | `merchant.md` (Promotion model spec) |
| **Step 12** | QR validation + branded menu + Grid layout | `customer.md` ← primary; `merchant.md` (branding, layouts) |
| **Step 13** | List, Bundle, Spotlight layouts | `customer.md` ← primary; `merchant.md` (layout specs) |
| **Step 14** | Item detail modal: variants, add-ons | `customer.md`; `merchant.md` (variant/addon field specs) |
| **Step 15** | Cart + pre-invoice + Midtrans + cash | `customer.md` ← primary; `data-models.md` (Payment model) |
| **Step 16** | Order tracking + real-time + Call Waiter | `customer.md` ← primary; `merchant.md` (WaiterRequest types) |
| **Step 17** | Takeaway/counter mode, queue display | `customer.md` (takeaway customer view); `merchant.md` (counter flow, QueueCounter) |
| **Step 18** | Push notifications — Web Push API | `architecture.md` (push notification design); `merchant.md` (notification routing) |
| **Step 19** | Invoice + MerchantBillingInvoice PDF | `platform-owner.md` (MerchantBillingInvoice); `merchant.md` (Invoice format) |
| **Step 20** | merchant-kitchen: queue, priorities, stations | `merchant.md` ← primary (kitchen display, station routing, priority) |
| **Step 21** | ROI analytics dashboard + accounting export | `merchant.md` ← primary (dashboard specs, export) |
| **Step 22** | Delivery platform integration | `merchant.md` (delivery flows); `architecture.md` (ADR-012, webhook idempotency) |
| **Step 23** | AI recommendation engine | `customer.md` (AI customer-facing); `merchant.md` (AI settings) |
| **Step 24** | Audit log — middleware + viewer UI | `platform-owner.md` ← primary; `data-models.md` (AuditLog model) |
| **Step 25** | Merchant loyalty + customer account | `merchant.md` (loyalty config); `customer.md` (customer account, loyalty balance) |
| **Step 26** | Platform loyalty + gamification | `customer.md` (loyalty tiers); `platform-owner.md` (platform loyalty) |
| **Step 27** | WhatsApp Business integration | `platform-owner.md` (MerchantIntegration model); `merchant.md` (WA notification flows) |
| **Step 28** | Remaining backlog | `architecture.md` (backlog); read domain docs per specific item |
| **Any step** | Schema cross-check | `data-models.md` — confirm model fields before writing Prisma queries |
| **Any step** | Design question / ADR lookup | `architecture.md` — check if the question was already decided |

### Write rules — when to update docs/ files

> **Every session that changes behaviour, adds models, or makes a design decision must update the relevant docs/ file before pushing. Stale docs are worse than no docs.**

| What you changed | Update this file |
|---|---|
| Added/removed/renamed a Prisma model or field | `docs/data-models.md` |
| Changed a cron job, billing flow, or invoice logic | `docs/platform-owner.md` |
| Changed RBAC rules, permissions, or role templates | `docs/merchant.md` (merchant) or `docs/platform-owner.md` (FBQRSYS) |
| Changed menu field specs, kitchen display, or promotions | `docs/merchant.md` |
| Changed QR flow, session lifecycle, or payment logic | `docs/customer.md` |
| Made a new architecture decision (new package, pattern, constraint) | `docs/architecture.md` — add an ADR |
| Resolved an open question | `docs/architecture.md` (move to Resolved); update CLAUDE.md CURRENT STATE |
| Discovered a new doc gap | CLAUDE.md `Known doc gaps` in CURRENT STATE |

### Conflict resolution

If CLAUDE.md and a `docs/` file contradict each other: **the more recently updated file is correct.** Always update both together. If you spot a stale contradiction, fix the out-of-date file and note it in the commit message.

---

## Project Overview

**FBQR** is a SaaS platform for cafes and restaurants in Indonesia. Customers scan a QR code at their table, browse a digital menu, place orders, and pay — all from their phone, without installing an app.

**Author:** Robin <robinsalim@yahoo.com> | **License:** MIT (2026) | **Market:** Indonesia (IDR, QRIS/GoPay/OVO) — designed for global expansion.

| Sub-System | Audience | Purpose |
|---|---|---|
| **FBQRSYS** | Platform super-admin | Create/manage merchant accounts, platform-level reports |
| **merchant-pos** | Restaurant owner / staff | Manage menus, promotions, view reports, generate QR codes |
| **merchant-kitchen** | Kitchen staff | Real-time order queue display, item priority reordering |
| **end-user-system** | Customers | Scan QR → browse menu → order → pay → earn loyalty points |

For tech stack, authentication model, ADRs, and full architectural context → see `docs/architecture.md`.

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
│       └── roleTemplates.ts       # Hardcoded role template presets (NOT DB records)
├── docs/                          # Reference documentation for AI agents
│   ├── data-models.md             # Authoritative Prisma schema reference — READ for Step 2
│   ├── platform-owner.md          # FBQRSYS: billing, subscriptions, cron jobs, PDP compliance
│   ├── merchant.md                # Merchant: RBAC, onboarding, menu, kitchen, analytics
│   ├── customer.md                # Customer: QR flow, session, ordering, payment, loyalty
│   └── architecture.md            # ADRs, auth model, tech stack, backlog, open questions
├── turbo.json
├── package.json                   # Root package.json (workspaces)
├── .env.example                   # Environment variable template
├── .gitignore
├── LICENSE
├── README.md
└── CLAUDE.md                      # This file — command center for AI agents
```

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

### Setup

```bash
npm install
cp .env.example .env.local        # fill in all required keys
npm run db:migrate                 # run Prisma migrations
npm run db:seed                    # seed FBQRSYS admin + demo merchant
npm run dev                        # start all apps
```

### Common Commands

```bash
npm run dev          # Start all apps in development
npm run build        # Build all apps
npm run lint         # Lint all packages
npm run typecheck    # TypeScript check across all packages
npm run test         # Run unit + integration tests (Vitest)
npm run test:e2e     # Run E2E tests (Playwright)
npm run db:migrate   # Run Prisma migrations (dev)
npm run db:deploy    # Apply migrations in production (prisma migrate deploy)
npm run db:studio    # Open Prisma Studio (DB browser)
npm run db:seed      # Seed development data
npm run dev --filter=web    # apps/web only
npm run dev --filter=menu   # apps/menu only
```

### Seed Script

The seed creates (idempotently):
1. **First FBQRSYS SystemAdmin** from env vars `FBQRSYS_ADMIN_EMAIL` / `FBQRSYS_ADMIN_PASSWORD` — change password on first production login
2. **Demo merchant** (dev only, skipped in `NODE_ENV=production`) — one Merchant + Restaurant + Branch + sample menu + Staff (PIN: 1234) + pre-generated QR tokens
3. **Default SubscriptionPlan rows** — Starter, Pro, Enterprise (edit pricing from FBQRSYS UI after deploy)

Full seed spec → `docs/data-models.md` § Seed Script Specification.

---

## Environment Variables

```env
# ── Database (Supabase PostgreSQL) ───────────────────────────────────────────
# Pooled connection via PgBouncer — used by all serverless API routes at runtime
# Get from: Supabase Dashboard → Settings → Database → Connection string → Transaction mode
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct connection — used ONLY by Prisma migrations (prisma migrate deploy/dev)
# Get from: Supabase Dashboard → Settings → Database → Connection string → Session mode
DATABASE_DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].supabase.com:5432/postgres

# Test database — used by integration tests (separate Supabase project or local Postgres)
# Must NOT point to production or dev database
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fbqr_test

# ── Supabase ─────────────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ── Auth ─────────────────────────────────────────────────────────────────────
NEXTAUTH_URL=
NEXTAUTH_SECRET=                  # min 32 random chars; generate with: openssl rand -base64 32

# ── Security ─────────────────────────────────────────────────────────────────
# HMAC-SHA256 secret for QR signed URL generation and verification (ADR-015)
# Used by: apps/web redirect handler (sign) + apps/menu middleware (verify)
# Must be identical in both apps. Generate with: openssl rand -base64 32
QR_SIGNING_SECRET=

# ── Midtrans (customer payments + merchant billing) ───────────────────────────
MIDTRANS_SERVER_KEY=              # Server-side only — NEVER expose to client
MIDTRANS_CLIENT_KEY=              # Safe to expose — used in Snap.js on the browser
MIDTRANS_IS_PRODUCTION=false      # Set to true only in production Vercel env vars

# ── Email (Resend) ───────────────────────────────────────────────────────────
RESEND_API_KEY=
EMAIL_FROM=noreply@fbqr.app

# ── App URLs ─────────────────────────────────────────────────────────────────
NEXT_PUBLIC_MENU_APP_URL=         # e.g. https://menu.fbqr.app (or http://localhost:3001 in dev)
NEXT_PUBLIC_WEB_APP_URL=          # e.g. https://app.fbqr.app  (or http://localhost:3000 in dev)

# ── Cron (Vercel Cron Jobs) ──────────────────────────────────────────────────
# Passed as Authorization: Bearer {CRON_SECRET} header — validated in every cron route
# Generate with: openssl rand -base64 32
CRON_SECRET=

# ── First FBQRSYS admin (seed script only) ───────────────────────────────────
FBQRSYS_ADMIN_EMAIL=
FBQRSYS_ADMIN_PASSWORD=           # Change immediately on first production login
```

> **Security notes:**
> - `QR_SIGNING_SECRET` and `NEXTAUTH_SECRET` must be identical across `apps/web` and `apps/menu` Vercel projects (both verify QR signatures).
> - `MIDTRANS_SERVER_KEY` must NEVER appear in any `NEXT_PUBLIC_*` variable or client-side bundle.
> - Rotate `QR_SIGNING_SECRET` intentionally only — rotation invalidates all existing QR physical prints (customers must re-scan or staff must reprint QR codes).
> - `CRON_SECRET` validation pattern: every cron API route must check `req.headers.get('authorization') === \`Bearer ${process.env.CRON_SECRET}\`` before executing. Return HTTP 401 if missing or wrong.

---

## Key Conventions

- **Currency:** All prices as integers in IDR (no decimals). All money-bearing models include `currency: String default "IDR"` for future multi-currency expansion — treat as infrastructure, not a live feature.
- **Timezone:** `Asia/Jakarta` (WIB, UTC+7). Category time windows, QueueCounter resets, and all cron jobs use WIB.
- **Language:** Bahasa Indonesia default. Build with `next-intl` hooks for future expansion.
- **Images:** Upload to Supabase Storage; store only path/URL in DB. Customer-facing images (`apps/menu`) must use `next/image` — never `<img>`. Compress to max 800×800px WebP at upload time.
- **Real-time:** Supabase Realtime for all live order events. Never poll — subscribe. Channel scope: one per branch (`orders:branchId`), never per-order.
- **Soft deletes:** Use `deletedAt` timestamps — never hard-delete menu items, orders, staff, or promotions.
- **Audit log:** All state-changing mutations → `auditLog()` helper. Never inline audit entries.
- **Price snapshots:** Copy item name, price, variants, add-ons into `OrderItem` at order time. Never join back to `MenuItem` for order history.
- **Permissions gate:** All API routes and server actions must call `requirePermission(session, 'permission:key')` before mutating data.
- **No `.env` in git:** `.gitignore` must be committed before any code.

---

## Deployment

| App | Platform | Notes |
|---|---|---|
| `apps/web` | Vercel | merchant-pos + FBQRSYS + kitchen display |
| `apps/menu` | Vercel | customer-facing menu (high traffic) — separate Vercel project |
| Database | Supabase | PostgreSQL + Realtime + Storage |

Both Next.js apps deploy as separate Vercel projects from the same monorepo (Vercel root directory setting per project).
