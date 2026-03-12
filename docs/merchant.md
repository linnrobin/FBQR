# FBQR — Merchant POS Reference

> **For AI agents:** Read this file when building Steps 7–11 (merchant onboarding, branding, menu management, table management, promotions), Step 20 (merchant-kitchen), Step 21 (analytics dashboard), or Step 25 (merchant loyalty). Cross-reference `docs/data-models.md` for full schema details and `docs/architecture.md` for ADRs.

---

## RBAC — Merchant Permissions & Roles

RBAC is **fully dynamic**. Permissions are system-defined; roles are user-created free-form names.

### How it works

```
Permission   ← System-defined atomic capability (hardcoded, maps to code gate)
    ↑
Role         ← User-created named bundle of permissions (any name, any permissions)
    ↑
RoleTemplate ← System-provided suggestion presets (hardcoded JSON, not DB records)
    ↑
UserRole     ← Assignment of a Role to a Staff member
```

**Permissions are system-defined** because they correspond to actual code checks (`requirePermission(session, 'menu:manage')`). New permissions are only added when new features are built.

**Roles are fully owned by the merchant.** A merchant owner can create "Koordinator Dapur" with `kitchen:manage` + `orders:view`. Role names are free-form text.

**Templates are suggestions only** — hardcoded as a JSON constant in `packages/config/roleTemplates.ts`. When a user picks a template in the UI, a new `MerchantRole` record is created with that template's permission list copied in. An agent building Step 4 must **NOT** create a `RoleTemplate` Prisma model.

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

### Merchant Role Templates (suggestions only)

| Suggested Name | Default Permissions |
|---|---|
| Owner | All |
| Supervisor | `menu:manage`, `promotions:manage`, `reports:read`, `orders:view`, `orders:manage`, `orders:refund`, `tables:manage`, `invoices:read` |
| Cashier | `orders:view`, `orders:manage`, `invoices:read` |
| Kitchen Admin | `kitchen:view`, `kitchen:manage`, `orders:view` |
| Kitchen Staff | `kitchen:view`, `orders:view` |

> **Owner accounts are special.** The Merchant owner (email + password) always has full access and cannot be stripped of permissions.

> **Staff.branchId null semantics:** A `null` branchId means **restaurant-level access** — the staff member can see all branches. All standard staff accounts created via the Staff management UI **must always have a branchId set** — the UI enforces this with a required branch selector. A null branchId is only valid when `multiBranchEnabled = false` (single-branch restaurant). When `multiBranchEnabled = true`, null branchId on a Staff record triggers a warning in the RBAC middleware.

---

## Audit Log

Every state-changing action is recorded in the `AuditLog` table. Always use the shared `auditLog()` helper — never write audit entries inline.

### Mandatory audit events

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

## Merchant Onboarding & In-App Guidance

> **A merchant who feels lost in the first 10 minutes will churn.** The system must guide them from "blank account" to "accepting first order" with zero support ticket.

### First-Login Setup Wizard

Displayed immediately after a merchant's first login. Blocking (cannot access dashboard until Step 1 and Step 3 are complete).

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

### Schema Fields

| Field | Type | Notes |
|---|---|---|
| `Merchant.onboardingStep` | int | 0 = not started, 1–5 = wizard step completed, 6 = wizard complete |
| `Merchant.onboardingChecklist` | JSON | Array of completed checklist item keys |
| `Merchant.wizardCompletedAt` | datetime? | Timestamp when wizard reached step 6 |

### Setup Completion Checklist (Persistent)

After wizard, a dismissible checklist card appears on the merchant-pos home dashboard. Stored in `Merchant.onboardingChecklist` (JSON array of completed keys).

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

### In-App Contextual Help

- `?` icon tooltip on every non-obvious setting (MerchantSettings, RBAC role editor, kitchen station config, tax settings)
- **Coach marks:** Shown once per feature area on first visit; stored in `Staff.seenCoachMarks: string[]`
  - First visit to kitchen display → highlight station tabs + priority drag handle
  - First visit to floor map → highlight "Pause Orders" toggle + table status colours
  - First visit to reports → highlight date range filter + export button
- **In-app help panel:** shadcn `Sheet` accessible from the `?` button in the main navigation. Contains:

  **FAQ — Top 15 questions (searchable, all content in locale files):**

  | # | Question (id locale default) | Category |
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

  **Video guides** (embedded, 60–90 seconds each):
  - "Setup pertama: dari daftar sampai terima pesanan pertama" (onboarding overview)
  - "Cara menambahkan dan mengatur menu"
  - "Cara menggunakan kitchen display"
  - "Cara membaca laporan penjualan"

  **Support contact** (values pulled from `PlatformSettings` — not hardcoded):
  - WhatsApp Business button → `PlatformSettings.supportWhatsapp`
  - Email → `PlatformSettings.supportEmail` (default: `support@fbqr.app`)
  - Response time label → `PlatformSettings.supportResponseMessage` (default: "Biasanya kami balas dalam 2 jam (07:00–22:00 WIB)")

### Empty State Guidance

| Screen | Empty state message | CTA |
|---|---|---|
| Menu categories (0 items) | "Belum ada kategori menu. Tambahkan kategori pertama untuk mulai menerima pesanan." | [ + Tambah Kategori ] |
| Tables (0 tables) | "Belum ada meja. Buat meja dan unduh QR code-nya untuk pelanggan." | [ + Tambah Meja ] |
| Staff (0 staff) | "Hanya Anda yang bisa login saat ini. Tambahkan staff untuk berbagi akses." | [ + Tambah Staff ] |
| Orders today (0 orders) | "Belum ada pesanan hari ini. Share QR code meja Anda ke pelanggan!" | [ Lihat QR Code ] |
| Kitchen display (no active orders) | "Dapur kosong — tidak ada pesanan aktif." | — |

---

## Merchant Subscription & Billing

> **Distinct from customer invoices.** `MerchantBillingInvoice` is FBQR billing the merchant for their subscription. `Invoice` is the merchant billing their customer for a meal. These are completely separate models, flows, and PDF templates.

### Subscription Plans

Plans are configurable from FBQRSYS (stored in `SubscriptionPlan` — not hardcoded). Example tiers:

| Tier | Typical Limits | Billing |
|---|---|---|
| Trial | Limited tables, basic features, no branding | Free, 14 days |
| Starter | 1 branch, up to 10 tables, no AI, no loyalty | Monthly or yearly |
| Pro | Multiple branches, unlimited tables, full AI, loyalty | Monthly or yearly |
| Enterprise | Custom limits, dedicated support | Custom |

### Billing Cycle

```
Subscription period starts
    │
7 days before renewal → email: "Your subscription renews on {date}"
    │
3 days before → reminder email
    │
Renewal date → payment attempted
    │
    ├── SUCCESS → MerchantBillingInvoice (PDF) → email → status: ACTIVE
    │
    └── FAILED → grace period (configurable, e.g. 3 days)
            │
            └── Grace expired → status: SUSPENDED (auto-lock, logged in AuditLog)
```

### Subscription Status Visible to Merchant

Merchant owners (with `billing:read`) see in settings:
- Current plan name and renewal date
- Download all FBQR subscription invoices
- Upgrade/downgrade plan button (future: self-service)

---

## Restaurant Branding (RestaurantBranding)

> **Scope:** Only `apps/menu` (customer-facing) is fully branded per restaurant. `merchant-pos` and `merchant-kitchen` retain FBQR's own UI chrome. FBQRSYS is never white-labeled.

| Field | Description |
|---|---|
| `logoUrl` | Restaurant logo shown in menu header |
| `bannerUrl` | Optional hero banner image at top of menu |
| `primaryColor` | Primary brand color (hex) — buttons, highlights, CTAs |
| `secondaryColor` | Secondary brand color (hex) — backgrounds, accents |
| `fontFamily` | Font from a curated list (Inter, Poppins, Lato, Playfair Display, etc.) |
| `borderRadius` | UI rounding style: `sharp` / `rounded` / `pill` |
| `menuLayout` | Default menu layout for the restaurant |
| `customCss` | Optional raw CSS overrides (FBQRSYS admin only — sanitized before storage) |

Branding is fetched once per customer session and applied via CSS custom properties (`--color-primary`, etc.). Changes take effect immediately without a rebuild.

---

## Dynamic Menu Layouts

The `end-user-system` supports **4 layout modes**. Restaurants set a default; each `MenuCategory` can independently override it.

Both `Restaurant.menuLayout` and `MenuCategory.menuLayoutOverride` use enum: `GRID | BUNDLE | LIST | SPOTLIGHT`

### Layout Modes

#### 1. Grid (Cafe style)
Best for: cafes, bakeries, bubble tea, dessert shops.
- 2–3 column grid depending on screen width
- Image-first cards, name + price below
- Category tabs pinned at top, scroll-spy active

#### 2. Package / Bundle style
Best for: fast casual, lunch set restaurants, value meals.
- Full-width card per item/combo
- Prominently shows bundle contents and savings
- Crossed-out original price for perceived value

#### 3. List (Kiosk style)
Best for: kiosks, warungs, food courts, restaurants with 50+ items.
- Dense, scannable, text-forward
- Small thumbnail (48×48) on the left
- Search bar always visible at top

#### 4. Spotlight (Fine dining style)
Best for: fine dining, omakase, small curated menus (under 20 items).
- One item per screen section (scroll to next)
- Full-width hero image, large
- Extended description, chef notes, allergen info
- Pagination indicator ("3 of 12")

### Per-Category Layout Override

`MenuCategory.menuLayoutOverride` — when set, that category renders in its own layout regardless of restaurant default.

Example: Restaurant default is Grid.
- "Signature Dishes" → override to Spotlight
- "Drinks" → override to List
- "Today's Sets" → override to Bundle

Merchants configure from branding/menu settings page. Preview renders in real-time before saving.

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

**Time-based availability:** A "Sarapan" category with `availableFrom: 06:00`, `availableTo: 11:00` is only shown between 6am and 11am WIB. All time comparisons use `Asia/Jakarta` timezone regardless of server timezone (Vercel default is UTC). Use `date-fns-tz` for WIB conversion.

---

## Menu Item — Full Field Specification

| Field | Type | Notes |
|---|---|---|
| `name` | string | Display name |
| `description` | string | Short description (shown in item detail) |
| `price` | int | IDR, no decimals |
| `imageUrl` | string | Supabase Storage path |
| `isAvailable` | bool | Soft toggle — hides from menu without deleting |
| `stockCount` | int? | If set, decrements when `Order → CONFIRMED` (not at PENDING creation). Atomic `UPDATE ... WHERE stockCount > 0`. If stock-out at webhook time: order pushed as CONFIRMED with ⚠️ flag; cashier offers substitution. Do NOT auto-refund immediately. **Stock restoration:** When order CANCELLED from CONFIRMED state, `stockCount` is restored in the same cancellation transaction. |
| `estimatedPrepTime` | int? | Minutes — shown to customer ("~15 min") |
| `isHalal` | bool | Shows Halal badge |
| `isVegetarian` | bool | Shows Vegetarian badge |
| `isVegan` | bool | Shows Vegan badge |
| `allergens` | string[] | e.g. `["nuts", "dairy", "gluten"]` — shown as warning badges |
| `spiceLevel` | int? | 0 = none, 1 = mild, 2 = medium, 3 = hot — shown as 🌶️ count |
| `sortOrder` | int | Display order within category |
| `autoResetAvailability` | bool | Default `false`. If `true`, midnight cron sets `isAvailable = true` daily. **Constraint: ignored when `stockCount IS NOT NULL`.** API returns validation error if both are set. |
| `priceType` | enum | `FIXED` (default) \| `BY_WEIGHT` — see Weight-Based Pricing below |
| `pricePerUnit` | int? | Required when `priceType = BY_WEIGHT`. IDR per unit (e.g. 50000 per 100g) |
| `unitLabel` | string? | Display unit for weight items (e.g. `"per 100g"`, `"per ekor"`, `"per kg"`) |
| `depositAmount` | int? | Upfront charge at checkout for `BY_WEIGHT` items. Final price settled after weighing. |
| `kitchenStationOverride` | string? | Per-item station override (overrides category-level assignment) |
| `deletedAt` | datetime? | Soft delete — preserved in order history |

---

## Weight-Based Pricing

> **Required for seafood/ikan bakar segment.** Items sold by weight at market price.

### How it works

```
Customer orders "Kepiting Saus Padang" (priceType: BY_WEIGHT)
    │
Checkout shows: Rp 50.000 deposit (depositAmount) — not the final price
Customer pays deposit via Midtrans (or cash)
    │
Order → CONFIRMED → pushed to kitchen with ⚖️ "Needs weighing" flag on OrderItem
    │
Kitchen/cashier weighs item → enters actual weight in merchant-pos
System calculates: finalPrice = pricePerUnit × weight
lineTotal updated: finalPrice − depositAmount = remaining charge
    │
[Charge Remaining Balance]
Customer pays remaining amount (QRIS or cash)
Second Payment row created linked to same Order
Invoice updated with final amounts
```

### Schema additions for weight-based items

| Model | Field | Type | Notes |
|---|---|---|---|
| `MenuItem` | `priceType` | enum | `FIXED` \| `BY_WEIGHT` |
| `MenuItem` | `pricePerUnit` | int? | IDR per unit |
| `MenuItem` | `unitLabel` | string? | `"per 100g"`, `"per ekor"`, etc. |
| `MenuItem` | `depositAmount` | int? | Upfront deposit; null = Rp 0 |
| `OrderItem` | `weightValue` | decimal? | Actual weight entered by staff |
| `OrderItem` | `weightUnit` | string? | Unit matching `MenuItem.unitLabel` |
| `OrderItem` | `needsWeighing` | bool | `true` when `BY_WEIGHT` and weight not yet entered |
| `OrderItem` | `finalLineTotal` | int? | Calculated after weighing; null until weighed |

### Staff Flow (merchant-pos)

```
Kitchen display shows ⚖️ "Needs weighing" badge on relevant OrderItems
    │
Staff weighs item → opens OrderItem in merchant-pos → enters weight value
    │
    ├── Remaining balance > 0 → [Charge Customer Rp XXX] button
    │     → second Payment row (paymentType: BALANCE_CHARGE)
    │     → same payment channel as original order
    │     → Session TTL extended while any OrderItem has needsWeighing = true
    │
    └── Remaining balance = 0 → no action needed
```

### Constraints

- `BY_WEIGHT` items can have variants — variant price deltas applied to `depositAmount`, not `pricePerUnit`
- `BY_WEIGHT` items cannot use `stockCount` (incompatible)
- `Payment.paymentType` field (enum: `DEPOSIT` | `BALANCE_CHARGE` | `FULL`) — add to Payment model in Phase 1 Prisma

---

## Menu Item Variants & Add-ons

Each `MenuItem` can have:
- **Variants** (mutually exclusive): e.g. Size → Small / Medium / Large
- **Add-ons** (optional, multi-select): e.g. Extra Cheese (+5,000), No Onion (0)

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

> **Step 11 dependency.** This model must be defined before Step 11 is built.

| Field | Type | Notes |
|---|---|---|
| `id` | string | UUID |
| `restaurantId` | string | FK → Restaurant |
| `name` | string | Display name shown to customer and in merchant-pos |
| `type` | enum | `PERCENTAGE` \| `FIXED_AMOUNT` \| `BOGO` \| `FREE_ITEM` |
| `discountValue` | int | Percentage (e.g. 20 = 20%) for PERCENTAGE; IDR for FIXED_AMOUNT; unused for BOGO/FREE_ITEM |
| `maximumDiscountAmount` | int? | Cap on PERCENTAGE discounts; null = no cap |
| `minimumOrderValue` | int? | Minimum subtotal (IDR) required; null = no minimum |
| `applicableTo` | enum | `ALL_ITEMS` \| `SPECIFIC_CATEGORIES` \| `SPECIFIC_ITEMS` |
| `applicableItemIds` | string[] | IDs of `MenuItem` or `MenuCategory` records; empty array when `ALL_ITEMS` |
| `code` | string? | Customer-entered promo code (e.g. "PROMO10"); null = auto-applied |
| `usageLimit` | int? | Total platform-wide uses; null = unlimited |
| `usageCount` | int | Running count of redemptions (incremented transactionally at Order CONFIRMED) |
| `perCustomerLimit` | int? | Max redemptions per registered customer; null = unlimited; not enforced for anonymous sessions |
| `validFrom` | datetime? | Start time; null = active immediately |
| `validTo` | datetime? | End time; null = no expiry |
| `isActive` | bool | Manual toggle; false overrides all other validity conditions |
| `deletedAt` | datetime? | Soft delete — preserved in order history |

**BOGO logic:** When customer adds ≥ 2 of an eligible item, the second is free. The free `OrderItem` has `lineTotal = 0` and carries `promotionId`.

**FREE_ITEM logic:** A specific free item is added to cart automatically when `minimumOrderValue` is met. The free `OrderItem` has `unitPrice = 0` and carries `promotionId`.

**Stacking rule:** Only one promotion applies per order by default. Configure `MerchantSettings.allowPromotionStacking: bool` (default false). When false, highest-value eligible promotion wins.

---

## Table Status Management

| Status | Description |
|---|---|
| `AVAILABLE` | No active session — QR scan starts a new CustomerSession |
| `OCCUPIED` | Active customer session in progress |
| `RESERVED` | Reserved — QR scan blocked; customer sees "This table is reserved. Please ask staff." |
| `DIRTY` | Session ended, needs cleaning — QR scan blocked; customer sees "This table is being prepared. Please ask staff." |
| `CLOSED` | Temporarily unavailable — QR scan blocked; customer sees "This table is currently unavailable. Please ask staff." |

### Table Status Transitions

| Transition | Who can trigger |
|---|---|
| `AVAILABLE → OCCUPIED` | System — automatically when first Order is `CONFIRMED` on this table |
| `OCCUPIED → DIRTY` | System — when `CustomerSession` moves to `COMPLETED` or `EXPIRED` (default flow) |
| `OCCUPIED → AVAILABLE` | System — when `CustomerSession` completes AND merchant has disabled DIRTY state in settings |
| `DIRTY → AVAILABLE` | Staff (cashier/supervisor/owner) taps "Mark Clean" on floor map |
| `AVAILABLE → RESERVED` | Staff via merchant-pos floor map |
| `RESERVED → AVAILABLE` | Staff via merchant-pos |
| `AVAILABLE → CLOSED` | Staff or FBQRSYS admin |
| `CLOSED → AVAILABLE` | Staff or FBQRSYS admin |
| `OCCUPIED → CLOSED` | Not allowed — must close session first |
| `DIRTY → CLOSED` | Staff or FBQRSYS admin |

**DIRTY state is opt-in:** Merchants configure `MerchantSettings.enableDirtyState` (default: `false`). When disabled, `OCCUPIED → AVAILABLE` directly. When enabled, `OCCUPIED → DIRTY` — staff must mark clean. The QR endpoint only rejects with "being prepared" if `enableDirtyState = true AND table.status = DIRTY`.

merchant-pos shows a real-time floor map of table statuses via Supabase Realtime.

---

## Kitchen Station Routing

Merchants create named **Kitchen Stations** from `merchant-pos` settings. When an order is placed, `OrderItem`s are automatically routed to the station that owns their category.

### Station Routing Priority (explicit precedence order)
1. `MenuItem.kitchenStationOverride` — if set, always wins
2. `MenuCategory.kitchenStationId` — if set and no item override
3. Restaurant default station — if neither is set

### Schema

| Model | Field | Type | Notes |
|---|---|---|---|
| `KitchenStation` | `id` | string | UUID |
| `KitchenStation` | `restaurantId` | string | Scoped to restaurant |
| `KitchenStation` | `name` | string | Free-form, e.g. "Bar", "Hot Kitchen", "Patisserie" |
| `KitchenStation` | `displayColor` | string? | Hex color for UI badge |
| `KitchenStation` | `isActive` | bool | Toggle station without deleting |
| `MenuCategory` | `kitchenStationId` | string? | Null = route to default station |
| `MenuItem` | `kitchenStationOverride` | string? | Per-item override |
| `OrderItem` | `kitchenStationId` | string | **Snapshot at order time — not a live FK** |

### Configuration (merchant-pos)

```
Settings → Kitchen Stations
    │
    ├── Create station: name + color
    ├── Assign categories to station (multi-select dropdown)
    └── Per-item overrides available in menu item edit view
```

### Station Deactivation Fallback

- **Historical `OrderItem`s** retain their snapshotted `kitchenStationId` — visible in "All" tab with ⚠️ "Station deactivated" badge
- **New orders** with a deactivated station fall back to the default station — FK on `MenuCategory` is NOT nullified (preserved for re-activation)
- **Merchants cannot delete** a station with active (CONFIRMED/PREPARING/READY) OrderItems

### Display in merchant-kitchen

- Station filter tab bar: "All" + one tab per active station
- Station badge (colored pill) shown on each OrderItem card in "All" view
- Priority drag-and-drop is scoped per station

---

## Kitchen Display — Order Card Format

Every order card must show, in this visual hierarchy:

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

| Element | Source | Notes |
|---|---|---|
| Table identifier | `Order → CustomerSession → Table.name` | Always the first thing visible |
| Order number | `Order.queueNumber` | All order types; secondary to table name for dine-in |
| Order type badge | `Order.orderType` | 🪑 Dine-in / 🥡 Takeaway / 🛵 Delivery |
| Time placed | `Order.createdAt` | HH:MM only |
| Item lines | `OrderItem` rows | Quantity × name |
| Station badge | `OrderItem.kitchenStationId` snapshot | Colored pill; shown on "All" tab only |
| Special badges | Per OrderItem | ⚖️ Needs weighing, ⚠️ Stock-out flag, 🔥 high priority |
| Customer note | `Order.customerNote` | Free-text; shown only if non-empty |
| Elapsed timer | Live, from `Order.confirmedAt` | Turns yellow at 10 min, red at 20 min (thresholds configurable) |

**Delivery orders:** show driver ETA instead of table: "🛵 GrabFood — Driver arrives ~12:50"
**Takeaway orders:** show queue number prominently: "🥡 Takeaway — #042"

---

## Kitchen Order Priority

- Each `OrderItem` has a `kitchenPriority` integer field (default: order of insertion)
- **Priority is scoped per station** — reordering at Bar does not affect Kitchen queue
- Kitchen staff can drag-and-drop or use up/down controls to reprioritize within their station tab
- Priority changes are real-time (Supabase Realtime broadcast)
- Priority reordering is logged in `AuditLog`
- In "All" tab, items are sorted by station then by priority — not globally sortable

---

## Kitchen Load Control

Two complementary mechanisms to prevent kitchen overwhelm:

### 1. Auto-cap via `maxActiveOrders`

When `MerchantSettings.maxActiveOrders` is set, the order creation API enforces the cap atomically:

```sql
INSERT INTO "Order" (...)
SELECT ... WHERE (
  SELECT COUNT(*) FROM "Order"
  WHERE restaurantId = X AND status IN ('CONFIRMED', 'PREPARING')
) < $maxActiveOrders
-- affectedRows = 0 → cap reached → return HTTP 503
```

Customer sees: "Dapur sedang sibuk. Silakan coba dalam beberapa menit."

The cap auto-lifts as orders move to `READY` or `COMPLETED`.

> **Important for PAY_AT_CASHIER:** The cashier [Confirm] action also checks `maxActiveOrders` at confirmation time (not at order creation time). If cap is reached, cashier sees: "Dapur sudah penuh (X aktif). Konfirmasi setelah ada pesanan selesai."

### 2. Manual pause via `orderingPaused`

Staff toggle in merchant-pos floor view:

```
[ Pause New Orders ]  ←→  [ Resume Orders ]
```

- Toggle stored in `MerchantSettings.orderingPaused` (DB-persisted, survives server restart)
- Takes effect immediately on all active customer sessions
- Logged in `AuditLog`
- Customer sees `orderingPausedMessage` (custom or default)
- Existing orders in kitchen are **not affected**
- merchant-pos header shows prominent banner: 🔴 **Ordering is paused**

---

## Tax & Service Charge (MerchantSettings)

| Setting | Default | Notes |
|---|---|---|
| `taxRate` | `0.11` (11%) | PPN — standard Indonesia VAT |
| `taxLabel` | `"PPN"` | Display label |
| `serviceChargeRate` | `0.00` | Optional service charge (e.g. 5–10%) |
| `serviceChargeLabel` | `"Service"` | Display label |
| `taxOnServiceCharge` | `true` | If true, PPN applied to (subtotal + serviceCharge). Default true per Indonesian PPN regulation. |
| `pricesIncludeTax` | `false` | If true, displayed prices are tax-inclusive |
| `paymentMode` | `PAY_FIRST` | `PAY_FIRST` or `PAY_AT_CASHIER` |
| `paymentTimeoutMinutes` | `15` | Minutes before PENDING order auto-expires; also passed as `custom_expiry` to Midtrans snap_token |
| `lateWebhookWindowMinutes` | `60` | Minutes after expiry during which a SUCCESS webhook revives the order |
| `maxPendingOrders` | `3` | Max concurrent PENDING orders per CustomerSession |
| `maxOrderValueIDR` | `5000000` | Max single-order value in IDR; fraud guard |
| `enableDirtyState` | `false` | If true, table moves to DIRTY after session ends |
| `tableSessionTimeoutMinutes` | `120` | Minutes of inactivity before CustomerSession auto-expires |
| `eodCashCleanupHour` | `3` | Hour (0–23, WIB) for safety-net cron to cancel abandoned PENDING_CASH orders |
| `roundingRule` | `NONE` | `NONE`, `ROUND_50`, or `ROUND_100`. Cash merchants should use `ROUND_100`. Raw values always stored; only display/charged amount is rounded. |
| `maxActiveOrders` | `null` | If set, new orders rejected when CONFIRMED+PREPARING count reaches this limit |
| `orderingPaused` | `false` | Manual kill-switch — no new orders when true |
| `orderingPausedMessage` | `null` | Custom message shown to customers when ordering is paused |

### Tax Computation Formula (ADR-013)

When `pricesIncludeTax = false` (default):
- `serviceCharge = round(subtotal × serviceChargeRate)`
- `taxBase = taxOnServiceCharge ? (subtotal + serviceCharge) : subtotal`
- `tax = round(taxBase × taxRate)`
- `total = subtotal + serviceCharge + tax`

When `pricesIncludeTax = true`:
- `taxAmount = round(price × taxRate / (1 + taxRate))` (back-calculated)
- Total = subtotal (prices already include tax)

All amounts stored as integers (IDR). Rounding uses `Math.round()`.

---

## Multi-Branch Per Merchant Account

**1 Merchant account = 1 Restaurant brand. Always.**

The three-level hierarchy:
- `Merchant` = owner account (login, billing, subscription)
- `Restaurant` = the brand (menu, branding, settings) — exactly one per Merchant
- `Branch` = physical location of that brand — one or many per Restaurant

Multi-branch is **not self-service** — enabled via FBQRSYS admin after EOI review.

### Branch-Level vs Restaurant-Level Data

**Each Branch owns:**
- Tables (and their QR codes)
- Staff assignments
- Branch-level order history and reports

**Shared across all branches (restaurant level):**
- Menu (categories, items, variants, add-ons)
- Branding
- Promotions
- Kitchen stations
- Merchant settings (tax, service charge, payment methods)

### What the merchant sees (merchant-pos)

- **Branch selector** at top of merchant-pos (when `multiBranchEnabled = true`)
  - "All Branches" (default) — aggregate view
  - Individual branch — drill-down
- Staff accounts are scoped to one branch — no selector shown to them

### Schema Fields

| Model | Field | Notes |
|---|---|---|
| `Merchant` | `multiBranchEnabled` | bool — set by FBQRSYS admin only; default false |
| `Merchant` | `branchLimit` | int — max branches allowed; set by FBQRSYS admin |
| `Restaurant` | `merchantId` | FK to owning Merchant (unique — enforces 1-to-1) |
| `Branch` | `restaurantId` | FK to owning Restaurant |
| `Branch` | `platformStoreId` | string? — delivery platform store identifier for dynamic webhook routing |

> **Per-branch item availability override** (Phase 2): A `BranchMenuOverride` junction model (`branchId`, `menuItemId`, `isAvailable`) allows per-branch item toggles without duplicating the menu. Stub this table in Phase 1 Prisma. **Do NOT add separate menus per branch** — the menu is always shared at restaurant level (ADR-019).

---

## Takeaway / Counter Mode

`Order.orderType` enum: `DINE_IN | TAKEAWAY | DELIVERY`

### Counter / Takeaway Flow

```
Customer walks up to counter
    │
    ├── Option A: Scan QR at counter
    ├── Option B: Staff inputs order on merchant-pos
    └── Option C: Order from delivery platform (GrabFood/GoFood)
    │
Customer gets a queue number (e.g. "Order #042")
    │
Order queue display (large screen) shows pending + ready numbers
    │
Kitchen prepares → marks READY → display highlights #042 as ready
```

### Order Queue Display (`/kitchen/queue-display`)

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

- Real-time via Supabase Realtime
- Queue numbers auto-generated per branch per day (reset at WIB midnight via `QueueCounter`)
- Ready numbers shown for configurable duration, then cleared

### Cash / "Pay at Counter" Flow

```
Customer submits order (selects "Bayar di Kasir")
    │
Order created: status PENDING
Payment created: method CASH, status PENDING_CASH, provider null
Kitchen does NOT see this order
    │
merchant-pos shows alert: "New cash order — Table X — awaiting cashier"
    │
Cashier reviews → collects cash
    │
    ├── [Confirm & Send to Kitchen]
    │       Checks maxActiveOrders at confirm time
    │       Payment.status → SUCCESS; Order.status → CONFIRMED
    │       Order pushed to kitchen (same Supabase Realtime event as digital)
    │
    └── [Reject Order]
            Order.status → CANCELLED; customer notified
```

---

## AI / Smart Recommendation Features

All features are configurable per merchant via `MerchantSettings`. All recommendation logic runs server-side (pure SQL analytics initially; ML upgrade path available).

| Feature | Setting Key | Description |
|---|---|---|
| Best-seller highlights | `aiShowBestsellers` | Items ranked by order frequency in last 30 days |
| Personalized suggestions | `aiPersonalized` | Based on current cart (collaborative filtering on order history) |
| Upsell prompts | `aiUpsell` | "Add a drink?" suggestions at checkout |
| Time-based recommendations | `aiTimeBased` | Breakfast/lunch/dinner items surfaced by time of day |

---

## Customer Loyalty — Merchant Tier

Each restaurant can run its own independent loyalty program if enabled in `MerchantSettings`.

- Merchant sets program name, exchange rate (IDR per point), and redemption rules
- `pointsCalculationBasis` on `MerchantLoyaltyProgram`: `SUBTOTAL` (default, based on pre-discount item total) or `TOTAL` (based on final paid amount)
- Points are scoped to that restaurant only — do not transfer between restaurants
- One active program per restaurant at a time (unique constraint on `restaurantId WHERE isActive = true`)
- Historical programs retained for balance integrity (existing customer point balances remain valid)
- Points credited per order at the moment each `Order` moves to `CONFIRMED` (not at session close)
- Merchants view top customers and loyalty analytics in merchant-pos reports

### Gamification (Phase 2 UI, Phase 1 Schema)

Schema (`LoyaltyTier`, title field on `MerchantLoyaltyBalance`) supports:
- Custom customer titles (e.g. "Japan-kun", "Ramen Shogun") — fully customizable
- Tier thresholds (Bronze/Silver/Gold or custom names) with different multipliers
- Streaks ("Visited 5 weeks in a row" badge)
- First-time visitor reward

---

## Merchant Owner Dashboard

### Live Operations Panel (real-time via Supabase Realtime)

| Widget | Description |
|---|---|
| Active orders | Count in `PENDING`, `CONFIRMED`, `PREPARING`, `READY` |
| Tables occupied | X of Y tables currently `OCCUPIED` |
| Open waiter requests | Count grouped by type (🔔 Call / 🤝 Assistance / 💳 Bill) |
| Today's revenue so far | Running IDR total (gross) |
| Today's order count | Running count |
| Avg wait time today | Average `CONFIRMED → READY` duration |
| Ordering status | 🟢 Accepting / 🔴 Paused — prominent toggle |

### Revenue Analytics

| Metric | Description |
|---|---|
| Revenue today / this week / this month / custom range | IDR with % change vs prior period |
| Revenue trend chart | Daily bar chart for selected period |
| Revenue by order type | Dine-in / Takeaway / Delivery split |
| Revenue by payment method | QRIS / Cash / GoPay / OVO / VA |
| Tax collected | PPN amount for accounting |
| Service charge collected | Amount for accounting |
| **Gross revenue** | Sum of all `Order.grandTotal` for confirmed orders |
| **Estimated payment gateway fees** | QRIS × 0.7%, EWALLET × 2%, VA × Rp 4.000, CARD × 2.9% — labeled as estimates |
| **Net revenue (est.)** | Gross − gateway fees − tax |
| **Cash vs digital split** | IDR and % — for reconciliation |

> Fee transparency is critical — Indonesian owners ask "berapa yang saya terima?" immediately. Show the breakdown to build trust.

### Other Analytics Sections

- **Order analytics:** AOV, orders by hour (peak heatmap), orders by day of week, cancellation rate
- **Menu performance:** Top 10 by revenue, top 10 by order count, slowest-moving items, AI recommendation impact
- **Table & session analytics:** Turnover rate, avg spend per table, busiest tables
- **Staff performance** (requires `staff:manage`): Orders processed, avg handling time, waiter requests resolved
- **Customer & loyalty analytics** (if loyalty enabled): Registered customers, points issued/redeemed, retention rate
- **Ratings & feedback:** Average rating 1–5 stars, recent comments, items with lowest ratings

### Multi-Branch Aggregate View

When "All Branches" is selected:
- Overview cards: total revenue, total orders, best-performing branch, fastest-growing branch
- **Branch comparison table** (sortable): branch name, revenue, orders, AOV, avg rating, active tables
- **Consolidated accounting export:** single branch or all branches with `branchName` column added

---

## Accounting Export

| Export format | Notes |
|---|---|
| Excel (.xlsx) | Itemized order report, daily/weekly/monthly, filterable by date range |
| CSV | Same as Excel but for any accounting tool |
| Accurate Online | Indonesia's most popular SME accounting software — direct integration (Phase 2) |
| Jurnal.id | Alternative popular Indonesian accounting tool (Phase 2) |

All exports include: date, order ID, items, quantities, prices, tax, service charge, payment method, discount applied.

---

## Menu Import / Migration Tool

### Import Options

| Method | Use case |
|---|---|
| CSV import | Merchant exports from existing POS/Excel; FBQR provides a template CSV |
| Manual bulk entry UI | Streamlined form for quickly entering many items |

### CSV Template Format

```csv
category,name,description,price,isHalal,isVegetarian,spiceLevel,variants,addons
Seafood,Kepiting Saus Padang,"Kepiting segar...",185000,true,false,2,"","Extra Nasi:10000"
```

Photos cannot be imported via CSV — merchant uploads images per item after import.

---

## Post-Order Customer Rating

After an order is marked COMPLETED:
- Customer sees a 1–5 star prompt on their order tracking screen ("Bagaimana makanannya?")
- Optional text comment
- Rating is stored per `Order` (not publicly visible by default)
- Merchant dashboard shows average rating, recent comments, trend over time

---

## Permanent Free Tier (Warung / Lite Mode)

| Tier | Price | Limits |
|---|---|---|
| **Free / Warung** | Rp 0 forever | 1 branch, 5 tables, 30 menu items, List layout only, no AI, no branding, FBQR watermark |
| **Starter** | Paid monthly | 1 branch, 15 tables, all layouts, branding, basic AI |
| **Pro** | Paid monthly | Multiple branches, unlimited, full AI, loyalty, delivery integration |

Free tier retention features:
- FBQR logo/watermark on customer menu (marketing for FBQR)
- "Upgrade" prompt when limits are hit (gentle nudge, not hard block)
- Offline capability works on Free tier

---

## Delivery Platform Integration

Phase 1: manual entry of delivery orders in merchant-pos.
Phase 2: automated webhook integration per platform.

| Platform | Integration Method |
|---|---|
| GrabFood | GrabFood Merchant API + webhook (HMAC-SHA256 auth) |
| GoFood (Gojek) | Gojek Merchant API (OAuth 2.0 bearer token) |
| ShopeeFood | ShopeeFood Merchant API |

Delivery orders appear on `merchant-kitchen` exactly like dine-in — same queue, same priority controls. Kitchen staff see order type badge (🛵).

Delivery-specific fields on `Order`:
- `platformName`: `GRABFOOD | GOFOOD | SHOPEEFOOD`
- `platformOrderId`: external reference (unique constraint scoped to `platformName` for idempotency)
- `estimatedPickupTime`: when the driver will arrive

Webhook routing uses `Branch.platformStoreId` to match the payload's store identifier to the correct branch.

---

## Public REST API & Webhooks (Phase 2 Schema, Phase 1 Stub)

Merchants can integrate external systems (accounting, inventory) via REST API + webhooks. Schema must be stubbed in Phase 1 Prisma; UI ships in Phase 2.

### Key Schema (stub in Phase 1)

```
MerchantApiKey  — bearer token auth for REST API; permissions scoped to merchant
WebhookEndpoint — HTTPS endpoint subscribed to events; signed with HMAC-SHA256
WebhookDeliveryLog — audit log of every webhook attempt
```

### Webhook Events

| Event | Common use case |
|---|---|
| `order.confirmed` | Trigger inventory deduction in external system |
| `order.status_changed` | Sync to delivery aggregator dashboard |
| `order.cancelled` | Restore stock in external inventory |
| `payment.received` | Sync to Accurate Online / Jurnal.id |
| `stock.depleted` | Alert purchasing system to reorder |
| `session.closed` | Trigger loyalty sync or end-of-day export |

---

## Self-Service Merchant Registration

> **Both admin-created and self-service signup paths must be supported.** Self-service is the scalable acquisition model; admin-created is for enterprise/negotiated accounts.

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

### Schema Addition

`Merchant.emailVerifiedAt: DateTime?` — unverified merchants can access the wizard but the QR menu endpoint rejects customer scans until `Merchant.emailVerifiedAt IS NOT NULL`.

### Admin-Created Path

FBQRSYS admin fills a simpler form (email, restaurant name, plan). System creates the same records, skips email verification (admin vouches), and emails the merchant a "set your password" link (password reset flow with a first-time flag).

---

## UI & Design Standards (Merchant Apps)

> **The merchant-pos is used under pressure at dinner rush.** If it's slow, confusing, or requires multiple taps to do a simple task, restaurant operations suffer and the owner churns. Apply these standards to all merchant-facing UI in `apps/web`.

### Design Philosophy by App

| App | Target feeling | Reference products |
|---|---|---|
| `apps/web` merchant-pos | Clean, fast, zero clutter — works under pressure at dinner rush | Linear, Notion, Vercel dashboard |
| `apps/web` merchant-kitchen | High contrast, glanceable at 3 metres, touch-friendly | Airport departure boards, Grafana dashboards in dark mode |
| `apps/web` FBQRSYS | Professional B2B admin — trustworthy and data-dense | Stripe dashboard, Vercel admin |

### Design Tokens (shared via `packages/config/tokens`)

```ts
// Color palette
primary:   '#E8622A'   // warm coral-orange — energy, appetite, Indonesian warmth
surface:   '#FAFAF9'   // off-white — cleaner than pure white
neutral:   '#1C1917'   // stone-950 — body text
muted:     '#78716C'   // stone-500 — secondary text
border:    '#E7E5E4'   // stone-200 — dividers

// Status colors (consistent across all apps)
success:   '#16A34A'   // green-600
warning:   '#D97706'   // amber-600
danger:    '#DC2626'   // red-600
info:      '#2563EB'   // blue-600

// Font: Geist Sans (Next.js default)
// Border radius: --radius: 0.625rem (shadcn default)
```

> **`apps/menu` branding override:** Every color token above can be overridden per restaurant via CSS custom properties injected at session load time (`--color-primary`, `--color-surface`, etc.). The palette above is FBQR's default — applied to the demo restaurant and to merchants who have not customised branding. Overrides are applied within 50ms of session load (no flash of unstyled menu). See `docs/customer.md` for implementation detail.

### Typography Scale

```
Display:  36px / 40px / 700   — hero headings (apps/menu only — item spotlight, welcome banners)
H1:       30px / 36px / 700   — page titles
H2:       24px / 32px / 600   — section headings
H3:       20px / 28px / 600   — card headings
Body:     16px / 24px / 400   — default body text
Small:    14px / 20px / 400   — secondary labels, metadata
Micro:    12px / 16px / 400   — badges, timestamps, table captions
Mono:     14px / 20px / 400   — invoice numbers, order IDs, code
```

> The `Display` level is used only in `apps/menu` — it is not used in merchant-pos or FBQRSYS. For `apps/menu`, the font family is overridden per restaurant via `RestaurantBranding.fontFamily`.

### Component Rules

**Loading states — always use skeletons, never spinners:**
```tsx
// ✅ Correct
<Skeleton className="h-4 w-[200px]" />
// ❌ Wrong
<Spinner />
```

**Empty states — never show a blank div.** Every list, table, and grid must have:
1. Explanation of why it is empty (not just "No data")
2. Next action the user should take
3. Relevant icon (not stock clipart)

**Toast notifications — use Sonner (ships with shadcn/ui):**
```ts
toast.success('Menu berhasil disimpan')
toast.error('Gagal menyimpan. Periksa koneksi internet Anda.')
toast.info('3 pesanan baru masuk')
```

**Confirmation dialogs — only for destructive or irreversible actions:**
- ✅ Deleting a menu item, cancelling an order, revoking staff access
- ❌ Saving a form, changing a toggle — save immediately with a toast

### Animation (Framer Motion)

```ts
// Page transitions — subtle fade + slight upward slide
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 }
}
transition: { duration: 0.15, ease: 'easeOut' }

// List item stagger (kitchen display)
transition: { staggerChildren: 0.04 }
```

**Rule:** Animation must never slow down a task. If an animation makes staff wait, remove it.

### Responsive Breakpoints

```
apps/web (merchant-pos):  Tablet (1024px) as minimum — kitchen staff use iPads
                           Desktop (1280px+) — primary for merchant owner dashboard
merchant-kitchen:          1080p landscape (1920×1080) — TV/monitor in kitchen
FBQRSYS:                   Desktop only (1280px+) — platform admin at workstation
```

### Accessibility Baseline

- **WCAG 2.1 AA** minimum for all interactive elements
- All interactive elements reachable by keyboard (`Tab`, `Enter`, `Space`, `Esc`)
- Colour contrast ratio ≥ 4.5:1 for body text, ≥ 3:1 for large text
- Focus ring always visible (Tailwind `focus-visible:ring-2`)
- `aria-label` on icon-only buttons

### Code Quality

- No inline styles — Tailwind only (exception: dynamic CSS custom properties for branding in `apps/menu`)
- No magic numbers — use Tailwind spacing/color tokens
- Components in `packages/ui` must be truly generic (no business logic)
- Business-aware components live in each app's `components/` directory
- Every new page component needs a `loading.tsx` (Next.js built-in skeleton)
- Every new page component needs an `error.tsx` (Next.js built-in error boundary)

---

## Internationalisation (i18n)

> **No Indonesian strings hardcoded in JSX/TSX.** The system uses `next-intl` for all user-facing text. The Indonesian strings documented throughout these docs files are the **default content for the `id` locale** — they are documentation specs, not code values.

### Convention

- All user-facing strings use `useTranslations()` hook: `t('menu.empty.title')`
- Default locale: `id` (Bahasa Indonesia)
- Locale files live in `messages/id.json`, `messages/en.json`, etc.
- English translations are AI-generated (GPT-4 / Claude) and human-reviewed before release
- Other languages added as needed — `next-intl` routing handles `/id/`, `/en/`, etc.
- **Exception:** Database seed data (category names, staff role template names, etc.) use locale-aware seed scripts with per-locale values

### What this means for AI agents building UI

When you write a component with a string like `"Belum ada kategori menu"`:
1. Add the key to `messages/id.json`: `"menu.categories.empty.title": "Belum ada kategori menu"`
2. Add the English equivalent to `messages/en.json`: `"menu.categories.empty.title": "No menu categories yet"`
3. Use in JSX: `<p>{t('menu.categories.empty.title')}</p>`

Never write `<p>Belum ada kategori menu</p>` directly.

### Scope

- `apps/web` (merchant-pos, FBQRSYS, kitchen): all UI strings
- `apps/menu` (customer): all UI strings — the menu app is the highest-visibility surface for non-Indonesian customers
- Restaurant branding (restaurant name, menu item names, category names): stored in DB as-entered by merchant; **not** translated by next-intl. Merchants who want multilingual menus configure per-item translations themselves (Phase 2 feature).

---

## Merchant Settings Panel

> **Every configurable value must be in the settings panel, not hardcoded.** A merchant who cannot change their WhatsApp number or opening hours without filing a support ticket will churn.

### What the Merchant Settings Panel covers

Accessible from `merchant-pos → Settings`. Sections:

#### General
| Setting | Field | Notes |
|---|---|---|
| Restaurant name | `Restaurant.name` | |
| Cuisine type | `Restaurant.cuisineType` | e.g. Indonesian, Chinese, Western |
| Logo | `RestaurantBranding.logoUrl` | Supabase Storage upload |
| Banner | `RestaurantBranding.bannerUrl` | Optional hero image |

#### Contact & Socials
| Setting | Field | Notes |
|---|---|---|
| WhatsApp Business number | `Restaurant.whatsappNumber` | Shown as "Contact Us" button on `apps/menu` |
| Instagram handle | `Restaurant.instagramHandle` | Optional; shown on menu footer |
| TikTok handle | `Restaurant.tiktokHandle` | Optional |
| Google Maps URL | `Restaurant.googleMapsUrl` | Optional; "Get Directions" button |
| Reservation email | `Restaurant.reservationEmail` | Where reservation requests are forwarded (Phase 2) |

#### Opening Hours
Per-branch opening hours. Set via a visual day-of-week editor. Stored as `Branch.openingHours: JSON`.

```json
{
  "mon": { "open": "09:00", "close": "22:00", "isClosed": false },
  "tue": { "open": "09:00", "close": "22:00", "isClosed": false },
  "wed": { "open": "09:00", "close": "22:00", "isClosed": false },
  "thu": { "open": "09:00", "close": "22:00", "isClosed": false },
  "fri": { "open": "09:00", "close": "23:00", "isClosed": false },
  "sat": { "open": "09:00", "close": "23:00", "isClosed": false },
  "sun": { "open": "11:00", "close": "21:00", "isClosed": false }
}
```

- Times stored as `HH:MM` strings in 24h format; compared in `Asia/Jakarta` (WIB)
- `isClosed: true` = closed all day (e.g. some warungs close on Sunday)
- Displayed on `apps/menu` header — "Open today: 09:00–22:00" or "Closed today"
- **Does not block orders** — it is informational only. Merchants who want to block orders outside hours use `orderingPaused` or `maxActiveOrders = 0`

#### Tax & Charges
Tax rate, service charge, `taxOnServiceCharge`, `pricesIncludeTax`, `roundingRule` — all from `MerchantSettings`.

#### Payment & Orders
`paymentMode`, `maxPendingOrders`, `maxOrderValueIDR`, `maxActiveOrders`, `orderingPaused`, `orderingPausedMessage`, `paymentTimeoutMinutes`, `lateWebhookWindowMinutes`, `tableSessionTimeoutMinutes`, `enableDirtyState`, `eodCashCleanupHour`.

#### Notifications
| Setting | Field | Notes |
|---|---|---|
| New order push notification | `MerchantSettings.pushNotifications.newOrder` (JSON) | On/Off toggle |
| Call Waiter push notification | `MerchantSettings.pushNotifications.callWaiter` | On/Off |
| Low stock alert | `MerchantSettings.pushNotifications.lowStock` | On/Off; fires when `stockCount = 1` |
| Billing email reminders | `MerchantSettings.emailNotifications.billing` | On/Off |
| Daily summary email | `MerchantSettings.emailNotifications.dailySummary` | On/Off |

#### Branding
`primaryColor`, `secondaryColor`, `fontFamily`, `borderRadius`, `menuLayout`, `customCss` (FBQRSYS admin only).

#### AI Features
`aiShowBestsellers`, `aiPersonalized`, `aiUpsell`, `aiTimeBased` — each an On/Off toggle.

#### Loyalty
`MerchantLoyaltyProgram` config: program name, IDR per point, redemption rate, `pointsCalculationBasis`.

#### Billing
Read-only (for merchant owner with `billing:read`): current plan, renewal date, invoice history, upgrade button.

### Schema additions (Phase 1 Prisma)

**`Restaurant` model — new fields:**

| Field | Type | Notes |
|---|---|---|
| `cuisineType` | String? | Free-text cuisine description |
| `whatsappNumber` | String? | E.164 format (e.g. `+6281234567890`); shown as contact button on `apps/menu` |
| `instagramHandle` | String? | Without `@` prefix |
| `tiktokHandle` | String? | Without `@` prefix |
| `googleMapsUrl` | String? | Full Google Maps URL |
| `reservationEmail` | String? | For reservation forwarding (Phase 2) |

**`Branch` model — new fields:**

| Field | Type | Notes |
|---|---|---|
| `openingHours` | JSON? | Day-of-week schedule as documented above; null = no hours displayed |
| `phone` | String? | Branch phone number (displayed on `apps/menu` if set) |

**`MerchantSettings` model — new fields:**

| Field | Type | Default | Notes |
|---|---|---|---|
| `pushNotifications` | JSON | `{"newOrder": true, "callWaiter": true, "lowStock": false}` | Per-event push notification toggle |
| `emailNotifications` | JSON | `{"billing": true, "dailySummary": false}` | Per-event email notification toggle |
| `allowPromotionStacking` | Bool | `false` | Whether multiple promotions can apply to one order |

---

## Cross-References

- Full schema details → `docs/data-models.md`
- FBQRSYS platform admin (subscription management, merchant controls) → `docs/platform-owner.md`
- Customer ordering flow → `docs/customer.md`
- Architecture decisions (ADRs) → `docs/architecture.md`
