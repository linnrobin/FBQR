# CLAUDE.md

This is the **command center** for AI agents working on this repository. It contains the current state, phase tracker, operating protocols, and operational conventions. All detailed specifications live in `docs/` — read the relevant file before writing any code.

---

## CURRENT STATE — Read This First

> **Every AI agent must read this block before doing anything else.**
> Update this block at the END of every session before pushing.

```
Last updated   : 2026-03-28
Version        : 4.22
Current phase  : Phase 5 — Step 19 complete.
Last completed : Step 19 — Invoice + MerchantBillingInvoice PDF generation + Supabase Storage (shared).
                 No schema changes.
                 New packages: @react-pdf/renderer (apps/web + apps/menu dependencies).
                 New files created (apps/web):
                   lib/pdf/customer-invoice.tsx — CustomerInvoicePdf React-PDF component (A4);
                     items table, subtotal/service/tax/grand total, payment info, Bahasa Indonesia copy.
                   lib/pdf/billing-invoice.tsx — BillingInvoicePdf React-PDF component (A4);
                     FBQR brand header, billed-to section, line item, totals, payment status badge.
                   lib/customer-invoice.tsx — generateAndStoreCustomerInvoice(orderId) for waiter-
                     assisted orders placed via apps/web; mirrors apps/menu logic.
                   lib/billing-invoice.tsx — generateAndStoreBillingInvoice(invoiceId); fetches
                     MerchantBillingInvoice + merchant; renders PDF; uploads to Supabase Storage
                     invoices/billing/{merchantId}/{invoiceNumber}.pdf; updates pdfUrl with 24h signed URL.
                   app/api/merchant/billing-invoices/route.ts — GET: lists authenticated merchant's
                     FBQR subscription invoices (paginated, status filter).
                   app/(merchant)/merchant/billing/page.tsx — Server component: current plan summary
                     card + initial invoice list.
                   app/(merchant)/merchant/billing/billing-invoices-client.tsx — Client: status filter
                     tabs, invoice table with PDF download links, plan info card.
                 New files created (apps/menu):
                   lib/pdf/customer-invoice.tsx — CustomerInvoicePdf (same template as apps/web).
                   lib/invoice.tsx — generateAndStoreCustomerInvoice(orderId); invoice number generation
                     INV-{branchCode}-{YYYYMMDD}-{seq:04d}; renders PDF; uploads to Supabase Storage
                     invoices/orders/{orderId}.pdf; updates Invoice.pdfUrl with 24h signed URL.
                 Modified files (apps/web):
                   app/api/cron/billing/route.ts — sendEmail() stub replaced with real Resend integration
                     (graceful stub if RESEND_API_KEY absent); generateAndStoreBillingInvoice() called
                     via after() after invoice creation; invoice-issued email includes PDF link.
                   app/api/merchant/orders/route.ts — after() generateAndStoreCustomerInvoice() for
                     waiter-assisted (PAY_AT_CASHIER) orders.
                   components/merchant/sidebar.tsx — added "Tagihan" link → /merchant/billing.
                 Modified files (apps/menu):
                   app/api/webhook/midtrans/route.ts — replaced stub Invoice upsert with
                     after(() => generateAndStoreCustomerInvoice(orderId)); Patungan full-pay also triggers.
                   app/api/order/route.ts — after() generateAndStoreCustomerInvoice() for PAY_AT_CASHIER.
                 All 41 tests still passing.
Previously: Step 18 — Push notifications: Web Push API, new order alert, Call Waiter alert (apps/web).
                 Schema changes:
                   New model: StaffPushSubscription — stores browser push endpoint + VAPID keys per
                     restaurant/staff. Fields: id, staffId (FK nullable), restaurantId (FK), branchId
                     (nullable), endpoint (UNIQUE), p256dh, auth, userAgent, createdAt, updatedAt.
                 New environment variables (both apps):
                   NEXT_PUBLIC_VAPID_PUBLIC_KEY — VAPID public key (safe to expose to browser)
                   VAPID_PRIVATE_KEY            — VAPID private key (server-only)
                   VAPID_SUBJECT                — "mailto:..." for VAPID contact
                   INTERNAL_API_SECRET          — shared secret for apps/menu → apps/web internal API
                 New packages: web-push + @types/web-push (apps/web devDependencies)
                 New files created (apps/web):
                   lib/push.ts — sendNewOrderNotification() + sendWaiterCallNotification(); looks up
                     StaffPushSubscription rows by restaurantId/branchId; respects pushNotifications
                     JSON toggle in MerchantSettings; cleans up stale subscriptions (410/404 response).
                   app/api/merchant/push/vapid-key/route.ts — GET: returns NEXT_PUBLIC_VAPID_PUBLIC_KEY
                     (public — no auth required).
                   app/api/merchant/push/subscribe/route.ts — POST: upsert push subscription; DELETE:
                     remove. Accepts staff PIN session or merchant owner session.
                   app/api/internal/notify/route.ts — POST: internal cross-app push trigger protected
                     by INTERNAL_API_SECRET; accepts {type, restaurantId, branchId, payload};
                     dispatches to sendNewOrderNotification / sendWaiterCallNotification.
                   components/merchant/push-subscribe.tsx — Client component mounted in merchant layout;
                     requests Notification permission; subscribes via PushManager; saves to server;
                     shows iOS "Add to Home Screen" banner (sessionStorage-dismissed).
                 Modified files (apps/web):
                   public/sw.js — added push event handler (showNotification with requireInteraction)
                     and notificationclick handler (focus existing /merchant/ tab or open new tab).
                   app/(merchant)/layout.tsx — includes PushSubscribe component.
                 New files created (apps/menu):
                   lib/notify.ts — sendInternalNotification() helper; calls apps/web /api/internal/notify;
                     uses NEXT_PUBLIC_WEB_APP_URL + INTERNAL_API_SECRET; non-fatal (logs + returns).
                 Modified files (apps/menu):
                   app/api/webhook/midtrans/route.ts — after confirmOrder() and Patungan full-pay:
                     calls sendInternalNotification({type: "NEW_ORDER", ...}) via after() (non-blocking).
                   app/api/waiter/route.ts — after WaiterRequest created: fire-and-forget
                     sendInternalNotification({type: "WAITER_CALL", ...}).
                   app/api/order/route.ts — for PAY_AT_CASHIER orders: fire-and-forget NEW_ORDER notify.
                 Modified files (apps/web):
                   app/api/merchant/orders/route.ts — waiter-assisted orders: after() push NEW_ORDER.
                 All 41 tests still passing. Prisma client regenerated with StaffPushSubscription.
Previously: Step 17 — Takeaway / counter mode: counter QR, queue numbers, queue display screen
                 (apps/menu + apps/web/(kitchen)).
                 Schema changes:
                   Table: added tableType (OrderType default DINE_IN) — identifies counter/takeaway tables.
                 New files created (apps/web):
                   app/(kitchen)/queue-display/page.tsx — Public queue display page (no auth);
                     requires ?branchId=<uuid>; renders QueueDisplay component on a TV/monitor.
                   app/api/kitchen/queue/route.ts — GET public endpoint: returns PREPARING + READY
                     queue numbers for today (WIB date) scoped to branch. No auth required.
                   components/kitchen/queue-display.tsx — Full-screen dark TV display (bg-stone-950);
                     "PESANAN SIAP" section (green tiles) + "SEDANG DISIAPKAN" section (amber tiles);
                     Supabase Realtime subscription on orders:{branchId} channel; 30s fallback poll;
                     AnimatePresence animated number tiles; reconnection banner on CHANNEL_ERROR.
                 Modified files (apps/web):
                   middleware.ts — /kitchen/queue-display exempted from staff auth (public TV screen).
                   app/api/merchant/tables/route.ts — POST: accepts optional tableType field
                     (DINE_IN | TAKEAWAY); passed to Prisma create.
                   app/api/merchant/tables/[tableId]/route.ts — PATCH: accepts optional tableType field.
                   app/(merchant)/merchant/tables/tables-floor-map.tsx — FloorMapTable interface gains
                     tableType field; TableFormModal adds 2-button type selector (🪑 Dine-in / 🥡 Takeaway);
                     TableCard subtitle shows 🥡 Takeaway for TAKEAWAY tables.
                 Modified files (apps/menu):
                   app/[restaurantId]/[tableId]/page.tsx — fetches table.tableType; passes tableType
                     prop to MenuHome.
                   app/api/order/route.ts — fetches table.tableType alongside restaurant station;
                     passes orderType to Order.create.
                   components/menu-home.tsx — new tableType prop (default DINE_IN); shows "🥡 Takeaway"
                     sub-label in header when tableType=TAKEAWAY.
                   components/order-tracking-screen.tsx — TAKEAWAY: shows prominent queue number card
                     (#NNN, 56px font-black, color-primary); hides Call Waiter (no table service).
                 All 41 tests still passing.
Previously: Step 16 — Order tracking screen: real-time status, Call Waiter, rating (apps/menu).
                 New files created (apps/menu):
                   app/[restaurantId]/[tableId]/order/[orderId]/page.tsx — Server component: validates
                     session cookie (allows expired sessions to still view in-flight order tracking);
                     renders OrderTrackingScreen.
                   app/api/orders/[orderId]/route.ts — GET: fetch order details for tracking (session-
                     authenticated; returns full order with items, payments, invoice, rating, session
                     status, and restaurant branding).
                   app/api/orders/[orderId]/rating/route.ts — POST: submit 1–5 star rating + optional
                     comment for COMPLETED orders; one rating per order; session-authenticated.
                   app/api/waiter/route.ts — POST: create WaiterRequest (CALL/ASSISTANCE/BILL);
                     session-authenticated + tableId validation; logged to AuditLog.
                   components/order-timeline.tsx — Vertical status progression (CONFIRMED → PREPARING →
                     READY → COMPLETED); active step has animated pulse ring (Loader2 + animate-ping);
                     completed steps show CheckCircle2; CANCELLED state shows red banner with timestamp.
                   components/order-status-display.tsx — Items list (with ⚖️ BY_WEIGHT badge + weight
                     value when set), payment summary (subtotal/service/tax/total + method badge +
                     payment status badge), READY banner (animate-pulse), invoice download link
                     (shows "Generating..." when pdfUrl not yet set).
                   components/call-waiter-menu.tsx — 3-button grid (Panggil Pelayan / Butuh Bantuan /
                     Minta Struk); ASSISTANCE button opens Framer Motion bottom sheet with optional
                     note textarea; sent state auto-resets after 30s; disabled while session inactive.
                   components/order-rating-prompt.tsx — Star rating (5 tappable stars, h-8 w-8,
                     amber-400 fill); optional comment textarea (max 500 chars); submits to
                     /api/orders/[orderId]/rating; shows "Terima kasih!" confirmation on success.
                   components/order-tracking-screen.tsx — Orchestrator: Supabase Realtime subscription
                     on `orders:{branchId}` channel (branch-scoped per ADR spec); 30s fallback poll;
                     reconnection banner on CHANNEL_ERROR; return-from-Midtrans spinner (shows while
                     status=PENDING after ?status=finish); confirmation banner auto-dismiss 5s;
                     cancelled/expired state view; Add More Items + Back to Menu buttons.
                 All 41 tests still passing. No DB schema changes.
Previously: Step 15 — Cart + pre-invoice + Midtrans QRIS + cash + split payment / Patungan (apps/menu).
                 Schema changes:
                   MerchantSettings: added taxRate (Decimal default 0.11), taxLabel (String default "PPN"),
                     serviceChargeRate (Decimal default 0.00), serviceChargeLabel (String default "Service"),
                     taxOnServiceCharge (Boolean default true), pricesIncludeTax (Boolean default false).
                   OrderItem: added specialRequest (String?) for per-item customer instructions.
                 New files created (apps/menu):
                   components/cart-sheet.tsx — Bottom sheet (Framer Motion, max-h-85vh): cart item
                     rows with [−][qty][+] controls + delete, order summary (subtotal/service/tax/total),
                     "Lanjut ke Pembayaran" / "Pesan & Bayar di Kasir" CTA.
                   components/payment-method-selector.tsx — Radio cards for QRIS/VA/CARD selection;
                     fee label per method; selected state uses --color-primary border/bg.
                   components/patungan-setup-modal.tsx — Bottom sheet: EQUAL/MANUAL mode toggle,
                     totalParts stepper (2–10), per-person amount preview, "Buat Link Patungan" CTA.
                   components/patungan-host-screen.tsx — Host progress view: 6-char shareCode + copy
                     link, progress bar, per-participant paid/pending status list, Cancel Patungan button.
                   components/patungan-participant-screen.tsx — Participant view: restaurant name,
                     their share amount, progress bar, Pay button → Midtrans redirect.
                   components/checkout-screen.tsx — Client component: reads cart from sessionStorage,
                     shows pre-invoice (itemized + tax breakdown), payment method selector (PAY_FIRST),
                     customer note textarea, privacy consent (UU PDP) gated, Patungan CTA;
                     handles order submission and Midtrans redirect; PAY_AT_CASHIER pending screen.
                   app/[restaurantId]/[tableId]/checkout/page.tsx — Server component: validates
                     session + fetches tax/payment settings; renders CheckoutScreen.
                   app/patungan/page.tsx — 6-char code entry page for participants.
                   app/patungan/[patunganId]/page.tsx — Participant payment page.
                   app/api/order/route.ts — POST: validate session, verify items, compute financials
                     (ADR-013), create Order + Payment, return Snap token (PAY_FIRST) or pending
                     confirmation (PAY_AT_CASHIER). Guards: orderingPaused, maxPendingOrders,
                     maxOrderValueIDR, BY_WEIGHT block.
                   app/api/patungan/route.ts — POST: create PatunganSession (EQUAL/MANUAL); validates
                     PAY_FIRST mode, BY_WEIGHT block, order PENDING guard.
                   app/api/patungan/[patunganId]/route.ts — GET: status (public); DELETE: host-only
                     cancel + best-effort Midtrans refunds.
                   app/api/patungan/[patunganId]/pay/route.ts — POST: create participant Snap token.
                   app/api/patungan/lookup/route.ts — GET: resolve shareCode → patunganId.
                   app/api/webhook/midtrans/route.ts — POST: SHA512 signature verification; maps
                     transaction_status to Payment/Order status; Patungan: increments paidParts,
                     confirms Order when all parts paid; async Invoice creation via after().
                 Modified files (apps/menu):
                   components/item-detail-modal.tsx — CartEntry type extended with itemName: string
                     and imageUrl: string | null; onAddToCart call populates both.
                   components/menu-home.tsx — added CartSheet integration; cart icon opens sheet;
                     handleUpdateQty / handleRemoveItem cart mutators; handleProceedToCheckout saves
                     cart to sessionStorage and navigates to checkout; new props: restaurantId,
                     tableId, taxSettings, paymentMode.
                   app/[restaurantId]/[tableId]/page.tsx — fetches paymentMode + all tax settings
                     from MerchantSettings; passes to MenuHome as taxSettings + paymentMode props.
                 All 41 tests still passing. TypeScript clean.
Previously: Step 14 — Item detail modal: variants, add-ons, allergens (apps/menu).
                 New files created (apps/menu):
                   components/item-variant-selector.tsx — Radio pill-chip group for variant
                     selection; selected chip uses border/bg/text in --color-primary; shows
                     price delta (+Rp / -Rp) next to each option.
                   components/item-addon-selector.tsx — Multi-select checkbox chip list for
                     optional add-ons; simple toggle for maxQuantity=null/1; [−][qty][+]
                     controls for maxQuantity>1; isDefault pre-checked on modal open.
                   components/item-detail-content.tsx — Scrollable modal body: 11 spec
                     sections (image 16:9 / name / price / dietary badges / prep time /
                     description / variants / add-ons / allergen warning box / special
                     request textarea / qty selector [−][n][+]).
                   components/item-detail-modal.tsx — Framer Motion bottom sheet (max-h-90vh,
                     spring animation, body scroll lock); manages selectedVariantId,
                     selectedAddons Map<id,qty>, qty, specialRequest state; pre-fills from
                     existingEntry when item already in cart; footer "Tambahkan ke Pesanan"
                     button disabled for BY_WEIGHT, unavailable, or missing required variant;
                     exports CartEntry and CartAddon types for Step 15 cart/checkout.
                 Modified files (apps/menu):
                   components/menu-item-card.tsx — added MenuItemVariant and MenuItemAddon
                     interfaces to MenuItemData; whole card now clickable (role=button);
                     onAdd → onOpenItem(item); add button opens modal instead of direct add.
                   components/menu-grid-layout.tsx — onAddItem → onOpenItem(item).
                   components/menu-list-row.tsx — whole row clickable; onAdd → onOpenItem(item).
                   components/menu-list-layout.tsx — onAddItem → onOpenItem(item).
                   components/menu-bundle-layout.tsx — whole card clickable; onAddItem →
                     onOpenItem(item).
                   components/menu-spotlight-layout.tsx — button opens modal via
                     onOpenItem(item); onAddItem → onOpenItem(item).
                   components/menu-home.tsx — cart upgraded from Map<string,number> to
                     Map<string,CartEntry> (stores variant/addon/special-request/lineTotal
                     per item); added openItem + modalOpen state; ItemDetailModal wired
                     with existingEntry for re-editing; bottom bar uses CartEntry.lineTotal.
                   app/[restaurantId]/[tableId]/page.tsx — added variants and addons to
                     Prisma query (deletedAt: null filter, sortOrder ordering); mapped to
                     MenuItemData.variants / addons; allergens cast to string[].
                   app/[restaurantId]/menu/page.tsx — same variants/addons query expansion.
                 All 41 tests still passing. No DB schema changes.
Previously: Step 13 — List, Bundle, Spotlight layouts (apps/menu).
                 New files created (apps/menu):
                   lib/menu-time-window.ts — shared isCategoryAvailable() helper (WIB
                     time-window filtering, overnight range support); extracted from
                     menu-grid-layout.tsx so all layout renderers share one source of truth.
                   components/menu-list-row.tsx — single item row: 56×56 image, name
                     (1-line clamp), description (2-line clamp), dietary badges, price,
                     add-to-cart button (h-8 w-8 rounded-full); spec from customer.md.
                   components/menu-list-layout.tsx — List layout orchestrator: full-width
                     search bar (Cari menu...), horizontal category filter chips (Semua +
                     per-category), category sections with list rows when no filter/search;
                     flat filtered results when search active; category tabs remain (scroll-spy).
                   components/menu-bundle-layout.tsx — Bundle layout: per-item full-width
                     cards (16:7 hero image, name, description, price, dietary badges,
                     full-width add button pinned to card bottom); category sections with
                     scroll-spy IDs.
                   components/menu-spotlight-layout.tsx — Spotlight carousel: all items
                     flattened across categories; Framer Motion drag="x" swipe navigation;
                     chevron arrow buttons; "N / total" pagination indicator; full-width
                     hero image (4:3), Display-size name (text-4xl font-bold), H2 price,
                     4-line description clamp, dietary badges, full-width add button.
                     No category tabs (omitted per spec).
                 Modified files (apps/menu):
                   components/menu-grid-layout.tsx — removed inline time-window helpers;
                     now imports isCategoryAvailable from lib/menu-time-window.
                   components/menu-home.tsx — added menuLayout prop (GRID|LIST|BUNDLE|
                     SPOTLIGHT, default GRID); conditionally renders appropriate layout
                     component; hides MenuCategoryTabs for SPOTLIGHT layout; added
                     imports for three new layout components.
                   app/[restaurantId]/[tableId]/page.tsx — passes branding.menuLayout
                     to MenuHome.
                   app/[restaurantId]/menu/page.tsx — passes branding.menuLayout to MenuHome.
                 All 41 tests still passing. No DB schema changes.
Previously: Step 12 — QR validation + branded menu + Grid layout + shareable URL.
                 New files created (apps/menu):
                   lib/qr-auth.ts — HMAC-SHA256 sign/verify (ADR-015); signQrUrl(),
                     verifyQrSig() timing-safe, buildSignedMenuUrl() with 24h expiry
                   app/r/[tableToken]/route.ts — QR redirect handler: table lookup,
                     merchant/table status validation, HTML error pages, 302 redirect to
                     signed URL. Table DIRTY check gates on enableDirtyState setting.
                   app/api/menu/session/route.ts — Session creation/resume: re-validates
                     sig, creates CustomerSession (sessionCookie, expiresAt, ip, ua),
                     sets fbqr_session_id httpOnly cookie, redirects back to menu.
                     CRITICAL ADR-015: resume query uses sessionCookie, not id.
                   components/menu-item-card.tsx — Item card: image, dietary badges
                     (Halal/Vegan/Vegetarian/Allergen), spice level, price (+ deposit
                     for BY_WEIGHT), cart quantity badge, [+ Tambah] button disabled
                     for unavailable/BY_WEIGHT items.
                   components/menu-category-tabs.tsx — Horizontal scroll-spy tabs:
                     IntersectionObserver drives active tab; auto-scrolls active tab
                     into view; click scrolls to section with header+tab offset.
                   components/menu-grid-layout.tsx — 2/3-col grid per category section:
                     category time-window filter (WIB, overnight range support).
                   components/menu-home.tsx — Orchestrator: sticky header (logo, name,
                     cart icon), ordering-paused banner, category tabs, grid layout,
                     fixed bottom cart bar (isOrderingMode=true) or browse-only banner
                     "Pindai QR di meja untuk memesan" (isOrderingMode=false).
                     Cart state: quantity map (full checkout deferred to Step 15).
                     Scroll-spy via IntersectionObserver.
                   app/[restaurantId]/[tableId]/page.tsx — QR-validated table menu:
                     full ADR-015 security flow (sig validation → path param assertion
                     → table/merchant status checks → session create/resume → menu
                     render). Session creation uses redirect to /api/menu/session.
                   app/[restaurantId]/menu/page.tsx — Shareable browse-only menu:
                     no QR needed; merchant/restaurant status check; primary branch
                     BranchMenuOverride applied; browse-only banner rendered.
                 apps/menu/package.json: added lucide-react ^0.469.0.
                 All 41 tests still passing. No DB schema changes.
                 Schema changes:
                   Added DiscountType enum (PERCENTAGE, FIXED_AMOUNT, BOGO, FREE_ITEM)
                   Added PromotionScope enum (ALL_ITEMS, SPECIFIC_CATEGORIES, SPECIFIC_ITEMS)
                   Redesigned Promotion model: removed redundant `type String` + `discountType
                     String`; replaced with single `discountType DiscountType` enum field.
                     Renamed startsAt→validFrom, endsAt→validTo, maxUses→usageLimit,
                     usedCount→usageCount. Added scope fields: applicableTo (PromotionScope),
                     applicableItemIds (Json default "[]"), maximumDiscountAmount (Int?),
                     minimumOrderValue (Int?), perCustomerLimit (Int?).
                 API routes created (apps/web):
                   GET/POST   /api/merchant/promotions — list (non-deleted) + create; code
                     uniqueness enforced at restaurant scope (409 on conflict)
                   GET/PATCH/DELETE /api/merchant/promotions/[promotionId] — CRUD; soft delete
                 Merchant pages created (apps/web/(merchant)/merchant/promotions):
                   /merchant/promotions — Server Component + PromotionsClient + PromotionsList
                     (table with status/type filters, kebab actions: edit/duplicate/toggle/delete)
                   /merchant/promotions/new — Server Component + PromotionForm (create)
                   /merchant/promotions/[promotionId]/edit — Server Component + PromotionForm (edit)
                 Pre-split client components (per component architecture guide):
                   promotion-form.tsx    — full create/edit form (all 12 fields per spec)
                   promotions-list.tsx   — filterable table with RowActions kebab
                   promotions-client.tsx — thin shell; mounts PromotionsList
                 Sidebar link /merchant/promotions was already wired (sidebar.tsx unchanged).
                 All 41 tests still passing.
Previously: /merchant/settings page — 7-tab MerchantSettings editor.
                 API expanded (PATCH /api/merchant/settings): fixed stale PaymentMode BOTH
                   value; added 17 new settable fields covering payment limits, kitchen alerts,
                   print toggles, notification preferences, AI toggles, promotion stacking.
                   Fixed pre-existing exactOptionalPropertyTypes Prisma upsert error.
                 Pages created (apps/web):
                   /merchant/settings — Server Component + SettingsClient (7 active tabs:
                     Operasi, Pembayaran, Sesi Meja, Dapur, Notifikasi, Fitur AI, Promosi;
                     each tab saves independently via PATCH /api/merchant/settings;
                     Branding tab links to /merchant/branding; Loyalty stub = coming soon)
                 All 41 tests still passing. No DB schema changes.
Previously: Step 10 QA pass — 4 bugs fixed in table management UI components:
                   tables-floor-map.tsx: KebabMenu.transition() was closing the menu before
                     the fetch resolved; on non-ok response the failure was silent. Fixed:
                     menu now closes only on success; inline error shown in dropdown; network
                     exceptions caught. DeleteConfirm.confirm() had no error state and no
                     try/catch — failure was invisible to the user. Fixed: added error display
                     and catch block. TableFormModal.submit() had try/finally without catch —
                     network errors propagated unhandled. Fixed: added catch block.
                   tables-order-panel.tsx: submitOrder() same try/finally-only pattern.
                     Fixed: added catch block so network failures set submitError.
                   All res.json() calls on error paths now use .catch(() => ({})) to handle
                     non-JSON responses (e.g. 502 from proxy) without a second exception.
                 Previously: Step 10 — table management UI complete.
                   Client components created (apps/web):
                     tables-floor-map.tsx  — responsive grid of table cards (status colours,
                       kebab actions for status transitions, create/edit/delete table forms)
                     tables-qr-modal.tsx   — QR view modal (download PNG, print, rotate token
                       with confirmation dialog; fetches from GET /api/merchant/tables/[id]/qr)
                     tables-order-panel.tsx — full-screen waiter-assisted POS panel (category
                       tabs, item grid, variant/addon picker modal, cart with qty controls,
                       POST /api/merchant/orders; BY_WEIGHT items shown disabled)
                     tables-client.tsx     — orchestrator (branch tabs, pause-orders banner
                       with toggle → PATCH /api/merchant/settings, floor-map/list view toggle,
                       list view table, mounts QrModal + OrderPanel)
                 All 41 tests still passing. No DB schema changes.

KNOWN INCOMPLETE ITEMS in earlier steps (expected — assigned to future steps):
  Step 6  — sendEmail() in /api/cron/billing/route.ts is a console.log stub.
              Real Resend integration is Step 18 (push notifications + email).
  Step 7  — /merchant/dashboard shows a static checklist card only. Full live stat cards
              and revenue chart are deferred to after Step 20 (Realtime connected).

SIDEBAR LINKS WITH NO PAGE YET (expected — future steps):
  /merchant/promotions  → ✓ built (Step 11 complete)
  /merchant/analytics   → Step 21 (not built yet)
  /merchant/settings    → ✓ built (7-tab MerchantSettings editor)
  /fbqrsys/audit-log    → Step 24 (not built yet)
Previously: Step 9 — merchant-pos: menu & category management, allergens, CSV import,
                 per-branch item availability toggle (BranchMenuOverride UI), PWA offline mode
                 Schema changes:
                   MenuItem: added isVegan (Boolean default false), spiceLevel (Int?),
                     depositAmount (Int?); changed pricePerUnit Decimal → Int? (IDR int)
                   MenuItemVariant: added isDefault (Boolean), sortOrder (Int), deletedAt (DateTime?)
                   MenuItemAddon: renamed price → priceDelta, renamed maxSelections → maxQuantity,
                     added isDefault (Boolean), sortOrder (Int), deletedAt (DateTime?)
                 API routes created (apps/web):
                   GET/POST   /api/merchant/menu/categories — list + create
                   GET/PATCH/DELETE /api/merchant/menu/categories/[categoryId] — CRUD
                   PATCH      /api/merchant/menu/categories/reorder — drag reorder
                   GET/POST   /api/merchant/menu/items — list (filter by category + search) + create
                   GET/PATCH/DELETE /api/merchant/menu/items/[itemId] — CRUD with variants + addons
                   PATCH      /api/merchant/menu/items/[itemId]/availability — toggle isAvailable
                   POST       /api/merchant/menu/items/[itemId]/duplicate — duplicate item
                   PATCH      /api/merchant/menu/items/reorder — reorder within category
                   POST       /api/merchant/menu/items/import — CSV import (multipart)
                   GET        /api/merchant/menu/branches/[branchId]/overrides — list overrides
                   PATCH      /api/merchant/menu/branches/[branchId]/overrides/[itemId] — upsert override
                 Merchant menu pages (apps/web/(merchant)/merchant/menu):
                   /merchant/menu — Server Component; fetches categories+items+branches+stations
                   menu-client.tsx — Category sidebar, item table (availability toggle, duplicate,
                     delete, edit link), CSV import modal, BranchMenuOverride side panel,
                     category create/edit modal with time windows + layout override + station
                   /merchant/menu/items/new — create item form
                   /merchant/menu/items/[itemId]/edit — edit item form
                   components/merchant/menu-item-form.tsx — full two-column item form:
                     all MenuItem fields, variants (add/edit/delete), addons (add/edit/delete)
                 Merchant layout updated:
                   Added MerchantSidebar (components/merchant/sidebar.tsx) to (merchant)/layout.tsx
                   Login page + onboarding layout use fixed inset-0 z-50 to cover sidebar
                 PWA offline mode for merchant-pos:
                   public/manifest.json — Web App Manifest (scope: /merchant/)
                   public/sw.js — Service Worker: cache-first static, network-first navigation,
                     network-only API; offline fallback to public/offline.html
                   public/offline.html — Indonesian offline page with iOS Add-to-Home-Screen tip
                   components/merchant/pwa-register.tsx — client component; registers SW,
                     shows dismissible iOS banner prompting "Add to Home Screen" in Safari
                   (merchant)/layout.tsx — includes PwaRegister + manifest link in metadata
                 All 41 tests still passing.
Previously: Step 8 — Restaurant branding settings + CSS variable injection (apps/web + apps/menu)
Previously: Step 7 — Merchant onboarding: trial/free tier flow, plan selection (apps/web)
                 Self-service registration:
                   /register — public registration page (businessName, email, password, agreeToTerms)
                   POST /api/auth/register — creates Merchant + Restaurant + Branch (Pusat) in one
                     transaction; sends HMAC-signed email verification link (jose, 24h expiry)
                   GET  /api/auth/verify-email?token=... — sets emailVerifiedAt, redirects to /merchant/login
                 Onboarding wizard (5 steps, full-page layout, no sidebar):
                   /merchant/onboarding/step-1 — Info Restoran (REQUIRED): name, cuisine, logo URL, address
                   /merchant/onboarding/step-2 — Menu Pertama: category + up to 5 items, live preview panel
                   /merchant/onboarding/step-3 — Meja & QR Code (REQUIRED): creates Table, generates
                     qrToken (UUID), returns QR code as base64 data URL (qrcode npm package)
                   /merchant/onboarding/step-4 — Pengaturan Pembayaran: paymentMode radio (3 options)
                   /merchant/onboarding/step-5 — Tambahkan Staff: name+PIN+role per staff member
                 Onboarding API routes:
                   GET  /api/merchant/onboarding — fetch current state
                   PATCH /api/merchant/onboarding/step/[step] — save each step (1–5)
                   POST /api/merchant/onboarding/complete — sets onboardingStep=6, wizardCompletedAt
                 Merchant dashboard:
                   /merchant/dashboard — Server Component; redirects to wizard if step<1 or step<3
                   Dashboard shows trial expiry warning, dismissible onboarding checklist card,
                   quick navigation cards for all merchant POS sections
                   Full live dashboard (stat cards, Realtime charts) deferred to Step 9
                 Wizard progress component: apps/web/components/merchant/wizard-progress.tsx
                 qrcode + @types/qrcode added to apps/web dependencies
                 Merchant login page: updated "Daftar sekarang" link → /register;
                   shows verified=1 success banner and invalid_token error banner
                 All 41 tests still passing. No DB schema changes.
Previously: Step 6 — Merchant subscription & billing (apps/web)
                 apps/web/app/(fbqrsys)/billing/page.tsx: billing overview (stat cards + invoices table)
                 apps/web/app/(fbqrsys)/billing/plans/page.tsx: subscription plans grid + create/edit modal
                 apps/web/app/(fbqrsys)/merchants/[merchantId]/page.tsx: added [Ganti Plan] + [Perpanjang Trial] buttons
                 API routes created:
                   GET/POST  /api/fbqrsys/billing/plans — list all plans (incl. inactive) + create
                   GET/PATCH/DELETE /api/fbqrsys/billing/plans/[planId] — get/update/deactivate
                   GET       /api/fbqrsys/billing — invoices list (filter/paginate)
                   GET       /api/fbqrsys/billing/stats — MRR, issued, overdue, collection rate
                   PATCH     /api/fbqrsys/merchants/[merchantId]/subscription — change plan, extend trial, toggle auto-renew, set grace period
                 Billing cron implemented (/api/cron/billing):
                   Step 1: 7-day renewal reminder emails (idempotency: reminderSentAt)
                   Step 2: Auto-renewal — PENDING invoice + advance period; suspend on grace breach
                   Step 3: Trial expiry — TRIAL → SUSPENDED when trialEndsAt < now
                   Step 4: 3-day renewal reminders (reminderSentAt3d)
                   Step 5: Win-back email sequence for CANCELLED merchants (days 1/7/14/30)
                           Day 30 mandatory regardless of winBackOptOut (UU PDP legal notice)
                 All 41 tests still passing. No DB schema changes.
Previously: Step 5 — FBQRSYS merchant management UI (apps/web)
                 apps/web/app/(fbqrsys)/layout.tsx: updated with FbqrsysSidebar shell
                 apps/web/app/(fbqrsys)/page.tsx: root redirect → /fbqrsys/dashboard
                 apps/web/app/(fbqrsys)/dashboard/page.tsx: stat cards + mini bar charts
                 apps/web/app/(fbqrsys)/merchants/page.tsx: merchant list, filters, bulk actions
                 apps/web/app/(fbqrsys)/merchants/[merchantId]/page.tsx: detail + suspend modal
                 apps/web/app/(fbqrsys)/merchants/new/page.tsx: create merchant form
                 apps/web/app/(fbqrsys)/settings/page.tsx: PlatformSettings editor
                 apps/web/app/(fbqrsys)/settings/staff/page.tsx: staff list + invite + role create
                 apps/web/components/fbqrsys/sidebar.tsx: nav sidebar (client component)
                 apps/web/components/fbqrsys/status-badge.tsx: MerchantStatus/BillingInvoice badges
                 apps/web/components/fbqrsys/stat-card.tsx: dashboard stat card
                 API routes created:
                   GET/POST /api/fbqrsys/merchants — list (search/filter/page) + create
                   GET/PATCH /api/fbqrsys/merchants/[merchantId] — detail + update
                   POST /api/fbqrsys/merchants/[merchantId]/suspend — suspend/unsuspend
                   GET /api/fbqrsys/dashboard — platform stats + 30-day growth charts
                   GET/PATCH /api/fbqrsys/settings — PlatformSettings singleton
                   GET/POST /api/fbqrsys/staff — list + create SystemAdmin
                   GET/POST /api/fbqrsys/roles — list + create SystemRole
                   GET /api/fbqrsys/plans — list active SubscriptionPlans
                 lucide-react added to apps/web dependencies.
                 Login/change-password pages use fixed inset-0 z-50 to cover sidebar.
                 All 41 tests still passing. No DB schema changes.
Previously: Step 4 — Dynamic RBAC: role/permission engine (apps/web)
                 packages/config/src/roleTemplates.ts updated:
                   - MerchantPermission type (15 permissions, matches docs exactly):
                     menu:manage, promotions:manage, reports:read, orders:view,
                     orders:manage, orders:refund, kitchen:view, kitchen:manage,
                     staff:manage, tables:manage, settings:manage, branding:manage,
                     invoices:read, loyalty:manage, billing:read
                   - MERCHANT_PERMISSIONS const array + MERCHANT_ROLE_TEMPLATES
                   - SystemPermission type (9 FBQRSYS permissions) + SYSTEM_PERMISSIONS
                   - SYSTEM_ROLE_TEMPLATES (Platform Owner, Merchant Manager, Billing Admin,
                     Analyst, Support Staff) — hardcoded JSON, NOT DB records (ADR-005)
                   - Legacy exports kept: Permission, RoleTemplate, ROLE_TEMPLATES aliases
                 apps/web/lib/auth/rbac.ts created:
                   - hasPermission(permissions, permission) — pure utility
                   - ForbiddenError class (permission property)
                   - requireStaffPermission(staff, permission) — throws ForbiddenError
                   - getStaffSession(cookieStore) — parses fbqr_staff_session cookie
                   - isMerchantOwner(userType) — short-circuit for owner full-access
                   - getSystemAdminPermissions(adminId) — DB lookup, unions all roles
                   - requireSystemPermission(adminId, permission) — FBQRSYS gate, redirects
                   - forbiddenResponse(permission?) — 403 body builder for API routes
                 apps/web/lib/auth/session.ts: added getSession() helper
                 apps/web/lib/auth/rbac.test.ts: 19 tests, all passing
                 Total tests: 41 passing (19 rbac + 14 pin + 8 staff-jwt)
                 No DB schema changes. No new migrations needed.
Previously: Step 3 — Auth: email+password JWT, PIN auth, NextAuth.js (apps/web)
                 NextAuth v5 (Auth.js) with two Credentials providers:
                   - "fbqrsys": SystemAdmin email+password auth
                   - "merchant": Merchant email+password auth (rejects SUSPENDED/CANCELLED)
                 JWT session strategy; session type-augmented via types/next-auth.d.ts.
                 Staff PIN auth: POST /api/auth/pin → sets fbqr_staff_session cookie (4h TTL).
                 Staff sessions use jose (HS256, edge-compatible) keyed off NEXTAUTH_SECRET.
                 middleware.ts protects /fbqrsys/*, /merchant/*, /kitchen/* routes.
                 mustChangePassword enforcement: all /fbqrsys/* routes redirect to
                   /fbqrsys/change-password until flag is cleared via POST /api/auth/change-password.
                 Login pages: /fbqrsys/login, /merchant/login, /kitchen/login (numpad UI).
                 Force password change: /fbqrsys/change-password.
                 jose + vitest added to apps/web dependencies.
Previously: Step 2 — Prisma schema + seed data (v4.0)
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
Next step      : Step 20 — merchant-kitchen: real-time queue, priority reordering, station tabs,
                   queue number display, PWA offline mode for kitchen display, kitchen ticket +
                   receipt printing (node-thermal-printer) (apps/web/(kitchen)).
Active branch  : claude/claude-md-mmj9kfzjcs43k5bw-RRqsz
Open decisions : See "Open Questions for Future AI Agents" in docs/architecture.md
Known doc gaps : MerchantStatus enum lacks FREE value (in ui-ux.md badge spec but not schema);
                   if FREE tier is needed, add to schema in Step 6 or Phase 2 cleanup.
                 /merchant/settings page not assigned to a step — spec is in docs/merchant.md
                   (MerchantSettings fields: orderingPaused, paymentMode, timeouts, etc.).
                   Should be built as part of Step 10 completion or a new sub-step.
                 refund flow full detail — deferred to Step 15 and Step 19.
                 estimated wait time display — formula in docs/merchant.md, UI deferred to Phase 2.
                 Hidang mode full flow — deferred to Phase 2.
                 customer READY notification — Phase 1 accepts gap, Phase 2 WA message.
                 BY_WEIGHT BALANCE_REFUND via same Midtrans channel — Midtrans partial
                   refund API integration detail deferred to Step 15.
                 DB Row-Level Security (RLS) — deferred to Phase 2.
                 PII field encryption at rest — deferred to Phase 2.
                 apps/menu PWA offline mode — deferred to future step.
                 quick sold-out from KDS — UX note for Step 20.
                 EFAKTUR API for Faktur Pajak — deferred to Phase 2.
```

---

## Component Architecture Pre-split Guide

> **Read this before starting any flagged step.** Steps marked ⚠ below will produce a single
> client component exceeding ~400 lines if built naively. Pre-plan the split before writing code.
> Pattern established in Step 10: split into focused sub-components + thin orchestrator.
>
> **Rule of thumb:** any client component projected to exceed 400 lines must be split.
> Each sub-component file should do one thing (grid rendering, one modal, one form, one panel).

### Steps requiring pre-emptive splitting

| Step | Proposed sub-components | Why it needs splitting |
|---|---|---|
| **11** | `promotions-list.tsx` (table + filters) · `promotion-form.tsx` (12-field form with conditional visibility — discount type, category/item selectors, date pickers) · `promotions-client.tsx` (orchestrator) | Form alone is ~320 lines due to conditional fields (PERCENTAGE shows max cap; BOGO shows buy/get selectors) |
| **12** | `menu-grid-layout.tsx` (grid + scroll-spy) · `menu-item-card.tsx` (reusable card) · `menu-category-tabs.tsx` (scroll-spy tabs) · `menu-home.tsx` (orchestrator + branding injection) | Grid layout handles column responsiveness, scroll-spy category sync, branding CSS override, and badge display simultaneously |
| **13** | `menu-list-layout.tsx` · `menu-list-row.tsx` · `menu-bundle-layout.tsx` · `menu-spotlight-layout.tsx` (carousel) | Three distinct layout renderers — each warrants its own file; ListLayout also includes search/filter state |
| **14** | `item-detail-modal.tsx` (sheet wrapper + state) · `item-variant-selector.tsx` (radio group) · `item-addon-selector.tsx` (multi-checkbox) · `item-detail-content.tsx` (scrollable body) | Bottom sheet has 11 distinct sections; variant/addon selectors will be reused in cart and Patungan screens |
| **15** | `cart-sheet.tsx` (slide-over cart) · `checkout-screen.tsx` (pre-invoice + tax/service breakdown) · `payment-method-selector.tsx` · `patungan-setup-modal.tsx` (split mode selection + per-part amount calc) · `patungan-host-screen.tsx` (host progress view) · `patungan-participant-screen.tsx` | Checkout is a tax/service state machine; Patungan adds host/participant branching + Realtime progress tracking — easily 700+ lines if merged |
| **16** | `order-tracking-screen.tsx` (Realtime subscription + routing) · `order-status-display.tsx` (status badge + items list) · `order-timeline.tsx` (vertical event log) · `call-waiter-menu.tsx` (action sheet) · `order-rating-prompt.tsx` | Real-time subscription + Call Waiter action sheet + rating form + BY_WEIGHT balance alert all in one screen |
| **20** | `kitchen-display.tsx` (Realtime sub + station tabs + fallback poll) · `kitchen-order-grid.tsx` (grid layout) · `kitchen-order-card.tsx` (card + action buttons + weight numpad) · `kitchen-station-tabs.tsx` · `kitchen-priority-reorder.tsx` (drag-drop) | ~500-line component without split; real-time + drag-drop + fallback polling + station routing all compete for complexity |
| **21** | `analytics-dashboard.tsx` (layout + date range state) · `analytics-revenue-section.tsx` (stat cards + trend chart) · `analytics-orders-section.tsx` (order stats + by-hour chart) · `analytics-menu-table.tsx` (top/slowest items) · `analytics-ratings-section.tsx` · `analytics-export-button.tsx` · individual chart files per chart type (each ~80 lines) | 8 chart types + 5 sections = 600+ lines if merged; Recharts components should each live in their own file |

### Steps that do NOT need splitting (all components stay under 300 lines)

Steps 17 (queue display), 18 (push notifications), 19 (PDF/invoice), 22 (delivery integration),
23 (AI badges/sections), 24 (audit log viewer), 25 (loyalty + customer account), 26–28.

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
- [x] **Step 3** — Auth: email+password JWT, PIN auth, NextAuth.js (`apps/web`)
- [x] **Step 4** — Dynamic RBAC: role/permission engine + middleware (`apps/web`)
- [x] **Step 5** — FBQRSYS: merchant management UI — create, view, suspend (`apps/web/(fbqrsys)`)
- [x] **Step 6** — Merchant subscription & billing: plans, invoices, auto-lock, email reminders (`apps/web/(fbqrsys)`)

### Phase 3 — Merchant POS
- [x] **Step 7** — Merchant onboarding: trial/free tier flow, plan selection (`apps/web/(merchant)`)
- [x] **Step 8** — Restaurant branding settings + CSS variable injection (`apps/web/(merchant)` + `apps/menu`)
- [x] **Step 9** — merchant-pos: menu & category management, layouts, allergens, CSV import, **per-branch item availability toggle (BranchMenuOverride UI)**, **PWA offline mode for merchant-pos** (`apps/web/(merchant)`)
- [x] **Step 10** — merchant-pos: table management, QR generation, floor map, **waiter-assisted order mode (POS places order on behalf of customer)** (`apps/web/(merchant)`)
- [x] **Step 11** — merchant-pos: promotions + discount codes (`apps/web/(merchant)`) ⚠ pre-split

### Phase 4 — Customer Ordering (end-user-system)
- [x] **Step 12** — QR validation + branded menu, Grid layout, dine-in, **shareable browse-only menu URL** (`apps/menu`) ⚠ pre-split
- [x] **Step 13** — List, Bundle, Spotlight layouts (`apps/menu`) ⚠ pre-split
- [x] **Step 14** — Item detail modal: variants, add-ons, allergens (`apps/menu`) ⚠ pre-split
- [x] **Step 15** — Cart + pre-invoice + Midtrans QRIS + cash option + **split payment / Patungan (multi-person checkout)** (`apps/menu`) ⚠ pre-split
- [x] **Step 16** — Order tracking screen: real-time status, Call Waiter, rating (`apps/menu`) ⚠ pre-split

### Phase 5 — Kitchen & Operations
- [x] **Step 17** — Takeaway / counter mode: counter QR, queue numbers, queue display screen (`apps/menu` + `apps/web/(kitchen)`)
- [x] **Step 18** — Push notifications: Web Push API, new order alert, Call Waiter alert (`apps/web`)
- [x] **Step 19** — Invoice + MerchantBillingInvoice PDF generation + Supabase Storage (shared)
- [ ] **Step 20** — merchant-kitchen: real-time queue, priority reordering, station tabs, queue number display, **PWA offline mode for kitchen display**, **kitchen ticket + receipt printing (node-thermal-printer)** (`apps/web/(kitchen)`) ⚠ pre-split

### Phase 6 — Analytics & Intelligence
- [ ] **Step 21** — merchant-pos: ROI analytics dashboard + accounting export (`apps/web/(merchant)`) ⚠ pre-split
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
