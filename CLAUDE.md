# CLAUDE.md

This is the **command center** for AI agents working on this repository. It contains the current state, phase tracker, operating protocols, and operational conventions. All detailed specifications live in `docs/` — read the relevant file before writing any code.

---

## CURRENT STATE — Read This First

> **Every AI agent must read this block before doing anything else.**
> Update this block at the END of every session before pushing.

```
Last updated   : 2026-03-15
Version        : 4.0
Current phase  : Phase 1 — Step 2 complete.
Last completed : Step 2 — Prisma schema + seed data (v4.0)
                 42 models across Platform, Merchant, Menu, Orders, Customers, Audit sections.
                 Phase 2 scaffolding tables included (PatunganSession, BranchMenuOverride, etc.)
                 Full seed: PlatformSettings singleton, Starter/Pro/Enterprise plans,
                 first SystemAdmin from env vars, demo merchant (dev only).
                 types/enums.ts synced: fixed SessionStatus CLOSED→COMPLETED, added 12 new enums.
                 Prisma schema validated: prisma validate passes.
                 Note: prisma.seed in package.json produces a deprecation warning in Prisma 6
                   ("will be removed in Prisma 7"). Migration to prisma.config.ts can be done
                   at Step 3 or later — no functional impact in current version.
Previously: v3.11 secondary audit resolution pass — 5 gaps from v3.10 fixes:
                 GAP-1 (HIGH): Customer.status (ACTIVE|DELETED) + Customer.deletedAt fields added
                   to data-models.md. PII Deletion Cron used these fields but they weren't in schema.
                 GAP-2 (HIGH): Webhook handler transaction spec forked for Patungan — PENDING Order
                   only confirms when paidParts = totalParts; intermediate payments broadcast partial
                   progress via Realtime without confirming. Patungan idempotency note added.
                 GAP-3 (MEDIUM): autoCompleteReadyMinutes cron executor added — Order Expiry Cron
                   gains STEP 1b (READY→COMPLETED after hold period). Order.readyAt (DateTime?) field
                   added to data-models.md for accurate hold-period start time.
                 GAP-4 (MEDIUM): MerchantSubscription.cancelledAt (DateTime?) added to data-models.md.
                   Win-back email sequence references this field; Merchant.updatedAt is unreliable.
                 GAP-5 (LOW): Edge Runtime waitUntil() signature replaced with Next.js 15 after()
                   from 'next/server'. context.waitUntil() as second arg to App Router handler doesn't
                   exist in Next.js — would silently fail to defer PDF generation.
Previously: Full-Spectrum Architecture Audit resolution pass (v3.10) — remaining pre-Step-1
                 and pre-launch red flags resolved:
                 RF-A: autoCompleteReadyMinutes field added to MerchantSettings; [Mark Complete]
                       KDS button documented; READY→COMPLETED state machine row fully specced.
                 RF-B: Order Expiry Cron and BY_WEIGHT Alert Cron SQL fixed — Order has branchId
                       not restaurantId; both crons now JOIN Branch b ON b.id = o.branchId.
                 RF-C: CustomerSession resume query fixed — WHERE sessionCookie = $cookieValue
                       (not WHERE id = $cookieValue); security warning added to ADR-011 and
                       customer.md. PK/credential decoupling enforced.
                 RF-D: Invoice PDF async spec completed — Edge Runtime waitUntil() pattern
                       documented; bare fire-and-forget explicitly prohibited on standard runtime.
                 RF-E: Patungan split-payment UX spec fully written in customer.md.
                       Includes: host/participant flows, PatunganSession schema, API endpoints,
                       split modes (EQUAL/MANUAL), edge cases, BY_WEIGHT block rule.
                       PatunganSession added to data-models.md Phase 2 Scaffolding.
                       Payment.splitGroupId field added.
                 RF-F: Privacy consent screen spec added to customer.md (§ 4. Privacy Consent).
                       Bottom sheet on first order attempt; localStorage consent flag;
                       Customer.privacyConsentAt persisted for logged-in customers.
                 RF-G: PII deletion cron spec added to platform-owner.md.
                       Daily at 02:00 WIB; anonymizes Customer PII in-place (soft delete);
                       retains Order/Payment rows per 7-year commercial law. vercel.json updated
                       with 8th cron entry (/api/cron/pii-deletion).
                 RF-H: ADR-028 added to architecture.md — Supabase project region: Singapore
                       (ap-southeast-1). Data residency implication documented. Vercel region
                       VERCEL_REGION=sin1 specified. Privacy Policy disclosure requirement noted.
                 RF-I: layoutAllowed (string[]?) field added to SubscriptionPlan in data-models.md.
                       Enforcement at branding save (Step 8) and category override save (Step 9).
                       Fallback to GRID on plan downgrade.
                 RF-J: WCAG color contrast validation spec added to merchant.md § Restaurant
                       Branding. wcag-contrast npm package; 4.5:1 minimum; warn-only (not block);
                       live preview of menu header with chosen colors.
                 RF-K: PREPARING→CANCELLED stock restoration documented in data-models.md
                       state machine transition table (same atomic pattern as CONFIRMED→CANCELLED).
                 RF-L: Language switcher placement spec added to customer.md § Language Switcher.
                       Position: top-right menu header; ID|EN text toggle; localStorage persist;
                       translated vs not-translated inventory documented.
                 RF-M: Win-back email sequence spec added to platform-owner.md.
                       4-email sequence (Day 1, 7, 14, 30); cancellationReason-aware personalization;
                       Day 30 email mandatory (UU PDP data deletion notice); suppression rules;
                       winBackOptOut + winBackEmailsSentCount fields added to data-models.md.
                 Deferred (non-doc gaps): DB RLS (Phase 2); PII field encryption (Phase 2);
                   apps/menu PWA (future step); quick sold-out from KDS (UX note for Step 20).
Previously: Full-Spectrum Architecture Audit resolution pass (v3.9) — 8 red flags resolved:
                 RF-1: Stale TTL extension removed from merchant.md BY_WEIGHT Staff Flow.
                 RF-2: BALANCE_REFUND amount fixed (always positive in merchant.md + customer.md).
                 RF-3: OrderItem.finalLineTotal (int?) + weightUnit (string?) added to data-models.md.
                 RF-4: MerchantSettings missing fields added: roundingRule, aiShowBestsellers, etc.
                 RF-5: QR path param validation rule added to ADR-015 + customer.md.
                 RF-6: gracePeriodDays precedence documented (COALESCE pattern).
                 RF-7: BY_WEIGHT Uncollected Balance Charge Alert Cron spec added.
                 RF-8: Invoice PDF generation async requirement spec added to customer.md.
                 RF-10: Stale POS weight-entry instruction removed from merchant.md.
Previously: DeepSeek audit red-flag resolution pass (v3.8) — 5 gaps fixed:
                 1. PREPARING timeout: ADR-027 added — no auto-transition; stale order alert
                    badge after MerchantSettings.preparingAlertMinutes (default 45 min).
                 2. Free tier enforcement: SubscriptionPlan gets tableLimitCount,
                    menuItemLimitCount, branchLimitCount (null = unlimited). API returns HTTP 403
                    PLAN_LIMIT_REACHED on create. Spec in platform-owner.md § Plan Limit Enforcement.
                 3. actorName for SYSTEM events: Changed from null to literal "System" string.
                 4. BY_WEIGHT channel unavailable: CASH override escape hatch documented —
                    staff override with orders:manage permission + AuditLog CHANNEL_OVERRIDE entry.
                 5. SystemAdmin mustChangePassword: New field on SystemAdmin; seed sets true;
                    FBQRSYS auth middleware blocks all pages until password is changed.
                 Deferred as non-gaps: Midtrans dead-letter queue (Phase 2); EOD 12h window
                   (already configurable); idempotencyKey collision (documented); QueueCounter
                   WIB (already fully specified in platform-owner.md).
                 Updated: architecture.md (ADR-027), data-models.md (5 field changes),
                   platform-owner.md (Plan Limit Enforcement section), CLAUDE.md.
Previously: Phase 1 scope expansion pass (v3.7) — 3 more features promoted from Phase 2:
                 1. Printer integration (kitchen tickets + receipts) → Phase 1 Step 20
                    New MerchantSettings fields: printerConfig, autoPrintKitchenTicket,
                    autoPrintReceipt. New merchant.md § Kitchen Printer Integration.
                 2. Waiter-assisted order mode → Phase 1 Step 10
                    New Order.placedByStaffId field. New merchant.md § Waiter-Assisted Order Mode.
                 3. Shareable menu URL (browse-only /menu/{restaurantId}) → Phase 1 Step 12
                    New customer.md § Shareable Menu URL.
                 Updated: architecture.md, merchant.md, customer.md, data-models.md, CLAUDE.md.
Previously: Persona deal-breaker promotion pass (v3.6) — 3 Phase 2 features moved to Phase 1:
                 1. Per-branch item availability (BranchMenuOverride UI) → Phase 1 Step 9
                 2. Split bill / Patungan multi-payment UI → Phase 1 Step 15
                 3. Offline mode PWA (merchant-pos + kitchen) → Phase 1 Steps 9 & 20
                 Updated: architecture.md backlog table, merchant.md, data-models.md
                   (Phase 2 Scaffolding note), customer.md (cache key note), CLAUDE.md
                   Phase Tracker + Step routing table.
Previously: Multi-Disciplinary Engineering Team audit pass (v3.5) — GO verdict;
                 4 red flags resolved:
                 RED FLAG #1 (HIGH) — Infinite Table Deadlock: removed BY_WEIGHT TTL
                   extension from CustomerSession.expiresAt. Sessions always expire
                   on schedule. Session Cleanup Cron STEP 1c added: cancels abandoned
                   BY_WEIGHT orders, refunds deposits via Midtrans, sets Table → DIRTY.
                 RED FLAG #2 (HIGH) — Silent Webhook Race Condition: documented KDS REST
                   fallback poll (every 60s) in merchant.md § KDS Realtime Fallback and
                   data-models.md webhook handler spec. Realtime push = fast path;
                   REST poll = safety net for dropped packets after DB commit.
                 RED FLAG #3 (MEDIUM) — BY_WEIGHT Click Fatigue: added full spec for
                   weight-entry numpad modal directly on the KDS card (tap ⚖️ badge).
                   Staff enter weight from KDS; POS receives targeted "Charge Remaining
                   Balance" alert. Three new Phase 1 Prisma fields added to OrderItem:
                   needsWeighing (bool), weightValue (decimal?), weightEnteredByStaffId.
                 RED FLAG #4 (MEDIUM) — Feature Creep Risk: BY_WEIGHT frontend UI tagged
                   Phase 1.5. Schema fields stay Phase 1. Customer-facing deposit UI,
                   KDS numpad, and merchant-pos priceType toggle deferred to Phase 1.5.
                   MerchantSettings.byWeightEnabled gate added. ADR-026 written.
Previously: Pre-coding QA audit pass (v3.4) — 18 issues (4 critical, 5 high, 7 medium, 2 low) fixed:
                 CRITICAL #1 — data-models.md OrderItem.status: added COMPLETED to enum
                   (PENDING|PREPARING|READY|COMPLETED); clarified ⚖️ and ⚠️ are display
                   states from needsWeighing/stock-out flags, NOT additional enum values.
                 CRITICAL #2 — data-models.md Order model: explicit note that paymentMode
                   (PAY_FIRST|PAY_AT_CASHIER) is NOT an Order field — it lives on
                   MerchantSettings and is read at order creation time.
                 CRITICAL #3 — ui-ux.md Payment Status Badges: split into two sub-tables —
                   Payment.status badges (transaction outcome) vs Payment.paymentType badges
                   (financial intent for BY_WEIGHT). BALANCE_CHARGE and BALANCE_REFUND are
                   paymentType values, not status values. Added DEPOSIT paymentType badge.
                   Added schema clarification note before the table.
                 CRITICAL #4 — data-models.md Payment: BALANCE_REFUND amount is ALWAYS
                   positive (>= 0); refund direction is indicated by paymentType alone.
                   Removed misleading "(amount: negative)" comment. Added SIGN CONVENTION
                   block to prevent aggregation bugs.
                 HIGH #5 — data-models.md + platform-owner.md: added confirmedAt = NOW()
                   to ALL Order → CONFIRMED transitions (webhook handler idempotency UPDATE,
                   Close Register Mark as Paid). Kitchen elapsed timer formula now explicit:
                   elapsed = NOW() - confirmedAt; null confirmedAt → timer shows "–".
                 HIGH #6 — data-models.md WaiterRequest.notifyRoleId: changed "(FK? nullable)"
                   to explicit "(string? FK → MerchantRole.id; nullable)".
                 HIGH #7 — CronRunLog: confirmed already defined in Phase 2 Scaffolding table
                   (no new fix needed; audit agent had false positive on this one).
                 HIGH #8 — data-models.md MerchantBillingInvoice: expanded tree entry from
                   3-field stub to complete schema (id, merchantId, subscriptionId,
                   invoiceNumber, periodStart, periodEnd, amount, tax, total, status, dueAt,
                   paidAt, pdfUrl, currency, createdAt, UNIQUE INDEX (merchantId, periodStart)).
                 HIGH #9 — data-models.md Order.idempotencyKey: added scope clarification
                   (global uniqueness is safe due to UUID entropy) and expiry semantics
                   (application checks Order.createdAt < NOW() - 24h before returning existing
                   Order; if expired, creates new Order).
                 MEDIUM #10 — data-models.md OrderItem.kitchenStationId: explicit type
                   clarification (stored as plain UUID string, NOT a live FK; preserves
                   historical routing after station deactivation/rename).
                 MEDIUM #11 — data-models.md MerchantSettings: added 9 previously scattered
                   fields to the Phase 1 Prisma Additional Fields table:
                   paymentMode, paymentTimeoutMinutes, maxPendingOrders, maxOrderValueIDR,
                   maxActiveOrders, orderingPaused, orderingPausedMessage,
                   lateWebhookWindowMinutes, eodCashCleanupHour.
                 MEDIUM #12 — data-models.md Payment.provider: confirmed already documented
                   with CASH/QRIS/EWALLET/VA/CARD rules (no change needed).
                 MEDIUM #13 — data-models.md Phase 2 Scaffolding: added MenuCategory
                   availableFrom/availableTo field specs (String? "HH:MM" WIB, date-fns-tz,
                   both fields must be set together, overnight ranges supported).
                 MEDIUM #14 — data-models.md Payment tree: expanded to full schema (added id,
                   orderId, amount, currency, createdAt, updatedAt). Embedded SIGN CONVENTION
                   and BY_WEIGHT SAME-CHANNEL CONSTRAINT blocks directly in the Payment entry.
                 MEDIUM #15 — data-models.md Payment: added BY_WEIGHT SAME-CHANNEL CONSTRAINT
                   block (DEPOSIT, BALANCE_CHARGE, BALANCE_REFUND must share method+provider;
                   CASH BALANCE_REFUND: no Midtrans API, physical change, audit row retained).
                 MEDIUM #16 — data-models.md + merchant.md: kitchenStationOverride clarified
                   as live FK → KitchenStation.id (nullable); kitchen schema table in
                   merchant.md updated with explicit FK types for all three fields.
                 LOW #17 — data-models.md Restaurant.reservationEmail: confirmed already in
                   Phase 2 Scaffolding table at correct location (no change needed).
                 LOW #18 — data-models.md MerchantIntegration: confirmed stub already in Phase
                   2 Scaffolding; credentials field encryption detail deferred to Phase 2.
Previously: UI/UX specification pass (v3.3) — full design system + screen-specific specs added.
                 CRITICAL #1 — data-models.md CustomerSession: full field table with expiresAt
                   TTL formula (expiresAt = NOW() + tableSessionTimeoutMinutes) and updatedAt.
                   expiresAt is required by the Session Cleanup Cron; missing it = runtime crash.
                 CRITICAL #2 — data-models.md MerchantSettings additional fields: added
                   tableSessionTimeoutMinutes (default 120 min) and enableDirtyState (default
                   false) with MerchantSettings scope clarification (restaurant-level, shared
                   by all branches; per-branch overrides deferred to Phase 2).
                 HIGH #3 — platform-owner.md Session Cleanup Cron STEP 1b: added comment
                   explaining AVAILABLE-table skip (only updates OCCUPIED tables — if no order
                   was placed during the session the table is already AVAILABLE, skip it).
                 HIGH #4 — platform-owner.md Session Cleanup Cron STEP 1b: added
                   `cs.restaurantId = r.id` explicit cross-restaurant safety guard.
                 HIGH #5 — merchant.md + customer.md BY_WEIGHT: BALANCE_REFUND for CASH
                   deposits now explicit — no Midtrans API call; cashier returns physical
                   change; BALANCE_REFUND Payment row still created for audit (method=CASH,
                   midtransTransactionId=null). Same-channel constraint now covers BALANCE_REFUND
                   in addition to BALANCE_CHARGE.
                 HIGH #6 — data-models.md: SystemAdmin, SystemRole, SystemRoleAssignment now
                   have full field specs (id, email, passwordHash, createdByAdminId, etc.).
                 MEDIUM #7 — platform-owner.md Order Expiry Cron code block: "Every 5 minutes
                   (UTC — no timezone conversion)" — removes all ambiguity.
                 MEDIUM #8 — platform-owner.md: new QueueCounter Daily Reset & Pruning Cron
                   spec — prunes rows older than 30 days; vercel.json updated with all 6 crons;
                   cron frequency table updated.
                 MEDIUM #10 — data-models.md MerchantSettings additional fields: explicit
                   scope note (restaurant-level, not per-branch; per-branch Phase 2).
                 MEDIUM #11 — data-models.md Order Status Lifecycle: PENDING_CASH clarified
                   as Payment status, not Order status; three CONFIRMED paths documented.
                 MEDIUM #12 — already covered by CRITICAL #2 above.
                 LOW #13 — merchant.md staff:manage: Phase 2 sub-permissions note added.
                 LOW #14 — customer.md Order Status Lifecycle: three CONFIRMED paths added
                   with cross-reference to ADR-025 and platform-owner.md Close Register.
                 LOW #15 — architecture.md: ADR-025 added (Late Webhook Revival design,
                   revival conditions, auto-refund fallback, lateWebhookWindowMinutes).
                 Previously (v3.1): 6 bugs, 3 gaps from first post-migration audit fixed.
Next step      : Step 3 — Auth: email+password JWT, PIN auth, NextAuth.js (`apps/web`)
Active branch  : claude/claude-md-mmj9kfzjcs43k5bw-RRqsz
Open decisions : See "Open Questions for Future AI Agents" in docs/architecture.md
Known doc gaps : refund flow full detail — deferred to Step 15 and Step 19;
                 estimated wait time display — formula in docs/merchant.md, UI Phase 2;
                 Hidang mode full flow — deferred to Phase 2;
                 customer READY notification — Phase 1 accepts gap, Phase 2 WA message;
                 BY_WEIGHT BALANCE_REFUND via same Midtrans channel — Midtrans partial
                   refund API integration detail deferred to Step 15;
                 DB Row-Level Security (RLS) — deferred to Phase 2;
                 PII field encryption at rest — deferred to Phase 2;
                 apps/menu PWA offline mode — deferred to future step;
                 quick sold-out from KDS — UX note for Step 20;
                 EFAKTUR API for Faktur Pajak — deferred to Phase 2
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
- [x] **Step 1** — Monorepo scaffold: Turborepo, `apps/web`, `apps/menu`, `packages/database`, `packages/ui`, `packages/types`, `packages/config`
- [x] **Step 2** — Prisma schema + migrations + seed data (`packages/database`)

### Phase 2 — Auth & Platform Admin (FBQRSYS)
- [ ] **Step 3** — Auth: email+password JWT, PIN auth, NextAuth.js (`apps/web`)
- [ ] **Step 4** — Dynamic RBAC: role/permission engine + middleware (`apps/web`)
- [ ] **Step 5** — FBQRSYS: merchant management UI — create, view, suspend (`apps/web/(fbqrsys)`)
- [ ] **Step 6** — Merchant subscription & billing: plans, invoices, auto-lock, email reminders (`apps/web/(fbqrsys)`)

### Phase 3 — Merchant POS
- [ ] **Step 7** — Merchant onboarding: trial/free tier flow, plan selection (`apps/web/(merchant)`)
- [ ] **Step 8** — Restaurant branding settings + CSS variable injection (`apps/web/(merchant)` + `apps/menu`)
- [ ] **Step 9** — merchant-pos: menu & category management, layouts, allergens, CSV import, **per-branch item availability toggle (BranchMenuOverride UI)**, **PWA offline mode for merchant-pos** (`apps/web/(merchant)`)
- [ ] **Step 10** — merchant-pos: table management, QR generation, floor map, **waiter-assisted order mode (POS places order on behalf of customer)** (`apps/web/(merchant)`)
- [ ] **Step 11** — merchant-pos: promotions + discount codes (`apps/web/(merchant)`)

### Phase 4 — Customer Ordering (end-user-system)
- [ ] **Step 12** — QR validation + branded menu, Grid layout, dine-in, **shareable browse-only menu URL** (`apps/menu`)
- [ ] **Step 13** — List, Bundle, Spotlight layouts (`apps/menu`)
- [ ] **Step 14** — Item detail modal: variants, add-ons, allergens (`apps/menu`)
- [ ] **Step 15** — Cart + pre-invoice + Midtrans QRIS + cash option + **split payment / Patungan (multi-person checkout)** (`apps/menu`)
- [ ] **Step 16** — Order tracking screen: real-time status, Call Waiter, rating (`apps/menu`)

### Phase 5 — Kitchen & Operations
- [ ] **Step 17** — Takeaway / counter mode: counter QR, queue numbers, queue display screen (`apps/menu` + `apps/web/(kitchen)`)
- [ ] **Step 18** — Push notifications: Web Push API, new order alert, Call Waiter alert (`apps/web`)
- [ ] **Step 19** — Invoice + MerchantBillingInvoice PDF generation + Supabase Storage (shared)
- [ ] **Step 20** — merchant-kitchen: real-time queue, priority reordering, station tabs, queue number display, **PWA offline mode for kitchen display**, **kitchen ticket + receipt printing (node-thermal-printer)** (`apps/web/(kitchen)`)

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
| `docs/ui-ux.md` | Global design system: color palette, status badge colors, typography, spacing, border radius, shadows, z-index, component patterns (cards, tables, forms, badges, buttons, modals, toasts, loading/empty states), navigation structure, responsive rules, animation rules, language/copy conventions, accessibility baseline | Specific table columns, form field order, chart types for individual screens (those belong in domain docs) |

### Step → Doc routing table

Read **all listed files** before writing code for a step.

| Step(s) | What it builds | Read these docs/ files |
|---|---|---|
| **Step 1** | Monorepo scaffold | `architecture.md` (repo structure, tech stack) |
| **Step 2** | Prisma schema + migrations + seed | `data-models.md` ← primary; `architecture.md` (ADRs explaining why) |
| **Step 3** | Auth: JWT, PIN auth, NextAuth | `data-models.md` (Merchant, Staff, Customer models); `architecture.md` (auth model, ADR-005) |
| **Step 4** | Dynamic RBAC — role/permission engine | `merchant.md` (RBAC section); `platform-owner.md` (FBQRSYS permissions); `architecture.md` (ADR-005) |
| **Step 5** | FBQRSYS — merchant management UI | `platform-owner.md` ← primary; `data-models.md` (Merchant model); `ui-ux.md` (design system + FBQRSYS screen specs in platform-owner.md § UI Specifications) |
| **Step 6** | Merchant subscription & billing | `platform-owner.md` ← primary (billing section, cron specs); `ui-ux.md` (billing screen specs in platform-owner.md § UI Specifications) |
| **Step 7** | Merchant onboarding — trial/free tier | `merchant.md` (onboarding wizard, checklist); `ui-ux.md` (wizard screen spec in merchant.md § UI Specifications) |
| **Step 8** | Restaurant branding + CSS injection | `merchant.md` (branding section); `customer.md` (how branding renders in apps/menu); `ui-ux.md` (color tokens, apps/menu theming) |
| **Step 9** | Menu & category management, CSV import, BranchMenuOverride UI, PWA offline (merchant-pos) | `merchant.md` ← primary (menu fields, variants, add-ons, CSV spec, BranchMenuOverride toggle); `ui-ux.md` (menu list + item form specs in merchant.md § UI Specifications); `data-models.md` (BranchMenuOverride schema) |
| **Step 10** | Table management, QR generation, floor map, waiter-assisted order mode | `merchant.md` ← primary (table status, QR spec, waiter-assisted order mode); `customer.md` (QR flow, ADR-015); `data-models.md` (Order.placedByStaffId); `ui-ux.md` (floor map + QR modal specs in merchant.md § UI Specifications) |
| **Step 11** | Promotions + discount codes | `merchant.md` (Promotion model spec); `ui-ux.md` (promotions list + form specs in merchant.md § UI Specifications) |
| **Step 12** | QR validation + branded menu + Grid layout + shareable menu URL | `customer.md` ← primary (QR flow, shareable menu URL spec); `merchant.md` (branding, layouts); `ui-ux.md` ← design system (color tokens, apps/menu branding override, Grid layout screen spec in customer.md § UI Specifications) |
| **Step 13** | List, Bundle, Spotlight layouts | `customer.md` ← primary; `merchant.md` (layout specs); `ui-ux.md` (List/Bundle/Spotlight screen specs in customer.md § UI Specifications) |
| **Step 14** | Item detail modal: variants, add-ons | `customer.md`; `merchant.md` (variant/addon field specs); `ui-ux.md` (item detail bottom sheet spec in customer.md § UI Specifications) |
| **Step 15** | Cart + pre-invoice + Midtrans + cash + split payment (Patungan) | `customer.md` ← primary; `data-models.md` (Payment model, Payment[] multi-payment); `ui-ux.md` (cart sheet + checkout + payment screen specs in customer.md § UI Specifications) |
| **Step 16** | Order tracking + real-time + Call Waiter | `customer.md` ← primary; `merchant.md` (WaiterRequest types); `ui-ux.md` (order tracking screen spec in customer.md § UI Specifications) |
| **Step 17** | Takeaway/counter mode, queue display | `customer.md` (takeaway customer view); `merchant.md` (counter flow, QueueCounter); `ui-ux.md` (queue display screen spec in customer.md § UI Specifications) |
| **Step 18** | Push notifications — Web Push API | `architecture.md` (push notification design); `merchant.md` (notification routing) |
| **Step 19** | Invoice + MerchantBillingInvoice PDF | `platform-owner.md` (MerchantBillingInvoice); `merchant.md` (Invoice format) |
| **Step 20** | merchant-kitchen: queue, priorities, stations, PWA offline, printer integration | `merchant.md` ← primary (kitchen display, station routing, priority, printer integration); `data-models.md` (MerchantSettings printer fields); `ui-ux.md` (kitchen display dark theme tokens + order card spec in merchant.md § UI Specifications); `architecture.md` (offline mode PWA spec) |
| **Step 21** | ROI analytics dashboard + accounting export | `merchant.md` ← primary (dashboard specs, export); `ui-ux.md` (analytics dashboard chart types + stat card specs in merchant.md § UI Specifications) |
| **Step 22** | Delivery platform integration | `merchant.md` (delivery flows); `architecture.md` (ADR-012, webhook idempotency) |
| **Step 23** | AI recommendation engine | `customer.md` (AI customer-facing); `merchant.md` (AI settings) |
| **Step 24** | Audit log — middleware + viewer UI | `platform-owner.md` ← primary; `data-models.md` (AuditLog model); `ui-ux.md` (audit log screen spec in platform-owner.md § UI Specifications) |
| **Step 25** | Merchant loyalty + customer account | `merchant.md` (loyalty config); `customer.md` (customer account, loyalty balance) |
| **Step 26** | Platform loyalty + gamification | `customer.md` (loyalty tiers); `platform-owner.md` (platform loyalty) |
| **Step 27** | WhatsApp Business integration | `platform-owner.md` (MerchantIntegration model); `merchant.md` (WA notification flows) |
| **Step 28** | Remaining backlog | `architecture.md` (backlog); read domain docs per specific item |
| **Any step** | Schema cross-check | `data-models.md` — confirm model fields before writing Prisma queries |
| **Any step** | Design question / ADR lookup | `architecture.md` — check if the question was already decided |
| **Any UI step** | Design system reference | `ui-ux.md` — colors, typography, component patterns, navigation, responsive rules |

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
| Changed global colors, typography, spacing, component patterns, navigation structure, or animation rules | `docs/ui-ux.md` |
| Changed screen-specific UI (table columns, form field order, chart types) for FBQRSYS screens | `docs/platform-owner.md` § UI Specifications |
| Changed screen-specific UI for merchant-pos or kitchen screens | `docs/merchant.md` § UI Specifications |
| Changed screen-specific UI for customer menu screens | `docs/customer.md` § UI Specifications |

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
