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
| **Push notifications** | Web Push API (browser-native) | New order alerts to merchant-pos and merchant-kitchen |
| **QR Codes** | [`qrcode`](https://www.npmjs.com/package/qrcode) npm package | Generate per-table QR codes |
| **PDF** | [`@react-pdf/renderer`](https://react-pdf.org/) | Invoice and pre-invoice generation |
| **Email** | [Resend](https://resend.com/) | Transactional email — billing reminders, invoices, notifications |
| **Scheduled Jobs** | [Vercel Cron](https://vercel.com/docs/cron-jobs) | Daily billing checks, auto-lock overdue accounts |
| **File Storage** | Supabase Storage | Menu item images, restaurant logos, invoice PDFs |
| **API docs** | [Zod-to-OpenAPI](https://github.com/asteasolutions/zod-to-openapi) + Swagger UI | Auto-generated from Zod schemas; served at `/api/docs` (Phase 2) |
| **i18n** | [next-intl](https://next-intl-docs.vercel.app/) | Bahasa Indonesia default; multi-language expansion path |
| **Hosting** | [Vercel](https://vercel.com/) (Next.js) + [Supabase](https://supabase.com/) | Generous free tiers, auto-scaling |

> **Architecture note:** This project uses a **modular monolith** (not microservices). The Turborepo structure enforces clean domain boundaries between sub-systems. Individual apps can be extracted into independent services later if scaling demands it.
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

| Feature | Level | Notes |
|---|---|---|
| **Takeaway / counter mode** | ✅ Done (Step 17) | Documented in `docs/merchant.md` and `docs/customer.md` |
| **Cash / "Pay at Counter"** | ✅ Done (Step 15) | `CASH` payment method, cashier marks paid manually |
| **Multi-branch per merchant** | ✅ Done (EOI flow) | Documented in `docs/merchant.md` |
| **Delivery platform integration** | 🚨 Phase 2 (Step 22) | GrabFood/GoFood/ShopeeFood webhook → unified kitchen |
| **Permanent free / Warung tier** | ✅ Designed | Documented in `docs/merchant.md` |
| **Push/sound notifications** | ✅ Designed (Step 18) | Web Push API + in-app audio |
| **Group ordering (collaborative cart)** | 📋 Backlog | Multiple phones, shared cart, per-person attribution |
| **Printer integration** | ⚠️ Phase 2 | `node-thermal-printer`; kitchen ticket + cup label printing |
| **Menu import / CSV migration** | ✅ Designed (Step 9) | CSV template + bulk entry UI |
| **ROI analytics dashboard** | ✅ Designed (Step 21) | Documented in `docs/merchant.md` |
| **Accounting export** | ✅ Designed (Step 21) | Excel/CSV; Accurate/Jurnal.id integration Phase 2 |
| **WhatsApp Business integration** | ⚠️ Phase 2 (Step 27) | Order notifications, invoice sharing via WA |
| **Refund / cancellation flow** | ⚠️ Phase 1 (Step 15) | Midtrans refund API; reflected in reports |
| **Analytics event tracking** | 📋 Phase 2 | `AnalyticsEvent` model stubbed in Phase 1 Prisma |
| **Split bill / multiple payments** | 📋 Phase 2 | Schema supports it: `Payment[]` on `Order` |
| **Offline mode (merchant-pos / kitchen)** | ⚠️ Phase 2 | PWA service worker; sync on reconnect |
| **Indonesian tax compliance (NPWP / Faktur Pajak)** | 📋 Phase 2 | `taxId` (NPWP) on `Merchant`; corporate invoice support |
| **Hidang / hybrid ordering mode** | ⚠️ Phase 2 | Padang-style — schema supports via PAY_AT_CASHIER; UI deferred |
| **Thermal label printing for cup/item labels** | ⚠️ Phase 2 | ESC/POS label printer for boba kiosk; distinct from kitchen tickets |
| **Booking deposit / down payment** | ⚠️ Phase 2 | Requires reservation system + partial Midtrans charge |
| **Per-branch item availability override** | ⚠️ Phase 2 | `BranchMenuOverride` junction model stubbed in Phase 1 Prisma |
| **Waiter-assisted / staff order mode** | ⚠️ Phase 2 | Staff inputs order on behalf of customer; schema supports via PAY_AT_CASHIER |
| **Inventory / COGS tracking** | 📋 Out of scope | ERP-level; recommend Accurate Online / Jurnal.id integration |
| **Privacy consent flow** | 📋 Phase 2 | Data collection opt-in; minimal principle; PDP Law compliance |
| **Table reservation** | 📋 Phase 2 | `Reservation` model stubbed in Phase 1 Prisma |
| **Staff shift management** | 📋 Phase 2 | Clock-in/out, shift reports |
| **Multi-language menu items** | 📋 Phase 2 | Per-item name/description in multiple languages |
| **Shareable menu URL** | 📋 Phase 2 | Digital menu link without scanning |
| **Branded QR code design** | 📋 Phase 2 | Styled QR with restaurant logo |

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
