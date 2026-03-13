# FBQR — Architecture Decisions & Competitive Context

> **For AI agents:** Read this file when you need to understand *why* the system is designed the way it is. Contains all Architecture Decision Records (ADRs), competitive research that informed key product choices, the tech stack rationale, and the feature backlog. Cross-reference with `docs/data-models.md` for schema details and `CLAUDE.md` for the authoritative source of truth.

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
| **Push notifications** | Web Push API (browser-native) | New order alerts to merchant-pos and merchant-kitchen. **iOS limitation:** requires PWA ("Add to Home Screen") on iOS 16.4+ — does not work in a regular Safari/Chrome tab on iOS. See `docs/merchant.md` § Notifications for onboarding implications. |
| **QR Codes** | [`qrcode`](https://www.npmjs.com/package/qrcode) npm package | Generate per-table QR codes |
| **PDF** | [`@react-pdf/renderer`](https://react-pdf.org/) | Invoice and pre-invoice generation |
| **Email** | [Resend](https://resend.com/) | Transactional email — billing reminders, invoices, notifications |
| **Scheduled Jobs** | [Vercel Cron](https://vercel.com/docs/cron-jobs) | Daily billing checks, auto-lock overdue accounts. **⚠️ Vercel Pro required** for sub-daily cron intervals (e.g. order expiry every 15 min). Free tier: 1 invocation/day only. See ADR-023 and the Cron section in `docs/platform-owner.md`. |
| **File Storage** | Supabase Storage | Menu item images, restaurant logos, invoice PDFs |
| **Input validation** | [Zod](https://zod.dev/) | Schema validation on every API route and server action. Mandatory — not optional. See ADR-024. Schemas also feed `zod-to-openapi` for Phase 2 API docs. |
| **API docs** | [Zod-to-OpenAPI](https://github.com/asteasolutions/zod-to-openapi) + Swagger UI | Auto-generated from Zod schemas; served at `/api/docs` (Phase 2) |
| **Timezone handling** | [`date-fns-tz`](https://github.com/marnusw/date-fns-tz) | WIB (Asia/Jakarta) timezone conversion for category time windows, queue counter resets, cron jobs. All time comparisons must use this library — never `new Date().getHours()` without timezone context. |
| **i18n** | [next-intl](https://next-intl-docs.vercel.app/) | Bahasa Indonesia default; multi-language expansion path |
| **Hosting** | [Vercel](https://vercel.com/) (Next.js) + [Supabase](https://supabase.com/) | Separate Vercel projects for `apps/web` and `apps/menu`. See platform limits below. |

> **Architecture note:** This project uses a **modular monolith** (not microservices). The Turborepo structure enforces clean domain boundaries between sub-systems. Individual apps can be extracted into independent services later if scaling demands it.
>
> **UI framework decision:** CoreUI and AdminLTE are explicitly rejected — both are Bootstrap-based and conflict with Tailwind CSS. shadcn/ui Blocks + TanStack Table + Recharts + Framer Motion replaces all admin template needs without framework lock-in. See ADR-020.

### Platform Limits to Know Before Launch

| Platform | Limit | Impact | Mitigation |
|---|---|---|---|
| **Supabase Free** | 500 MB database storage | ~2M rows; fine for launch | Upgrade to Pro ($25/mo) when approaching |
| **Supabase Free** | 1 GB file storage | ~500 menu images at 2 MB each | Compress to WebP at upload time (≤300 KB target) |
| **Supabase Free** | 200 concurrent Realtime connections | ~200 simultaneous kitchen/order screens | Upgrade or switch to Ably if hit |
| **Supabase Free** | 50,000 monthly active users | Customer sessions count | Monitor; upgrade at scale |
| **Vercel Free (Hobby)** | 1 Cron invocation per day | Cannot run order-expiry cron every 15 min | **Vercel Pro required from Step 15** |
| **Vercel Free (Hobby)** | 100 GB bandwidth/month | Fine for launch | Monitor |
| **Vercel Free (Hobby)** | 10 second serverless function timeout | Webhook handler + PDF gen must complete in <10s | Keep handlers lean; PDF gen async |
| **Midtrans Sandbox** | No real transactions | Dev/test only | Switch `MIDTRANS_IS_PRODUCTION=true` at launch |

> **Recommendation:** Start on Supabase Free + Vercel Hobby. Upgrade to Vercel Pro ($20/mo) at Step 15 (payment integration) for the order-expiry cron. Budget ~$45/mo total at launch (Vercel Pro + Supabase Free).

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
├── turbo.json
├── package.json                   # Root package.json (workspaces)
├── .env.example
├── .gitignore
├── LICENSE
├── README.md
└── CLAUDE.md                      # Primary source of truth for AI agents
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

> **PIN auth security:** PIN sessions have a configurable inactivity timeout (default 4 hours) after which the device returns to the PIN entry screen. High-sensitivity actions (`CANCEL`, `REFUND`) require `orders:manage` permission explicitly and are always logged in `AuditLog` with `actorId`, `actorName`, and `cancellationReason`. A `requireSupervisorFor: CANCEL` flag in `MerchantSettings` is a Phase 2 addition; schema must anticipate it.

> **1 Merchant = 1 Restaurant brand (firm rule).** `Merchant` = owner account. `Restaurant` = the brand (menu, branding, settings). `Branch` = physical location. A second restaurant brand requires a new Merchant account with a different email. See ADR-007.

> **Customer login is optional.** Anonymous QR sessions handle all ordering. Login unlocks loyalty point earning and order history.

---

## Architecture Decision Records (ADRs)

> **For AI agents:** These records explain the *why* behind key design decisions. If you are about to suggest a change that conflicts with a decision below, read the rationale first. Where a status says **Decided**, the decision is firm for Phase 1. Where noted as open or Phase 2, proposals are welcome.

---

### ADR-001: Monorepo (Turborepo) over Microservices

**Decision:** Use a Turborepo monorepo with two Next.js apps (`apps/web`, `apps/menu`) and shared packages.

**Rationale:** Microservices add significant operational overhead (separate deployments, inter-service auth, distributed tracing, network latency on every internal call). At the current stage — one developer, no traffic yet — that overhead provides no benefit. Turborepo gives clean domain separation (each sub-system is its own app/package) without the infra complexity. Individual apps can be extracted into independent services later if specific scaling pain points emerge.

**Tradeoffs accepted:** A monorepo means a single deployment pipeline. If one sub-system has a critical bug, all sub-systems may be affected by a bad deploy. Mitigated by: separate Vercel projects for `apps/web` and `apps/menu`.

**Status:** Decided. Open for revision if the team scales past ~10 engineers or if sub-systems require independent scaling.

---

### ADR-002: Supabase over Self-Managed PostgreSQL

**Decision:** Use Supabase for PostgreSQL, Realtime, and Storage.

**Rationale:** Supabase provides three critical services in one: managed PostgreSQL (removes infra burden), Realtime subscriptions (required for live kitchen display and order tracking), and file Storage (menu images, invoice PDFs). The free tier is sufficient for initial launch.

**Tradeoffs accepted:** Supabase Realtime is constrained by their pricing tiers at high concurrent connections. If the kitchen display needs to support hundreds of simultaneous connections, Supabase Realtime costs could become a concern. Mitigation: monitor connection counts; switch to a dedicated Ably/Pusher subscription if Supabase becomes a bottleneck.

**Status:** Decided.

---

### ADR-003: Prisma ORM over Raw SQL or Drizzle

**Decision:** Use Prisma as the ORM.

**Rationale:** Prisma's type-safe client and migration system reduce an entire class of bugs (runtime type mismatches between DB and TypeScript). The schema file doubles as documentation. Drizzle was considered — it has a smaller runtime footprint and is arguably faster for large queries, but Prisma's migration tooling and schema clarity are more valuable for a solo developer building a complex schema from scratch.

**Tradeoffs accepted:** Prisma's query builder occasionally requires raw SQL for complex aggregations. Use `prisma.$queryRaw` for these cases.

**Status:** Decided. Open to Drizzle migration if Prisma query performance becomes a bottleneck on complex dashboard queries.

---

### ADR-004: Payment-First Order Confirmation (No Cashier Approval Gate)

**Decision:** Orders are only confirmed (and routed to kitchen) after Midtrans payment webhook. No cashier must manually approve digital orders.

**Rationale:** Payment IS the approval. Cashier gates re-introduce human bottleneck and degrade customer experience at exactly the moment when self-service value is highest (peak hours with multiple simultaneous orders). Midtrans webhook verification is cryptographically stronger than a human check anyway.

**Exception:** Cash orders use the same gate — cashier confirms after collecting money, which routes the order to kitchen. The confirming party differs (cashier vs Midtrans webhook) but the principle is identical: kitchen never sees an order until it is confirmed.

**Status:** Decided. This is a core product philosophy.

---

### ADR-005: Dynamic RBAC (Permissions Hardcoded, Roles User-Created)

**Decision:** Permissions are system-defined atomic capability keys (e.g. `menu:manage`). Roles are fully user-created free-form names with any combination of permissions. Templates are suggestions only — hardcoded as JSON in `packages/config/roleTemplates.ts`, **not** stored as DB records.

**Rationale:** Hardcoding roles (e.g. `CASHIER`, `SUPERVISOR`) creates a rigid system that does not match real Indonesian restaurant operations. A "Koordinator Dapur" at one restaurant has different responsibilities than a "Kepala Dapur" at another. Permissions must be hardcoded because they correspond directly to code-level `requirePermission()` gate calls.

**Critical implementation note:** An agent building Step 4 must **NOT** create a `RoleTemplate` Prisma model. Templates are hardcoded JSON only. When a user picks a template in the UI, a new `MerchantRole` (or `SystemRole`) record is created with that template's permission list copied in. Modifications after creation only affect the new role.

**Status:** Decided.

---

### ADR-006: Per-Category Kitchen Station Assignment (not per-item tagging)

**Decision:** Kitchen stations are assigned at the `MenuCategory` level. Per-item override is available but category is the primary assignment unit.

**Rationale:** Merchants think in categories ("all Drinks go to Bar"), not individual items. Category-level assignment requires one setting per category, not one per item. Reduces configuration friction by ~90% for a typical 40-item menu.

**Status:** Decided.

---

### ADR-007: 1 Merchant = 1 Restaurant; Multi-Branch via FBQRSYS EOI

**Decision:** One Merchant account always maps to exactly one Restaurant. A second restaurant brand requires a new Merchant account with a different email. Multiple physical locations of the same restaurant are supported as `Branch[]` records, gated by `multiBranchEnabled` and `branchLimit` set by FBQRSYS admin via EOI.

**Rationale:** Strict 1-to-1 simplifies the entire permission, billing, and subscription model. Multi-branch (same restaurant, multiple locations) is the legitimate scaling use case and is fully supported within one account.

**On EOI being manual:** Self-service branch creation bypasses plan enforcement. Manual approval ensures `branchLimit` is set correctly per plan. At current scale, EOI volume is low enough that manual processing is faster to build than an automated workflow.

**Future:** If EOI volume grows, an in-app `MerchantRequest` queue for FBQRSYS admins would replace email. No schema conflicts — just a new `MerchantRequest` model (already stubbed in Phase 1 Prisma) and admin review UI.

**Status:** Decided.

---

### ADR-008: Only end-user-system is Merchant-Branded

**Decision:** FBQRSYS and `merchant-pos` always display FBQR's own UI. Only the `apps/menu` (customer-facing) app applies merchant branding (logo, colors, font).

**Rationale:** FBQRSYS is a B2B platform admin tool — branding it with merchant colors would cause confusion. `merchant-pos` retains FBQR UI chrome so support staff can recognise the system immediately when assisting merchants. Customers should feel they are at the restaurant's own digital experience.

**Status:** Decided.

---

### ADR-009: One CustomerSession per Table (not per device)

**Decision:** Exactly one `CustomerSession` can be ACTIVE per table at any time. If a second device scans the same QR code while a session is already ACTIVE, the second scan resumes the existing session.

**Rationale:** A single-session model is simpler to implement, simpler to reason about for reporting, and matches how restaurants think ("Table 5 has one bill"). Group ordering (multiple phones adding to the same cart) is a Phase 2 feature.

**Consequence:** In Phase 1, "group ordering" means: one person orders, others view the tracking screen. This is the common case in Indonesian casual dining.

**Status:** Decided.

---

### ADR-010: Table Occupancy on First Confirmed Order (not on QR Scan)

**Decision:** A table's status changes from `AVAILABLE` to `OCCUPIED` when the first `Order` for that session is `CONFIRMED` (payment successful), not when the QR is scanned.

**Rationale:** QR scanning is cheap and accidental — a customer might scan to look at the menu and leave without ordering. Marking the table `OCCUPIED` on scan would pollute the floor map with false occupancies.

**Status:** Decided.

---

### ADR-011: Customer Session Continuity via Cookie

**Decision:** On QR scan, a `fbqr_session_id` cookie is set on the customer's browser (`httpOnly`, scoped to `menu.fbqr.app`). On subsequent page loads (including refresh), the server checks for this cookie before creating a new session.

**Critical implementation rule — the session resume query MUST include the table guard:**
```sql
SELECT * FROM CustomerSession
WHERE id = $cookieValue
  AND tableId = $scannedTableId   -- REQUIRED: prevents cross-table session leakage
  AND status = 'ACTIVE'
```
If the cookie matches a session on a **different** table (e.g. customer moves from Table 5 to Table 8), the server treats the request as a new session for Table 8. Without this guard, a customer's order would be routed to the wrong table.

**Post-expiry read access:** When a `CustomerSession` moves to `EXPIRED`, the `fbqr_session_id` cookie continues to grant **read-only access** to that session's `Order` rows. Write operations (place new order, call waiter) are rejected with "Your session has ended."

**Status:** Decided.

---

### ADR-012: Delivery Order Branch Assignment

**Decision:** Delivery orders (GrabFood/GoFood/ShopeeFood) are assigned to a specific `Branch` via `Branch.platformStoreId`. The webhook routes dynamically by matching the payload's store identifier to the correct branch record.

**Phase 1:** Manual entry of delivery orders in merchant-pos.
**Phase 2:** Automated webhook using `Branch.platformStoreId` for dynamic routing.

**Status:** Decided.

---

### ADR-013: Tax-Inclusive Price Computation

**Decision:** When `MerchantSettings.pricesIncludeTax = true`, displayed prices are tax-inclusive. The tax amount is back-calculated as: `taxAmount = round(price × taxRate / (1 + taxRate))`.

**Default formula (`pricesIncludeTax = false`):**
- `serviceCharge = round(subtotal × serviceChargeRate)`
- `taxBase = taxOnServiceCharge ? (subtotal + serviceCharge) : subtotal`
- `tax = round(taxBase × taxRate)`
- `total = subtotal + serviceCharge + tax`

**`taxOnServiceCharge` default: `true`** — Indonesian PPN regulation generally applies VAT to service charge. Merchants can override if their contract specifies otherwise.

**All amounts stored as integers (IDR, no decimals).** Rounding uses `Math.round()` (round half up).

**Status:** Decided.

---

### ADR-014: Multiple Orders per CustomerSession

**Decision:** A `CustomerSession` supports multiple `Order` records. Customers can order mains, then later add desserts or drinks — each becomes a new `Order` linked to the same `CustomerSession`.

**Rationale:** This is normal Indonesian restaurant behavior. A group orders food, eats, then orders drinks or desserts as a second round.

**Status:** Decided.

---

### ADR-015: QR Token Strategy — Static Table Token + Short-Lived Signed URL

**Decision:** Each `Table` has a permanent `tableToken` (UUID, never changes unless staff explicitly rotate it). The QR code encodes a redirect URL: `https://menu.fbqr.app/r/{tableToken}`. When scanned, this redirect endpoint generates a short-lived signed URL with a 24-hour `sig` parameter and forwards the customer.

`sig = HMAC-SHA256(tableToken + ":" + expiryTimestamp, SERVER_SECRET)`

**Why not put the sig in the QR code itself?** The printed QR cannot be updated dynamically. Using a redirect endpoint means the physical QR never changes; the security layer is server-side.

**Redirect handler specification (5 steps):**
1. Lookup `Table` by `tableToken` — return human-friendly HTML error page (not JSON 4xx) for: not found, CLOSED table, RESERVED table, DIRTY table (when `enableDirtyState = true`), or non-ACTIVE restaurant
2. Get `restaurantId` and `tableId` via `Table → Branch → Restaurant`
3. Generate `expiryTimestamp = now + 24h` (Unix seconds)
4. Generate `sig = HMAC-SHA256(tableToken + ":" + expiryTimestamp, SERVER_SECRET)`
5. Redirect (HTTP 302) to: `https://menu.fbqr.app/{restaurantId}/{tableId}?token={tableToken}&sig={sig}&exp={expiryTimestamp}`

**Fallback:** Invalid/expired `sig` on the menu app redirects back to `/r/{tableToken}` — legitimate customers are never permanently locked out.

**Status:** Decided.

---

### ADR-016: Configurable Payment Timing (Pay-First vs Pay-at-Cashier)

**Decision:** Payment timing is configurable per restaurant via `MerchantSettings.paymentMode`:
- `PAY_FIRST` (default): customer must pay via Midtrans before order reaches kitchen
- `PAY_AT_CASHIER`: customer orders → alert sent to merchant-pos cash queue → cashier collects cash and taps [Confirm] → Order pushed to kitchen

**Critical rule:** **The kitchen never receives a PAY_AT_CASHIER order without explicit cashier confirmation.** This is identical in principle to the Midtrans webhook gate — the confirming party is the cashier, but the kitchen sees no order until confirmation occurs in both modes.

**Status:** Decided.

---

### ADR-017: Keeping `Restaurant` as the Model Name (not `RestaurantBrand`)

**Challenge:** Architecture review v1.2 suggested renaming `Restaurant` to `RestaurantBrand` to clarify the 3-level hierarchy.

**Decision: REJECTED — keep `Restaurant` as the model name.**

**Reasoning:**
1. `Restaurant` is the idiomatic name in every major F&B software system.
2. `restaurantBrandId` is 30% more verbose than `restaurantId` with no functional benefit — it makes every query, join, and API response noisier.
3. The Brand vs Location distinction is explained in the documentation. Model naming is not the primary place to communicate design intent.

**Future agents:** Do not rename `Restaurant` to `RestaurantBrand` in schema or code.

**Status:** Decided. Challenge considered and rejected.

---

### ADR-018: Review Rebuttals — Items Already Addressed

This ADR documents items previously raised and resolved so future AI agents do not re-raise them.

**Key resolved issues (see CLAUDE.md ADR-018 for the full table):**
- Payment method enum mismatch (GOPAY/OVO vs EWALLET) → fixed: `method` + `provider` fields on `Payment`
- QR URL sharing/abuse → fixed: ADR-015 (static QR + 24h signed URL)
- stockCount deducted at PENDING (DoS vulnerability) → fixed: deduction at CONFIRMED with atomic `WHERE stockCount >= qty`
- PENDING_CASH orders expired by digital expiry cron → fixed: cron filters via `Payment.method != 'CASH'`
- Sold-out-at-webhook auto-refund causes 2-14 day delay → fixed: push order CONFIRMED with ⚠️ flag; cashier offers substitution
- iOS Web Push requires PWA → fixed: documented in push notifications section
- Service charge taxability unspecified → fixed: `taxOnServiceCharge: true` default

**Status:** Informational. See `CLAUDE.md` ADR-018 for the complete historical table.

---

### ADR-019: Per-Branch Separate Menus — Rejected; Correct Pattern is Per-Branch Availability Override

**Challenge received:** Chain owner requested "Branch A menu, Branch B menu" — separate independent menus per branch.

**Decision: REJECTED — menu remains shared at restaurant level.**

**Reasoning:**
1. **The 1 Restaurant = 1 Menu invariant is a core architectural pillar.** A chain owner managing 6 branches would spend more time on menu management than running the restaurant if each branch had its own menu. Central menu changes (price update, new item, seasonal promotion) propagate to all branches instantly.
2. **The legitimate use case is item availability, not menu structure.** "Branch A ran out of ayam goreng today" is solved by per-branch availability override, not menu duplication.
3. **`BranchMenuOverride` junction model is the correct pattern:** `(branchId FK, menuItemId FK, isAvailable bool)` — toggling an item off at a specific branch without affecting others.

**Future agents:** Do not add per-branch menu duplication to the schema. Implement `BranchMenuOverride` in Phase 2 for per-branch item availability control.

**Status:** Decided.

---

### ADR-020: UI Framework — shadcn/ui + Tailwind; CoreUI and AdminLTE Rejected

**Decision:** Use Tailwind CSS + shadcn/ui as the single UI system across all apps. Use shadcn/ui Blocks for admin layout scaffolding. Do not use CoreUI, AdminLTE, or any Bootstrap-based admin template.

**Alternatives considered:**

| Option | Reason rejected |
|---|---|
| **CoreUI** | Bootstrap-based — conflicts with Tailwind CSS (competing reset stylesheets, specificity wars, doubled bundle) |
| **AdminLTE** | Bootstrap 4/5 + jQuery. jQuery is incompatible with React's virtual DOM model. No viable Next.js App Router integration. |
| **Ant Design** | Brings its own design system (not Tailwind-compatible). 500kb+ bundle. |
| **Material UI (MUI)** | Own design system, not Tailwind-compatible, emotion/styled-components dependency. |

**Why shadcn/ui wins:**
1. **You own the code** — shadcn copies component source into your repo. No external dependency to upgrade or break.
2. **Tailwind-native** — every component is Tailwind classes. No specificity conflicts.
3. **Next.js App Router native** — server components, `use client` boundaries, all handled correctly.
4. **shadcn Blocks** — full dashboard page templates added in 2024; replaces CoreUI/AdminLTE's pre-built admin chrome.
5. **`apps/menu` compatibility** — the same component system works for both admin and customer apps.

**Complementary libraries:** TanStack Table (data grids), Recharts (analytics charts via shadcn Charts), Framer Motion (animation), Sonner (toasts).

**Future agents:** Do not propose replacing Tailwind with Bootstrap. Do not suggest adding CoreUI or AdminLTE.

**Status:** Decided.

---

### ADR-021: Public API Design — REST + Webhooks, Bearer Token Auth, No GraphQL

**Decision:** The FBQR public API is a REST API with bearer token authentication. Webhook subscriptions for event-driven integration. No GraphQL. No OAuth2 for server-to-server integrations.

**Why REST over GraphQL:**
1. **Target audience** — Accurate Online, Jurnal.id, and inventory systems used by Indonesian SMEs are built by teams that know REST. GraphQL adoption in Indonesia's SME software ecosystem is minimal.
2. **Simplicity** — a REST API with 10 endpoints is easier to document, easier to debug ("just curl it").
3. **Caching** — REST responses can be cached at the edge; GraphQL POST requests cannot without additional tooling.

**Why bearer token over OAuth2:**
- Use case is **server-to-server** — merchants are connecting their own server to their own FBQR data. Bearer tokens are the correct, simple mechanism.
- Bearer tokens over HTTPS + short expiry + per-permission scope + revocation is equivalent security to OAuth2 client credentials for this use case.

**Versioning strategy:** `/api/v1/` prefix. Version bump only on breaking changes. Non-breaking additions (new fields, new endpoints) added without version bump. Deprecated versions maintained 6 months minimum.

**Status:** Decided.

---

### ADR-022: Internationalisation (i18n) — next-intl, Bahasa Indonesia Default, No Hardcoded Strings

**Context:** FBQR's primary market is Indonesia. All UI text was initially written in Bahasa Indonesia. The question arose: should Indonesian text be hardcoded in JSX, or should the app support multiple locales from day one?

**Decision:** Use `next-intl` from day one across all apps (`apps/web` and `apps/menu`). Bahasa Indonesia (`id`) is the **default locale**. English (`en`) is the first additional locale and will be generated via AI translation of the `id` locale files during development.

**Rationale:**
1. **Refactoring cost is higher than setup cost.** Adding i18n after hundreds of hardcoded strings across two Next.js apps is a major engineering effort. Paying the setup cost at Step 1 eliminates this debt.
2. **`apps/menu` is the highest-priority surface for multi-language.** Tourists, expatriates, and international chain locations all need English menus. Delivering this as a Phase 1 capability (not Phase 2 backlog) is a competitive differentiator.
3. **AI translation is fast and good enough for initial locales.** Translating well-structured `id` locale JSON files to English takes minutes with an LLM and produces acceptable quality for Phase 1. Human review can refine strings without touching any code.
4. **Locale structure enforces consistency.** All user-facing strings live in `messages/{locale}.json` files — no hunting for hardcoded copy across dozens of components.

**Rules for all AI agents:**
- **Never hardcode Indonesian (or any language) strings in JSX/TSX.** Every user-visible string must come from `useTranslations()` or `getTranslations()`.
- **Add new strings to `messages/id.json` first.** The Indonesian copy is the source of truth; other locales derive from it.
- **Run `next-intl`'s type-safe message keys** — use the typed `t()` hook to catch missing keys at build time.
- **Locale scope:** `apps/web` serves merchants and FBQRSYS admins (English + Indonesian). `apps/menu` serves customers (Indonesian primary, English minimum, extensible to others).
- **DO NOT** use `next/router` locale switching — use `next-intl`'s `Link` and `redirect` helpers which handle locale-aware routing.

**Locale file locations:**
```
apps/web/messages/id.json    # Bahasa Indonesia (source of truth)
apps/web/messages/en.json    # English (AI-translated from id.json)
apps/menu/messages/id.json
apps/menu/messages/en.json
```

**What this decision does NOT cover:**
- Per-item menu translations (each `MenuItem` having `nameEn`, `descriptionEn` fields) — this is a separate Phase 2 feature (see Feature Backlog: "Multi-language menu items"). The `next-intl` decision covers UI chrome, not menu content.
- RTL language support — not planned.

**Status:** Decided.

---

### ADR-023: Database Connection Pooling — PgBouncer (Transaction Mode) for Serverless

**Context:** Vercel serverless functions open a new database connection on every invocation. At 50 concurrent customer requests (lunch rush), that is 50+ simultaneous connections. Supabase free tier allows ~60 total Postgres connections. Without pooling, the app will return `"too many connections"` errors at modest load.

**Decision:** Use Supabase's built-in **PgBouncer in Transaction mode** as the connection pooler for all serverless runtime code. Use the direct Postgres connection string only for Prisma migrations.

**Implementation — two connection strings are required:**

```env
# Pooled connection (PgBouncer) — used by all serverless API routes and server actions
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct connection — used ONLY by Prisma migrations (prisma migrate deploy/dev)
DATABASE_DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].supabase.com:5432/postgres
```

**`schema.prisma` configuration:**

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")        // pooled — used at runtime
  directUrl = env("DATABASE_DIRECT_URL") // direct — used only for migrations
}
```

**Rules for all AI agents:**
- `DATABASE_URL` must always point to the PgBouncer (port 6543, `?pgbouncer=true`).
- `DATABASE_DIRECT_URL` must point to the direct connection (port 5432, no pgbouncer param).
- **Never** remove `directUrl` from `schema.prisma` — Prisma migrations fail over PgBouncer (Transaction mode does not support DDL statement sequences).
- In `packages/database/src/index.ts`, export the PrismaClient singleton with the standard pattern to prevent multiple instances in development:
  ```ts
  import { PrismaClient } from '@prisma/client'
  const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
  export const prisma = globalForPrisma.prisma ?? new PrismaClient()
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
  ```

**Supabase PgBouncer connection string location:** Supabase Dashboard → Project → Settings → Database → Connection string → select "Transaction" mode.

**Status:** Decided. Must be implemented in Step 1 before any DB work begins.

---

### ADR-024: Mandatory Zod Validation on All API Routes and Server Actions

**Context:** TypeScript types are compile-time only. Prisma types are compile-time only. Neither prevents a malformed HTTP request body (e.g. `price: -50000`, `qty: 9999999`, `status: "HACKED"`) from reaching the database layer. In a payment system, malformed inputs without server-side validation create data corruption and potential exploits.

**Decision:** Every API route handler and every Next.js server action **must** validate all inputs with a Zod schema before any business logic runs. This is a hard rule, not a guideline.

**Pattern for API routes (`apps/web/app/api/...`):**

```ts
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

const CreateOrderSchema = z.object({
  customerSessionId: z.string().uuid(),
  items: z.array(z.object({
    menuItemId: z.string().uuid(),
    qty: z.number().int().min(1).max(20),
    variantId: z.string().uuid().optional(),
    addonIds: z.array(z.string().uuid()).max(10).default([]),
  })).min(1).max(20),
  customerNote: z.string().max(200).optional(),
  idempotencyKey: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = CreateOrderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  // parsed.data is now fully typed and validated
  const { customerSessionId, items, customerNote, idempotencyKey } = parsed.data
  // ... business logic
}
```

**Pattern for server actions:**

```ts
'use server'
import { z } from 'zod'

const UpdateMenuItemSchema = z.object({
  id: z.string().uuid(),
  price: z.number().int().min(0).max(100_000_000),
  isAvailable: z.boolean(),
})

export async function updateMenuItem(formData: unknown) {
  const parsed = UpdateMenuItemSchema.safeParse(formData)
  if (!parsed.success) throw new Error('Invalid input')
  // ...
}
```

**Standard error response shape (all APIs must use this):**

```ts
// Success
{ data: T }

// Validation error (400)
{ error: { code: 'VALIDATION_ERROR', fields: ZodError.flatten() } }

// Auth error (401/403)
{ error: { code: 'UNAUTHORIZED' | 'FORBIDDEN', message: string } }

// Business logic error (422)
{ error: { code: string, message: string } }  // e.g. { code: 'ORDERING_PAUSED', message: '...' }

// Server error (500)
{ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } }
// Never expose stack traces or DB errors to the client
```

**Rules for all AI agents:**
- `safeParse()` not `parse()` — never let a Zod throw propagate to the client unhandled.
- Validate at the **HTTP boundary** — not deeper in the call stack. Validation lives in the route/action handler.
- Zod schemas for shared entities (Order, MenuItem, etc.) belong in `packages/types/src/schemas/` and are imported by both apps.
- The same Zod schema used for API validation **is** the source for `zod-to-openapi` Phase 2 API docs — no duplication.
- Prisma's `@db.VarChar(n)` constraints are DB-layer enforcement only; Zod enforces them at the API layer first.

**Status:** Decided. Apply from Step 3 onward on every new route/action.

---

### ADR-026: BY_WEIGHT Frontend UI is Phase 1.5 — Schema in Phase 1, UI in Phase 1.5

**Context:** BY_WEIGHT pricing with Midtrans multi-stage payments (DEPOSIT → BALANCE_CHARGE / BALANCE_REFUND), the KDS weight-entry numpad, and the customer-side deposit-then-settle flow introduce significant state-machine complexity. This complexity is real and valuable for seafood restaurants, warung ikan, and live-weight meat counters — but it is not needed to launch the core product. A seafood restaurant can launch Day 1 using Fixed Price items with size variants ("Kepiting Medium Rp 150k", "Kepiting Large Rp 200k", "Kepiting XL Rp 200k+") and upgrade to BY_WEIGHT once the platform is stable.

**Decision:** Split the BY_WEIGHT feature across two sub-phases:

| What | When | Why |
|---|---|---|
| Prisma schema fields (`priceType`, `pricePerUnit`, `unitLabel`, `depositAmount`, `OrderItem.needsWeighing`, `weightValue`, `weightEnteredByStaffId`) | Phase 1 (Step 2) | Adding these columns to a populated DB later is painful. Stub now while tables are empty. |
| API endpoints for weight entry, BALANCE_CHARGE, BALANCE_REFUND | Phase 1 (Step 15) | Midtrans payment integration step — implement the full payment flow once. Do not partially implement it. |
| Customer-facing deposit UI in `apps/menu` | **Phase 1.5** (after Phase 1 launch) | Customer sees a fixed price at checkout. BY_WEIGHT items not shown to customers until Phase 1.5 merchant flag enabled. |
| KDS weight-entry numpad modal | **Phase 1.5** | Kitchen display enhancement. Kitchen staff continue using the POS for weight entry in Phase 1. |
| Merchant-pos "item priceType toggle" UI | **Phase 1.5** | Menu item form shows `priceType` dropdown but it is disabled for BY_WEIGHT until the Phase 1.5 flag is live. |

**Phase 1.5 gate:** `MerchantSettings.byWeightEnabled` (bool, default `false`). When `false`:
- `apps/menu` hides all BY_WEIGHT items from the customer menu (they are invisible, not just unavailable).
- The Order creation API rejects any OrderItem with `priceType = BY_WEIGHT` unless `byWeightEnabled = true`.
- FBQRSYS enables this flag per merchant when Phase 1.5 is ready.
- Merchants who urgently need BY_WEIGHT in Phase 1 can request early-access via FBQRSYS.

**Rationale:** This prevents the BY_WEIGHT complexity from blocking or destabilizing the Phase 1 launch for the 90% of merchants that only need Fixed Price. Seafood restaurants can self-onboard with Fixed Price and migrate items to BY_WEIGHT in Phase 1.5 without any data migration — the schema fields already exist.

**Status:** Decided. Add `byWeightEnabled` to `MerchantSettings` Phase 1 schema (nullable → default false). Implement in Phase 1.5 after Phase 1 launch validation.

---

### ADR-025: Late Webhook Revival — Payment Arrives After Order Timeout

**Context:** A customer pays via Midtrans, the payment is processed, but the Midtrans webhook to FBQR is delayed (e.g. network error, Midtrans retry delay). FBQR's Order Expiry Cron transitions the order `PENDING → EXPIRED` before the webhook arrives. Later — potentially 5 to 60 minutes later — the webhook arrives with a valid `SUCCESS` status.

**Decision:** If all revival conditions pass, revive the order: run the full standard webhook transaction (stock decrement, Order → CONFIRMED, Payment → SUCCESS, push to kitchen via Supabase Realtime, notify merchant).

**Revival conditions (all must pass):**
1. The elapsed time since expiry is ≤ `MerchantSettings.lateWebhookWindowMinutes` (default: 60 minutes).
2. The Restaurant is not `SUSPENDED` or `CANCELLED`.
3. The Table does **not** have a new `ACTIVE` `CustomerSession` (the table has not been reseated since the order expired).
4. The original `CustomerSession` still exists in EXPIRED or COMPLETED state.

**If any condition fails:** Auto-refund via Midtrans Refund API + notify merchant + log `AuditLog(action: LATE_WEBHOOK_REFUND)`.

**If all conditions pass:** Revive + log `AuditLog(action: LATE_WEBHOOK_REVIVAL)`.

**If the webhook arrives after `lateWebhookWindowMinutes` has elapsed:** Always auto-refund, regardless of table state. Kitchen may be closed; food may have been restocked.

**Implementation:** See `docs/customer.md` § Late Webhook Handling for the complete flow and SQL. The `lateWebhookWindowMinutes` setting is configurable per merchant — an always-open café with a reliable connection may lower this to 15 minutes; a high-traffic restaurant may increase it to 90 minutes.

**Status:** Decided. Implement in Step 15 (Midtrans integration).

---

## CI/CD Pipeline

> **For AI agents:** Set this up in Step 1 alongside the monorepo scaffold. Every commit to any branch should be validated automatically.

### GitHub Actions Workflows

**File: `.github/workflows/ci.yml`** — runs on every push and PR:

```yaml
jobs:
  validate:
    steps:
      - Checkout
      - Install dependencies (npm ci)
      - Run TypeScript check (npm run typecheck)
      - Run ESLint (npm run lint)
      - Run unit + integration tests (npm run test)
      - Build all apps (npm run build)
```

**File: `.github/workflows/deploy-web.yml`** — runs on push to `master`:
- Vercel deploys `apps/web` automatically via Vercel Git integration (no manual step needed)
- Post-deploy: run smoke test against `NEXT_PUBLIC_WEB_APP_URL/api/health`

**File: `.github/workflows/deploy-menu.yml`** — runs on push to `master`:
- Vercel deploys `apps/menu` automatically via Vercel Git integration
- Post-deploy: run smoke test against `NEXT_PUBLIC_MENU_APP_URL/api/health`

### Branch Protection (GitHub Settings)

Set on `master`:
- Require PR before merging (no direct push)
- Require CI to pass before merge
- Require at least 1 approval (if team grows)

### Database Migrations in Production

Never run `prisma migrate dev` in production. The correct flow:

```bash
# In GitHub Actions (or manually before deploy):
npx prisma migrate deploy   # applies pending migrations
npx prisma generate         # regenerates client
```

Add `prisma migrate deploy` as a build step in the Vercel project settings (`Build Command`):
```
npx prisma migrate deploy && npm run build
```

Vercel will run this before the Next.js build on every deploy. Migrations are idempotent — running `deploy` twice is safe.

---

## Testing Strategy

> **For AI agents:** Every step must include tests for its core logic. This is a payment-critical system — the order state machine and Midtrans webhook handler must be tested before shipping.

### Testing Stack

| Tool | Purpose |
|---|---|
| [Vitest](https://vitest.dev/) | Unit and integration tests — fast, TypeScript-native, compatible with Turborepo |
| [Playwright](https://playwright.dev/) | E2E tests — full browser automation; mobile viewport for `apps/menu` |
| [MSW (Mock Service Worker)](https://mswjs.io/) | Mock Midtrans API and Supabase Realtime in integration tests |

### What Must Be Tested Per Step

| Step | Required tests |
|---|---|
| **Step 2 (schema)** | Seed script idempotency (run twice = same result) |
| **Step 3 (auth)** | JWT sign/verify; PIN hash/compare; session expiry |
| **Step 4 (RBAC)** | `requirePermission()` — allow with correct permission, reject without; test each permission |
| **Step 6 (billing cron)** | Each cron step in isolation with mocked DB; double-fire idempotency; suspension trigger |
| **Step 10 (QR)** | HMAC signature generation and verification; expired sig rejection; invalid token rejection |
| **Step 12 (QR flow)** | Session creation; session resume with `tableId` guard; cross-table leakage prevention |
| **Step 15 (payment)** | Midtrans webhook handler — valid sig; duplicate webhook idempotency; atomic `WHERE PENDING`; stock decrement; full rollback on failure |
| **Step 15 (payment)** | Pre-invoice computation: tax, service charge, rounding rules; BY_WEIGHT deposit display |
| **Step 16 (order tracking)** | Order state machine — all valid transitions allowed; all invalid transitions rejected |
| **Step 20 (kitchen)** | Real-time event shape from Supabase channel matches what kitchen display subscribes to |

### Test Conventions

- **Unit tests:** Pure functions only (validators, state machine transitions, price calculations, HMAC signing). No DB.
- **Integration tests:** DB interactions with a real test database (separate `TEST_DATABASE_URL`). Run with `NODE_ENV=test`. Reset between test runs with `prisma migrate reset --force`.
- **E2E tests (Playwright):** Full user journeys — scan QR → place order → kitchen display shows order. Run against local dev server or staging.
- **Test file location:** Co-locate with the code being tested: `src/lib/payment.ts` → `src/lib/payment.test.ts`.
- **CI gate:** Unit + integration tests run on every PR. E2E runs on merge to `master` only (slower).

### The One Test That Must Never Be Skipped

The Midtrans webhook handler must be integration-tested with:
1. A valid signature → order confirmed
2. A duplicate signature (same `midtransTransactionId`) → HTTP 200, no double-confirm
3. An invalid signature → HTTP 403, no state change
4. A `settlement` status → order confirmed (not just `success`)
5. A `deny` / `cancel` / `expire` status → order cancelled
6. Concurrent identical webhooks → only one confirmation (race condition test)

This test prevents the most expensive class of production bug in payment systems.

---

## Competitive Intelligence — China & Singapore QR Systems

> This section documents research into the two most mature QR ordering markets. It informs 10 direct product decisions for FBQR.

### China (WeChat / Alipay / Meituan)

- **98% of Chinese restaurants** use QR-based ordering
- Ordering flows entirely through **WeChat or Alipay Mini Programs** — no browser, no install
- Payment fees: WeChat Pay 0.6%, Alipay 0.55%
- **Group ordering** (collaborative shared cart): Multiple phones at the same table add items simultaneously; each person's avatar appears next to their items — the most socially natural group dining UX
- **AI capabilities:** Meituan's "Xiaomei" voice agent, personalized flash coupons, demand forecasting; Ele.me's recommendation engine uses weather + location. Shanghai targets 70%+ AI penetration in F&B by 2028
- **Loyalty:** Deeply integrated into WeChat Wallet; points, tiers, and coupons in a unified view. Alipay loyalty reported 47.5% repurchase rate lift for participating merchants
- **Kitchen:** Multi-station routing (wok / cold kitchen / beverages), multilingual ticket printing, 300+ POS config options (Eats365), real-time inventory auto-deduction
- **Weaknesses:** Forced data collection (phone number + WeChat follow required before ordering), QR code security vulnerabilities (spoofing/phishing incidents), elderly digital exclusion, platform fragmentation

### Singapore (SGQR / TabSquare / Foodpanda)

- **SGQR:** World's first unified QR label — one code, 22+ payment schemes (GrabPay, PayLah!, NETS, PayNow, WeChat Pay, etc.)
- Payment fees: PayNow personal QR = **0% (free)**, NETS SGQR = 0.5–0.8% — comparable to QRIS Indonesia 0.7%
- **Government digitisation (Hawkers Go Digital):** 11,500+ hawker stalls enrolled, 33% YoY transaction value growth. Key lesson: financial subsidies + human ambassador onboarding drove adoption, not just UX quality
- **TabSquare (AI-powered, market leader):** Documented **25%+ lift in average order value** from AI SmartMenu recommendations. Dynamic upselling produced 10% upsell revenue increase in 6 months at local chains. 12M diners/yr, SGD 200M GMV
- **Foodpanda + TabSquare dine-in:** 8,000+ restaurants across 7 SEA countries. 15–25% dine-in discounts used as customer acquisition tool
- **Weaknesses:** No super-app equivalent to WeChat; 80% of transactions still offline; back-of-house tech lag for SMEs; government subsidy cliff (NETS MDR subsidy ends mid-2026)

### 10 Direct Implications for FBQR

| # | Insight | FBQR Action |
|---|---|---|
| 1 | **Table-scoped QR is the right architecture** | ✅ Already designed — unique UUID per table, restaurant+table encoded in URL |
| 2 | **Zero-install is non-negotiable** — download requirements destroy conversion | ✅ Browser-based `apps/menu` — no app install required |
| 3 | **Group ordering is a high-value differentiator** — China's collaborative cart fits Indonesia's group dining culture | 🔲 Backlog: shared cart with per-person item attribution |
| 4 | **QRIS at 0.7% is competitive** — WeChat Pay 0.6%, SGQR 0.5–0.8% — on par with global best | ✅ Midtrans QRIS as default payment method |
| 5 | **AI upselling has proven, measurable ROI** — TabSquare 25% AOV lift is the strongest industry data point | ✅ AI recommendation engine planned (all 4 types, merchant-configurable) |
| 6 | **Forced data collection is a trust and reputation risk** — China's backlash is a clear warning | ✅ Customer login is opt-in; anonymous QR sessions are first-class |
| 7 | **Loyalty unification is a market gap in SEA** — Singapore's fragmented loyalty is an opportunity | ✅ FBQR loyalty layer tied to customer account, not platform-specific |
| 8 | **Kitchen multi-station routing matters at scale** | ✅ Designed — see ADR-006; category-level assignment, per-item override, station snapshot on OrderItem |
| 9 | **Warung/informal segment needs a simplified mode** — Singapore's hawker programme confirms this | 🔲 Backlog: "Lite mode" for single-stall operators |
| 10 | **Privacy by design must be foundational** | 🔲 Backlog: privacy consent flow, clear opt-in for loyalty data |

---

## Feature Backlog

Features organized by impact. 🚨 = deal-breaker for at least one persona. ⚠️ = high friction. 📋 = nice-to-have.

| Feature | Level | Persona | Notes |
|---|---|---|---|
| **Takeaway / counter mode** | ✅ Done (Step 17) | All | Documented in `docs/merchant.md` and `docs/customer.md` |
| **Cash / "Pay at Counter"** | ✅ Done (Step 15) | Warung, Chain | `CASH` payment method, cashier marks paid manually |
| **Multi-branch per merchant** | ✅ Done (EOI flow) | Chain | Documented in `docs/merchant.md` |
| **Delivery platform integration** | 🚨 Phase 2 (Step 22) | Chain | GrabFood/GoFood/ShopeeFood webhook → unified kitchen |
| **Permanent free / Warung tier** | ✅ Designed | Warung | Documented in `docs/merchant.md` |
| **Push/sound notifications** | ✅ Designed (Step 18) | All | Web Push API + in-app audio |
| **Group ordering (collaborative cart)** | 📋 Backlog | All | Multiple phones, shared cart, per-person attribution |
| **Printer integration** (kitchen tickets + receipts) | ✅ Phase 1 (Step 20) | All | `node-thermal-printer`; kitchen ticket on order CONFIRMED; customer receipt on payment confirmed |
| **Menu import / CSV migration** | ✅ Designed (Step 9) | Chain | CSV template + bulk entry UI |
| **ROI analytics dashboard** | ✅ Designed (Step 21) | Chain | Documented in `docs/merchant.md` |
| **Accounting export** | ✅ Designed (Step 21) | Chain | Excel/CSV; Accurate/Jurnal.id integration Phase 2 |
| **WhatsApp Business integration** | ⚠️ Phase 2 (Step 27) | All | Order notifications, invoice sharing via WA |
| **Refund / cancellation flow** | ⚠️ Phase 1 (Step 15) | All | Midtrans refund API; reflected in reports |
| **Analytics event tracking** | 📋 Phase 2 | Chain | `AnalyticsEvent` model stubbed in Phase 1 Prisma |
| **Split bill / multiple payments** | ✅ Phase 1 (Step 15) | All | Schema supports it: `Payment[]` on `Order`; Patungan split-payment UI built in Step 15 |
| **Offline mode (merchant-pos / kitchen)** | ✅ Phase 1 (Steps 9, 20) | All | PWA service worker + offline fallback page; merchant-pos (Step 9), kitchen display (Step 20); sync on reconnect |
| **Indonesian tax compliance (NPWP / Faktur Pajak)** | 📋 Phase 2 | Chain | `taxId` (NPWP) on `Merchant`; corporate invoice support |
| **Hidang / hybrid ordering mode** | ⚠️ Phase 2 | Seafood | Padang-style — schema supports via PAY_AT_CASHIER; UI deferred |
| **Thermal label printing for cup/item labels** | ⚠️ Phase 2 | Warung | ESC/POS label printer for boba kiosk; distinct from kitchen tickets |
| **Booking deposit / down payment** | ⚠️ Phase 2 | Chain | Requires reservation system + partial Midtrans charge |
| **Per-branch item availability override** | ✅ Phase 1 (Step 9) | Chain | `BranchMenuOverride` junction model + UI toggle built in Step 9 (menu management) |
| **Waiter-assisted / staff order mode** | ✅ Phase 1 (Step 10) | Chain | Staff inputs order via POS on behalf of customer; no new schema — reuses PAY_AT_CASHIER + `Order.placedByStaffId` |
| **Inventory / COGS tracking** | 📋 Out of scope | Chain | ERP-level; recommend Accurate Online / Jurnal.id integration |
| **Privacy consent flow** | 📋 Phase 2 | All | Data collection opt-in; minimal principle; PDP Law compliance |
| **Table reservation** | 📋 Phase 2 | Chain | `Reservation` model stubbed in Phase 1 Prisma |
| **Staff shift management** | 📋 Phase 2 | Chain | Clock-in/out, shift reports |
| **Multi-language menu items** | 📋 Phase 2 | Chain | Per-item name/description in multiple languages |
| **Shareable menu URL** | ✅ Phase 1 (Step 12) | All | Browse-only route `/menu/{restaurantId}` — view menu without QR scan; no ordering capability |
| **Branded QR code design** | 📋 Phase 2 | All | Styled QR with restaurant logo |

---

## Open Questions for Future AI Agents

The following are areas where a future AI agent is explicitly invited to propose an approach:

| Area | Current state | Question |
|---|---|---|
| **Table-level rate limiting** | Not yet specified | What is the right limit (N pending orders per table per hour) to balance fraud prevention against legitimate multi-round ordering? Suggested starting point: max 5 PENDING orders per session, configurable per merchant. |
| **Anomaly detection for fake orders** | Not designed | Should FBQR auto-flag suspicious sessions (e.g. 10+ orders in 5 minutes from one table token)? What should the trigger threshold and response be? |
| **Accurate / Jurnal.id accounting integration** | Phase 2 only | Which integration method (API, CSV export, webhook) best fits Accurate Online's API capabilities? |
| **Delivery platform webhook authentication** | Not designed yet | GrabFood: HMAC-SHA256 shared secret. GoFood: OAuth 2.0 bearer token. ShopeeFood: similar. Implement per-platform at Step 22 per each platform's current API documentation. |

---

## Cross-References

- Full schema details → `docs/data-models.md`
- Merchant POS, onboarding, kitchen → `docs/merchant.md`
- Customer ordering flow (`apps/menu`) → `docs/customer.md`
- FBQRSYS platform admin, billing, API → `docs/platform-owner.md`
- Authoritative source of truth for all specs → `CLAUDE.md`
