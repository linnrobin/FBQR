# FBQR — UI/UX Design System

> **For AI agents:** Read this file when building any UI step (Steps 5, 7–17, 20–21, and beyond). It owns the **design system**: global palette, typography, spacing, shared component patterns, navigation structure, animation rules, and responsive behavior. Screen-specific specs (exact table columns, form field order, chart types for a specific screen) live in the owning domain doc — see the routing table in `CLAUDE.md`. This file and the domain docs together are the complete UI spec. Neither is sufficient alone.

---

## A. Design System Foundation

### A.1 Color Palette

FBQR uses a warm, Indonesian-inspired palette. All colors map to Tailwind CSS classes. Custom color tokens are defined in `packages/config/tokens.ts` and referenced via Tailwind config.

#### Brand Colors

| Token | Hex | Tailwind Equivalent | Usage |
|---|---|---|---|
| `primary` | `#E8622A` | `orange-600` (custom) | Primary buttons, active nav items, CTAs, links |
| `primary-hover` | `#D05520` | `orange-700` (custom) | Button hover state |
| `primary-light` | `#FEF0E8` | `orange-50` (custom) | Primary button ghost background, selected chips |
| `surface` | `#FAFAF9` | `stone-50` | Page background |
| `surface-raised` | `#FFFFFF` | `white` | Card background, modals, dropdowns |
| `neutral` | `#1C1917` | `stone-950` | Body text, headings |
| `muted` | `#78716C` | `stone-500` | Secondary text, placeholders, metadata |
| `border` | `#E7E5E4` | `stone-200` | Dividers, card outlines, input borders |
| `border-strong` | `#A8A29E` | `stone-400` | Focused input borders, table header dividers |

#### Semantic Colors

| Token | Hex | Tailwind Class | Usage |
|---|---|---|---|
| `success` | `#16A34A` | `green-600` | Success states, positive metrics, active badges |
| `success-bg` | `#DCFCE7` | `green-100` | Success badge background |
| `warning` | `#D97706` | `amber-600` | Warning states, caution badges, near-limit alerts |
| `warning-bg` | `#FEF9C3` | `yellow-100` | Warning badge background |
| `danger` | `#DC2626` | `red-600` | Error states, destructive actions, danger badges |
| `danger-bg` | `#FEE2E2` | `red-100` | Error badge background |
| `info` | `#2563EB` | `blue-600` | Informational badges, links in body text |
| `info-bg` | `#DBEAFE` | `blue-100` | Info badge background |
| `neutral-badge` | `#44403C` | `stone-700` | Neutral/default badge text |
| `neutral-badge-bg` | `#F5F5F4` | `stone-100` | Neutral badge background |

#### Kitchen Display Colors (High Contrast, Dark Mode)

The `merchant-kitchen` app uses a dark theme for legibility at 3 metres. All normal color tokens are inverted:

| Token | Value | Usage |
|---|---|---|
| `kitchen-bg` | `#0C0A09` (`stone-950`) | Screen background |
| `kitchen-surface` | `#1C1917` (`stone-900`) | Order card background |
| `kitchen-text` | `#FAFAF9` (`stone-50`) | Primary text |
| `kitchen-muted` | `#A8A29E` (`stone-400`) | Secondary text, timestamps |
| `kitchen-border` | `#44403C` (`stone-700`) | Card borders |
| `kitchen-timer-normal` | `#4ADE80` (`green-400`) | Timer under 10 minutes |
| `kitchen-timer-warning` | `#FACC15` (`yellow-400`) | Timer 10–20 minutes |
| `kitchen-timer-urgent` | `#F87171` (`red-400`) | Timer over 20 minutes |

---

### A.2 Status Badge Color Mapping

Every status badge across the system uses this exact Tailwind class combination. Badges use the shadcn `Badge` component with `variant="outline"` as the base, then override with these classes.

#### Order Status Badges

| Status | Background | Text | Border | Display Label |
|---|---|---|---|---|
| `PENDING` | `bg-yellow-100` | `text-yellow-800` | `border-yellow-300` | Menunggu Pembayaran |
| `CONFIRMED` | `bg-blue-100` | `text-blue-800` | `border-blue-300` | Dikonfirmasi |
| `PREPARING` | `bg-orange-100` | `text-orange-800` | `border-orange-300` | Sedang Disiapkan |
| `READY` | `bg-green-100` | `text-green-800` | `border-green-300` | Siap Diambil |
| `COMPLETED` | `bg-stone-100` | `text-stone-600` | `border-stone-300` | Selesai |
| `CANCELLED` | `bg-red-100` | `text-red-700` | `border-red-300` | Dibatalkan |
| `EXPIRED` | `bg-stone-100` | `text-stone-500` | `border-stone-200` | Kedaluwarsa |
| `REFUNDED` | `bg-purple-100` | `text-purple-700` | `border-purple-300` | Dikembalikan |

#### Payment Status Badges

| Status | Background | Text | Border | Display Label |
|---|---|---|---|---|
| `PENDING` | `bg-yellow-100` | `text-yellow-800` | `border-yellow-300` | Menunggu |
| `PENDING_CASH` | `bg-amber-100` | `text-amber-800` | `border-amber-300` | Bayar di Kasir |
| `SUCCESS` | `bg-green-100` | `text-green-800` | `border-green-300` | Berhasil |
| `FAILED` | `bg-red-100` | `text-red-700` | `border-red-300` | Gagal |
| `EXPIRED` | `bg-stone-100` | `text-stone-500` | `border-stone-200` | Kedaluwarsa |
| `REFUNDED` | `bg-purple-100` | `text-purple-700` | `border-purple-300` | Dikembalikan |
| `BALANCE_CHARGE` | `bg-blue-100` | `text-blue-800` | `border-blue-300` | Tagih Sisa |
| `BALANCE_REFUND` | `bg-purple-100` | `text-purple-700` | `border-purple-300` | Refund Sisa |

#### Table Status Badges

| Status | Background | Text | Border | Floor Map Color | Display Label |
|---|---|---|---|---|---|
| `AVAILABLE` | `bg-green-100` | `text-green-800` | `border-green-300` | `bg-green-200` | Tersedia |
| `OCCUPIED` | `bg-orange-100` | `text-orange-800` | `border-orange-300` | `bg-orange-200` | Terisi |
| `DIRTY` | `bg-amber-100` | `text-amber-700` | `border-amber-300` | `bg-amber-200` | Perlu Dibersihkan |
| `RESERVED` | `bg-blue-100` | `text-blue-800` | `border-blue-300` | `bg-blue-200` | Direservasi |
| `CLOSED` | `bg-stone-100` | `text-stone-500` | `border-stone-200` | `bg-stone-200` | Ditutup |

#### Merchant / Restaurant Status Badges

| Status | Background | Text | Border | Display Label |
|---|---|---|---|---|
| `TRIAL` | `bg-blue-100` | `text-blue-800` | `border-blue-300` | Trial |
| `ACTIVE` | `bg-green-100` | `text-green-800` | `border-green-300` | Aktif |
| `SUSPENDED` | `bg-red-100` | `text-red-700` | `border-red-300` | Ditangguhkan |
| `CANCELLED` | `bg-stone-100` | `text-stone-500` | `border-stone-200` | Dibatalkan |
| `FREE` | `bg-stone-100` | `text-stone-600` | `border-stone-300` | Gratis |

#### Subscription Status Badges

| Status | Background | Text | Border | Display Label |
|---|---|---|---|---|
| `TRIAL` | `bg-blue-100` | `text-blue-800` | `border-blue-300` | Trial |
| `ACTIVE` | `bg-green-100` | `text-green-800` | `border-green-300` | Aktif |
| `PAST_DUE` | `bg-red-100` | `text-red-700` | `border-red-300` | Menunggak |
| `CANCELLED` | `bg-stone-100` | `text-stone-500` | `border-stone-200` | Dibatalkan |

#### Staff Online/Offline State

Shown as a colored dot indicator next to staff name in lists and the floor map.

| State | Dot Color | Tailwind Class | Label |
|---|---|---|---|
| Online (active session) | Green | `bg-green-500` | Online |
| Offline | Gray | `bg-stone-300` | Offline |
| Inactive (session timeout approaching) | Amber | `bg-amber-400` | Tidak Aktif |

---

### A.3 Typography Scale

Font family: **Geist Sans** (Next.js default) for `apps/web`. Customer app (`apps/menu`) overrides this per restaurant via `RestaurantBranding.fontFamily`.

All sizes are defined as Tailwind classes. Line height is fixed per level.

| Level | Size | Line Height | Weight | Tailwind | Usage |
|---|---|---|---|---|---|
| Display | 36px | 40px | 700 | `text-4xl font-bold` | Hero headings in `apps/menu` only (Spotlight item, welcome banners) |
| H1 | 30px | 36px | 700 | `text-3xl font-bold` | Page titles in merchant-pos and FBQRSYS |
| H2 | 24px | 32px | 600 | `text-2xl font-semibold` | Section headings, card headers |
| H3 | 20px | 28px | 600 | `text-xl font-semibold` | Sub-section headings, modal titles |
| H4 | 16px | 24px | 600 | `text-base font-semibold` | Form section labels, table group headers |
| Body | 16px | 24px | 400 | `text-base font-normal` | Default paragraph text |
| Small | 14px | 20px | 400 | `text-sm font-normal` | Secondary labels, metadata, helper text |
| Micro | 12px | 16px | 400 | `text-xs font-normal` | Badges, timestamps, table captions |
| Mono | 14px | 20px | 400 | `text-sm font-mono` | Invoice numbers, order IDs, QR tokens, API keys |

**Rules:**
- Body text color: `text-stone-900` (near-black, not pure black for reduced eye strain)
- Secondary text: `text-stone-500`
- Placeholder text: `text-stone-400`
- Disabled text: `text-stone-300`
- The `Display` level is only used in `apps/menu` — never in merchant-pos or FBQRSYS

---

### A.4 Spacing Scale

Use Tailwind's default spacing scale. Standard increments for layout decisions:

| Use | Tailwind | px |
|---|---|---|
| Micro gap (badge icon + text) | `gap-1` | 4px |
| Inline element gap | `gap-2` | 8px |
| Form field internal padding | `px-3 py-2` | 12px × 8px |
| Card padding (compact) | `p-4` | 16px |
| Card padding (standard) | `p-6` | 24px |
| Section gap (within page) | `gap-6` | 24px |
| Section gap (between major sections) | `gap-8` | 32px |
| Page horizontal padding (desktop) | `px-8` | 32px |
| Page horizontal padding (mobile) | `px-4` | 16px |
| Sidebar width (expanded) | `w-64` | 256px |
| Sidebar width (collapsed icon-only) | `w-16` | 64px |

---

### A.5 Border Radius Scale

Defined by `MerchantSettings.borderRadius` for `apps/menu`. Fixed for `apps/web`.

| Context | Radius | Tailwind |
|---|---|---|
| Buttons (apps/web) | 6px | `rounded-md` |
| Cards (apps/web) | 8px | `rounded-lg` |
| Modals / dialogs | 12px | `rounded-xl` |
| Input fields | 6px | `rounded-md` |
| Badges / chips | 4px | `rounded` |
| Avatar images | 50% | `rounded-full` |
| apps/menu — `sharp` setting | 4px | `rounded` |
| apps/menu — `rounded` setting | 12px | `rounded-xl` |
| apps/menu — `pill` setting | 9999px | `rounded-full` |

---

### A.6 Shadow Scale

| Level | Tailwind | Usage |
|---|---|---|
| Flat | `shadow-none` | Table rows, list items |
| XS | `shadow-sm` | Input focus rings, small cards |
| S | `shadow` | Standard cards, dropdowns |
| M | `shadow-md` | Popovers, date pickers |
| L | `shadow-lg` | Modals, sheets, sidebars |
| XL | `shadow-xl` | Full-screen overlays |

---

### A.7 Z-Index Scale

| Layer | Value | Elements |
|---|---|---|
| Base | 0 | Page content |
| Raised | 10 | Sticky table headers, sticky bottom cart bar |
| Dropdown | 20 | Select dropdowns, date pickers, comboboxes |
| Sticky nav | 30 | Sidebar, top navigation bar |
| Modal overlay | 40 | Dialog overlays (background scrim) |
| Modal content | 50 | Dialog / sheet content |
| Toast | 60 | Sonner toast notifications |
| Tooltip | 70 | Tooltip popups |

---

## B. Component Patterns

### B.1 Card Layouts

Three standard card types. All use shadcn `Card` as the base.

#### Stat Card (Dashboard metrics)
```
┌─────────────────────────────┐
│  [Icon]  Label              │
│                             │
│  Rp 4.250.000               │  ← H2 weight, primary color if positive metric
│  ↑ 12% dari kemarin         │  ← Small text, green if positive, red if negative
└─────────────────────────────┘
```
- Width: auto (grid column)
- Padding: `p-6`
- Icon: 20×20px, `text-stone-400`
- Value: `text-2xl font-semibold text-stone-900`
- Delta: `text-sm` with green/red arrow icon
- Hover: `hover:shadow-md transition-shadow duration-150`

#### List Card (Items in a collection)
```
┌─────────────────────────────────────────────────────────┐
│  Card Title                          [ Action Button ]  │
│  ─────────────────────────────────────────────────────  │
│  Row 1                                                  │
│  Row 2                                                  │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```
- Header: `H3 + optional right-aligned action`
- Divider: `border-b border-stone-100`
- Row padding: `px-6 py-4`

#### Detail Card (Single record view)
```
┌─────────────────────────────┐
│  Section Title              │
│  ─────────────────────────  │
│  Label      Value           │
│  Label      Value           │
│  Label      Value           │
└─────────────────────────────┘
```
- Label: `text-sm text-stone-500`
- Value: `text-sm text-stone-900 font-medium`
- Grid: `grid grid-cols-2 gap-y-4` (2-column label/value layout)

---

### B.2 Data Table Conventions

Using TanStack Table via shadcn `DataTable`. These rules apply to all tables in `apps/web`.

**Column order principle:** Most important identifier first, then status/type badges, then numeric values, then dates, then actions last.

| Convention | Rule |
|---|---|
| Default page size | 25 rows (options: 10, 25, 50, 100) |
| Pagination | Bottom of table; show "Menampilkan 1–25 dari 142 data" |
| Sortable columns | Show sort icon on hover; active sort shown with filled icon |
| Filterable columns | Filter via search input above table, not inline column filters |
| Row height | `h-14` (56px) — comfortable touch target on tablet |
| Empty state | Show empty state component, not an empty table with headers only |
| Loading state | Skeleton rows (same height as data rows), not spinner |
| Row actions | Kebab menu (`⋮`) in the last column; max 4 actions before grouping |
| Bulk select | Checkbox column at far left when bulk actions are available |
| Sticky header | Yes — `position: sticky; top: 0` with `z-10` so header stays visible while scrolling |
| Column min-width | 120px for text columns; 80px for status/badge columns; 140px for date columns |

**Responsive table behavior:**
- Desktop (≥1024px): all columns visible
- Tablet (768–1023px): hide lowest-priority columns (typically dates and secondary IDs)
- Mobile (<768px): `apps/web` is tablet-minimum; `apps/menu` does not use data tables

---

### B.3 Form Field Conventions

**Field order principle:** Required fields at top; optional/advanced fields at bottom. Related fields grouped into labeled sections with `<fieldset>` semantic markup.

| Convention | Rule |
|---|---|
| Required marking | Red asterisk `*` after label — `<label>Name <span class="text-red-500">*</span></label>` |
| Optional marking | "(opsional)" in muted text after label |
| Helper text | `text-sm text-stone-500` below the input; always present if field has rules |
| Validation display | Red border (`border-red-500`) on input + red error message below (`text-sm text-red-600`) |
| Field spacing | `space-y-6` between field groups; `space-y-4` within a group |
| Input height | `h-10` (40px) — consistent across all text inputs and selects |
| Textarea height | `min-h-24` — auto-grows with content |
| Submit button position | Bottom-right, full-width on mobile |
| Cancel / Back button | Left of submit, secondary style |
| Auto-save | Not used — explicit save button always required |
| Dirty state warning | On navigate-away with unsaved changes: shadcn `AlertDialog` confirmation |

**Input states:**
- Default: `border-stone-300 focus:border-primary focus:ring-1 focus:ring-primary`
- Error: `border-red-500 focus:border-red-500 focus:ring-red-500`
- Disabled: `bg-stone-50 text-stone-400 cursor-not-allowed`
- Read-only: `bg-stone-50 border-stone-200` (visually distinct from editable)

---

### B.4 Badge / Chip Conventions

Two sizes: default (for tables, lists) and large (for detail pages, status indicators).

| Size | Height | Font | Padding | Tailwind |
|---|---|---|---|---|
| Default | 20px | `text-xs font-medium` | `px-2 py-0.5` | `inline-flex items-center rounded px-2 py-0.5 text-xs font-medium` |
| Large | 24px | `text-sm font-medium` | `px-3 py-1` | `inline-flex items-center rounded-md px-3 py-1 text-sm font-medium` |

**Rules:**
- Never use color alone to communicate status — always pair with a text label
- Status badges always use the colors defined in A.2 — do not invent new badge colors
- Station badges (kitchen display) use `KitchenStation.displayColor` (merchant-set hex) with auto-computed contrast text color (white or black based on luminance)

---

### B.5 Button Hierarchy

Using shadcn `Button` component variants.

| Variant | Tailwind | Usage | When to use |
|---|---|---|---|
| Primary | `bg-primary text-white hover:bg-primary-hover` | Main action in a view | One per screen maximum |
| Secondary | `border border-stone-300 bg-white text-stone-700 hover:bg-stone-50` | Supporting actions | Multiple allowed |
| Destructive | `bg-red-600 text-white hover:bg-red-700` | Delete, cancel, suspend | Only for irreversible destructive actions |
| Ghost | `bg-transparent text-stone-700 hover:bg-stone-100` | Tertiary actions, navigation items | Icon buttons, side nav items |
| Link | `text-primary underline-offset-4 hover:underline` | Inline text links | Never use for navigation CTAs |

**Button sizes:**
- Default: `h-10 px-4 py-2` (40px height)
- Small: `h-8 px-3 text-sm` (32px height) — for table row actions, compact lists
- Icon-only: `h-10 w-10` — always add `aria-label`

**Loading state:** Replace label with `<Loader2 className="animate-spin h-4 w-4 mr-2" />` + disabled state. Never show a spinner without also disabling the button.

---

### B.6 Modal vs Page Navigation

| Situation | Use modal | Use page navigation |
|---|---|---|
| Quick confirmation of a destructive action | Yes | No |
| Single-field inline edit | Yes | No |
| QR code display | Yes | No |
| Item detail in customer menu | Yes (bottom sheet) | No |
| Multi-step form (3+ steps) | No | Yes |
| Full create/edit form for complex entity | No | Yes |
| Analytics dashboard drill-down | No | Yes |
| Onboarding wizard | No | Yes (dedicated pages) |

**Modal sizes:**
- Small: `max-w-sm` — confirmations, single-field edits
- Medium: `max-w-lg` — QR display, image preview, short forms
- Large: `max-w-2xl` — multi-section forms, detail views
- Full-screen drawer (Sheet): `side="right" className="w-full sm:max-w-lg"` — mobile-compatible panels

---

### B.7 Toast / Notification Conventions

Using **Sonner** (ships with shadcn/ui). All toasts are non-blocking and auto-dismiss.

| Type | Function | Duration | Use for |
|---|---|---|---|
| Success | `toast.success('...')` | 3 seconds | Saved, created, confirmed |
| Error | `toast.error('...')` | 5 seconds | Failed API call, validation failure |
| Info | `toast.info('...')` | 3 seconds | Background process started, neutral update |
| Warning | `toast.warning('...')` | 4 seconds | Near-limit, advisory |
| Loading | `toast.loading('...')` | Until resolved | Long async operation in progress |

**Position:** `position="bottom-right"` for `apps/web`; `position="top-center"` for `apps/menu` (avoids conflict with sticky bottom cart bar).

**Copy rules:**
- Success: past tense action — "Menu berhasil disimpan", "Pesanan dikonfirmasi"
- Error: state + what to do — "Gagal menyimpan. Periksa koneksi internet Anda."
- Never expose technical error codes or stack traces in toasts

---

### B.8 Loading State Patterns

**Rule: always use skeletons, never spinners for content loading.**

Exception: button loading state (in-progress action) uses a spinner inside the button.

```tsx
// Page skeleton (data table loading)
<div className="space-y-3">
  <Skeleton className="h-10 w-full" />   // table header
  {Array(5).fill(0).map((_, i) => (
    <Skeleton key={i} className="h-14 w-full" />  // table rows
  ))}
</div>

// Card skeleton
<div className="p-6 space-y-4">
  <Skeleton className="h-4 w-[120px]" />  // title
  <Skeleton className="h-8 w-[200px]" />  // value
  <Skeleton className="h-3 w-[80px]" />   // delta
</div>
```

Skeleton color: `bg-stone-200 animate-pulse` (Tailwind animate-pulse).

Every page-level component must have a `loading.tsx` file (Next.js App Router convention) that renders the skeleton.

---

### B.9 Empty State Patterns

Every list, table, and grid must have an empty state. Never show an empty container.

**Structure:**
```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <Icon className="h-12 w-12 text-stone-300 mb-4" />
  <h3 className="text-lg font-semibold text-stone-700 mb-2">{heading}</h3>
  <p className="text-sm text-stone-500 mb-6 max-w-sm">{description}</p>
  <Button>{cta}</Button>
</div>
```

**Standard empty states (Indonesian):**

| Screen | Icon | Heading | Description | CTA |
|---|---|---|---|---|
| Menu categories | `FolderOpen` | "Belum ada kategori menu" | "Tambahkan kategori pertama untuk mulai menerima pesanan." | "+ Tambah Kategori" |
| Menu items | `UtensilsCrossed` | "Belum ada item menu" | "Tambahkan item menu ke kategori ini." | "+ Tambah Item" |
| Tables | `TableProperties` | "Belum ada meja" | "Buat meja dan unduh QR code-nya untuk pelanggan." | "+ Tambah Meja" |
| Staff | `Users` | "Hanya Anda yang bisa login" | "Tambahkan staff untuk berbagi akses ke restoran." | "+ Tambah Staff" |
| Orders (today) | `ClipboardList` | "Belum ada pesanan hari ini" | "Bagikan QR code meja Anda ke pelanggan!" | "Lihat QR Code" |
| Kitchen (no active orders) | `ChefHat` | "Dapur kosong" | "Tidak ada pesanan aktif saat ini." | — (no CTA) |
| Promotions | `Tag` | "Belum ada promosi" | "Buat promo diskon, BOGO, atau item gratis." | "+ Buat Promosi" |
| Audit log | `Shield` | "Belum ada log aktivitas" | "Perubahan dan aktivitas akun akan muncul di sini." | — |
| Merchant list (FBQRSYS) | `Building2` | "Belum ada merchant" | "Tambahkan merchant pertama ke platform." | "+ Tambah Merchant" |
| Billing history | `Receipt` | "Belum ada tagihan" | "Tagihan berlangganan akan muncul di sini." | — |

---

## C. Navigation Structure

### C.1 `apps/web` — Sidebar Navigation

Using shadcn Sidebar component. Left sidebar, collapsible to icon-only on tablet.

#### FBQRSYS Sidebar (SystemAdmin users)

```
FBQR                              ← platform logo + name
────────────────────────────────
[Home]          Dashboard
[Building2]     Merchants         → /fbqrsys/merchants
[CreditCard]    Billing           → /fbqrsys/billing
[BarChart3]     Analytics         → /fbqrsys/analytics
[Shield]        Audit Log         → /fbqrsys/audit-log
[Settings]      Settings          → /fbqrsys/settings
                  ├── Platform Settings
                  └── Staff Management
────────────────────────────────
[User]          [Admin Name]      ← avatar + name + logout
```

Active item: `bg-primary-light text-primary font-medium`
Inactive item: `text-stone-600 hover:bg-stone-100`
Icon size: 16×16px (`h-4 w-4`)

#### Merchant POS Sidebar (Merchant owner / staff)

Branch selector at top when `multiBranchEnabled = true`.

```
[Restaurant Logo]  [Branch Name ▾]    ← branch selector dropdown
────────────────────────────────────
[LayoutDashboard]  Beranda            → /merchant/dashboard
[UtensilsCrossed]  Menu               → /merchant/menu
[Tag]              Promosi            → /merchant/promotions
[TableProperties]  Meja & QR          → /merchant/tables
[ClipboardList]    Pesanan            → /merchant/orders
[ChefHat]          Dapur              → /merchant/kitchen  (requires kitchen:view)
[BarChart3]        Laporan            → /merchant/analytics (requires reports:read)
[Users]            Staff              → /merchant/staff    (requires staff:manage)
[Settings]         Pengaturan         → /merchant/settings
────────────────────────────────────
[Bell]             [Ordering: ON/OFF toggle]               ← prominent red when paused
────────────────────────────────────
[User]             [Staff Name / Owner]
```

**Permissions gate:** Nav items hidden (not just disabled) if the logged-in staff lacks the required permission. Owner always sees all items.

**Ordering paused banner:** When `MerchantSettings.orderingPaused = true`, a full-width red banner at the top of the layout: `"Pesanan dijeda — Tekan untuk melanjutkan"`. Clicking resumes orders.

#### Kitchen Display Sidebar / Top Bar

Kitchen display uses a **top bar** (not sidebar) for maximum vertical real estate.

```
[Restaurant Name]  |  [Branch Name]     |   Station: [All ▾] [Bar] [Kitchen]   |   [Close Register]   |   [?]
```

Active station tab: `bg-primary text-white`
Timer warning thresholds: yellow at 10 min, red at 20 min (configurable in `MerchantSettings`).

---

### C.2 `apps/menu` — Customer Navigation

Customer app uses a **header bar** only — no sidebar, no bottom tab bar.

```
[Restaurant Logo]          [Restaurant Name]       [🛒 Cart (2)]
```

- Logo: 40×40px, `rounded-full` or square based on `RestaurantBranding.borderRadius`
- Restaurant name: `text-base font-semibold` in `--color-primary` (branded)
- Cart icon: sticky, shows item count badge; taps to open cart sheet

**Category tabs (below header):**
- Horizontal scrollable tab bar; sticky at top on scroll
- Active tab: `border-b-2 border-primary text-primary font-medium`
- Inactive tab: `text-stone-500 hover:text-stone-700`
- Scroll-spy: active tab updates as user scrolls through sections

---

### C.3 Active State Indicators

| Context | Active indicator |
|---|---|
| Sidebar nav item | Left border `border-l-2 border-primary` + `bg-primary-light` |
| Top bar tab (kitchen) | `bg-primary text-white rounded-md` |
| Category tab (customer menu) | `border-b-2 border-primary text-primary` |
| Bottom tab (not used in this app) | N/A |

---

### C.4 Breadcrumb Conventions

Used in `apps/web` for pages deeper than 2 levels. Not used in `apps/menu`.

```
FBQRSYS / Merchants / Warung Pak Budi / Billing
```

- Separator: `/` in `text-stone-400`
- Current page: `text-stone-900 font-medium` (not a link)
- Parent pages: `text-stone-500 hover:text-stone-700 underline-offset-2 hover:underline`
- Max 4 levels; truncate middle levels with `...` if deeper

---

## D. Responsive Rules

### D.1 Breakpoints

FBQR uses Tailwind's default breakpoints:

| Name | Min-width | Tailwind prefix | Target devices |
|---|---|---|---|
| Mobile | < 640px | (default) | Small phones |
| SM | ≥ 640px | `sm:` | Large phones |
| MD (tablet) | ≥ 768px | `md:` | Tablets, iPad mini |
| LG (desktop) | ≥ 1024px | `lg:` | iPad Pro, laptop |
| XL | ≥ 1280px | `xl:` | Desktop monitors |
| 2XL | ≥ 1536px | `2xl:` | Wide desktop monitors |

---

### D.2 `apps/web` (merchant-pos + FBQRSYS + kitchen) Responsive Behavior

**Minimum supported viewport:** 1024px (LG) for merchant-pos and FBQRSYS. Kitchen display targets 1920×1080 (1080p landscape TV/monitor).

| Breakpoint | Sidebar | Content area | Tables |
|---|---|---|---|
| LG (1024–1279px) | Collapsed to icon-only (56px wide); expand on hover | `ml-16` | Hide lowest-priority columns |
| XL (1280–1535px) | Expanded (256px wide) | `ml-64` | All columns visible |
| 2XL (≥1536px) | Expanded (256px wide) | `ml-64 max-w-screen-xl mx-auto` | All columns + extra metadata |

**Sidebar collapse trigger:** `lg:` breakpoint — auto-collapse below 1280px. User can pin/unpin via toggle.

**Mobile warning:** If `apps/web` is accessed below 768px, show a full-page notice: `"merchant-pos lebih baik digunakan di tablet atau komputer. Gunakan perangkat dengan layar lebih besar untuk pengalaman terbaik."` Do not hide the site — allow access but warn.

---

### D.3 `apps/menu` (customer) Responsive Behavior

Mobile-first design. Primary target: 375–430px (iPhone SE → iPhone 15 Pro Max).

| Breakpoint | Layout |
|---|---|
| Mobile (< 640px) | Single column; full-width cards; bottom sheet for item detail |
| SM (640–767px) | Single column with max-width `max-w-sm mx-auto`; same layout |
| MD (768px+) | 2-column grid for GRID layout; centered content `max-w-2xl mx-auto` |
| LG (1024px+) | Stays at `max-w-2xl mx-auto`; customer menu is never wide-screen |

**Max content width for apps/menu:** `max-w-2xl` (672px) centered with `mx-auto`. Menu items never stretch to fill a 1920px screen — it looks like a mobile app regardless of device.

**Touch targets:** All interactive elements ≥ 44×44px (iOS HIG requirement).

---

### D.4 Table Responsive Behavior

For data tables in `apps/web`, define column visibility by priority:

| Priority | Always visible | Hide at LG | Hide at MD |
|---|---|---|---|
| 1 (required) | Name/identifier, status badge, primary action | — | — |
| 2 (important) | Key metric (amount, count), secondary badge | — | Yes |
| 3 (optional) | Created date, secondary metadata | Yes | Yes |
| 4 (detail) | Updated date, IDs | Yes | Yes |

Each table implementation must annotate columns with a `hidden` prop: e.g. `{ id: 'updatedAt', hidden: { lg: true } }`.

---

## E. Animation & Transition Rules

### E.1 Page Transition Patterns (Framer Motion)

All pages in both apps use this subtle entrance animation. Exit animation mirrors the entrance (reversed).

```ts
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
}

const pageTransition = {
  duration: 0.15,
  ease: 'easeOut',
}
```

Apply via a shared `<PageWrapper>` component using `AnimatePresence` in the root layout.

**Rule:** Animation must never slow down a task. If an animation makes a staff member wait an extra 150ms during dinner rush, remove it.

---

### E.2 Micro-Interaction Rules

| Interaction | Animation | Duration |
|---|---|---|
| Button press (click) | Scale `0.97` on `mousedown`, back to `1` on `mouseup` | 80ms |
| Card hover | `shadow-sm → shadow-md` via CSS transition | 150ms |
| Badge hover (no click action) | No animation | — |
| Toggle/switch change | Slide thumb + color transition | 200ms (CSS transition) |
| Accordion open/close | Height 0 → auto via Framer Motion `layout` | 200ms |
| Dropdown open | Fade in + translate Y -4px → 0 | 100ms |
| Toast enter/exit | Slide in from right (bottom-right) | 150ms (Sonner default) |

---

### E.3 Real-Time Update Animations

For live data updates (new order appearing in kitchen queue, order status changing):

```ts
// New order card appearing in kitchen queue
const cardEntrance = {
  initial: { opacity: 0, scale: 0.95, y: -8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  transition: { duration: 0.2, ease: 'easeOut' },
}

// Order status badge pulse (PREPARING state)
const preparingPulse = {
  animate: { scale: [1, 1.05, 1] },
  transition: { repeat: Infinity, duration: 2, ease: 'easeInOut' },
}

// Kitchen timer color transition (normal → warning → urgent)
// Use CSS transition, not Framer Motion — text-color transitions are cheaper
// .timer { transition: color 0.5s ease; }

// List item stagger (when multiple orders load at once)
const staggerContainer = {
  animate: { transition: { staggerChildren: 0.04 } },
}
```

**Kitchen display sound notification:** When a new order arrives, play a short audio chime (Web Audio API, single beep ≤500ms). This is in addition to the visual animation. Audio only plays if the tab is in focus and user has interacted with the page (browser autoplay policy).

---

### E.4 Sheet / Drawer vs Modal Animation

| Component | Direction | Duration |
|---|---|---|
| Sheet (right drawer) | Slide in from right: `x: '100%' → x: 0` | 250ms |
| Sheet (bottom drawer, apps/menu) | Slide up from bottom: `y: '100%' → y: 0` | 250ms |
| Modal/Dialog | Fade + scale: `opacity: 0, scale: 0.95 → opacity: 1, scale: 1` | 150ms |
| Modal overlay/scrim | Fade: `opacity: 0 → opacity: 0.5` | 150ms |

Bottom sheet in `apps/menu` (item detail): uses `drag="y"` with `dragConstraints={{ top: 0 }}` to allow swipe-down-to-dismiss gesture.

---

## F. Language & Copy Conventions

### F.1 Indonesian Language Defaults

All user-facing strings must use `next-intl` with Bahasa Indonesia (`id`) as the default locale. Never hardcode strings in JSX. Strings shown in this document are the content specification for `messages/id.json`.

**Tone of voice:**
- `apps/web` (merchant-pos, FBQRSYS): Professional, direct, efficient. Staff are under pressure. Copy must be clear and concise.
- `apps/menu` (customer): Warm, friendly, appetizing. Use "Anda" (not "kamu") for formality appropriate to a restaurant context.
- Kitchen display: Purely functional. No marketing language. Labels only.

---

### F.2 Number Formatting — IDR Currency

All monetary values are stored as integers (IDR, no decimals). Display format:

| Value | Display | Format rule |
|---|---|---|
| 15000 | Rp 15.000 | Period as thousands separator, no decimal |
| 185000 | Rp 185.000 | |
| 4250000 | Rp 4.250.000 | |
| 1000000000 | Rp 1.000.000.000 | Billions — rare but must display correctly |

**Implementation:**
```ts
export function formatIDR(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`
}
// Output: "Rp 15.000"
```

**Abbreviated format (for stat cards with large numbers):**
```ts
// Use when space is limited (stat cards, badges)
formatIDRShort(4250000)  // → "Rp 4,25 Jt"
formatIDRShort(1500000000)  // → "Rp 1,5 M"
```

---

### F.3 Date / Time Formatting

All timestamps are stored in UTC in the database and displayed in `Asia/Jakarta` (WIB, UTC+7) using `date-fns-tz`.

| Context | Format | Example |
|---|---|---|
| Date only | `d MMMM yyyy` | 12 Maret 2026 |
| Date + time | `d MMMM yyyy, HH:mm` | 12 Maret 2026, 19:45 |
| Time only | `HH:mm` | 19:45 |
| Relative time (within 24h) | "X menit lalu", "Baru saja", "X jam lalu" | 5 menit lalu |
| Relative time (older) | Full date | 10 Maret 2026 |
| Day of week | `EEEE, d MMMM` | Kamis, 12 Maret |

**Kitchen display:** Time format is `HH:mm` only — elapsed timer in `mm:ss` (minutes:seconds).

**Timezone label:** Always display "WIB" when a timezone-sensitive time is shown to the user. Do not display UTC times to end users.

---

### F.4 Error Message Tone

**Principles:**
1. Never show technical error codes, stack traces, or database messages to users
2. Always tell the user what happened AND what to do next
3. Use active language — not "Error occurred" but "Gagal menyimpan"

| Situation | Bad | Good |
|---|---|---|
| Network error | "Error 500: Internal Server Error" | "Terjadi kesalahan. Periksa koneksi internet Anda dan coba lagi." |
| Validation error | "Invalid input" | "Nama menu harus diisi dan tidak boleh lebih dari 100 karakter." |
| Permission denied | "403 Forbidden" | "Anda tidak memiliki izin untuk melakukan tindakan ini." |
| Session expired | "401 Unauthorized" | "Sesi Anda telah berakhir. Silakan masuk kembali." |
| Kitchen cap reached | "Max orders reached" | "Dapur sedang sibuk. Silakan coba dalam beberapa menit." |
| Restaurant suspended | "Restaurant status = SUSPENDED" | "Restoran ini sementara tidak tersedia." |

---

## G. Accessibility Baseline

All interactive UI must meet **WCAG 2.1 AA** minimum.

| Rule | Requirement |
|---|---|
| Color contrast (body text) | ≥ 4.5:1 ratio |
| Color contrast (large text, ≥18px bold) | ≥ 3:1 ratio |
| Color contrast (UI components) | ≥ 3:1 ratio |
| Touch target size | ≥ 44×44px |
| Focus ring | Always visible: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2` |
| Icon-only buttons | Must have `aria-label` |
| Images | Must have `alt` text (item name for menu images; empty `alt=""` for decorative images) |
| Form inputs | Must be associated with `<label>` via `htmlFor` / `id` |
| Error messages | Must be announced via `role="alert"` or linked to input via `aria-describedby` |
| Keyboard navigation | All interactive elements reachable via `Tab`; modals trap focus; `Esc` closes overlays |
| Screen reader | Status badge text must be readable (no color-only status) |

---

## H. Performance Targets

| Metric | apps/menu | apps/web |
|---|---|---|
| First Contentful Paint (FCP) | < 1.5s on Indonesian 4G | < 2s |
| Largest Contentful Paint (LCP) | < 2.5s | < 3s |
| Cumulative Layout Shift (CLS) | < 0.1 | < 0.1 |
| Lighthouse score | > 85 | > 75 |

**Image rules:**
- All images use `next/image` (never `<img>`)
- Max upload size: 800×800px, WebP format, quality 80 (≤300 KB target per image)
- Always set `width` and `height` on `next/image` to prevent layout shift
- Use `placeholder="blur"` with `blurDataURL` for above-the-fold images

---

## Cross-References

- Screen-specific UI specs (table columns, form fields, chart types) → see `## UI Specifications` sections at the bottom of each domain doc:
  - FBQRSYS screens → `docs/platform-owner.md`
  - Merchant POS screens → `docs/merchant.md`
  - Customer menu screens → `docs/customer.md`
- Design token implementation → `packages/config/tokens.ts`
- Shared UI components → `packages/ui/`
- Tech stack decisions (shadcn, TanStack Table, Recharts, Framer Motion) → `docs/architecture.md` ADR-020
- i18n (next-intl) conventions → `docs/architecture.md` ADR-022 and `docs/merchant.md § Internationalisation`
