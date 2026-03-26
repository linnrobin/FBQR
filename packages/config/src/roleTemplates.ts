/**
 * System-defined permissions and role template presets.
 *
 * Permissions map directly to code-level `requirePermission()` gate calls.
 * New permissions are only added when new features are built — never speculatively.
 *
 * Templates are suggestions only — hardcoded JSON, NOT stored as DB records.
 * When a template is selected in the UI, a new MerchantRole/SystemRole DB record
 * is created with the template's permissions copied in. Modifications after
 * creation only affect the new role, not this file.
 *
 * See docs/merchant.md § RBAC and docs/platform-owner.md § FBQRSYS Permissions.
 * See docs/architecture.md ADR-005.
 */

// =============================================================================
// MERCHANT PERMISSIONS
// =============================================================================

/**
 * All system-defined merchant permission keys.
 * These correspond to actual `requirePermission()` checks in code.
 * The merchant owner (Merchant email+password account) always has all permissions.
 * Staff permissions are granted via MerchantRole assignments.
 */
export const MERCHANT_PERMISSIONS = [
  "menu:manage",        // Create/edit/delete menu categories and items
  "promotions:manage",  // Create/edit/delete promotions
  "reports:read",       // View sales and order reports
  "orders:view",        // View current and past orders
  "orders:manage",      // Update order status, cancel orders
  "orders:refund",      // Issue refunds — distinct from orders:manage for granular control
  "kitchen:view",       // View kitchen display
  "kitchen:manage",     // Reorder item priority, mark items ready
  "staff:manage",       // Create/edit/delete staff accounts, reset PINs, manage roles
  "tables:manage",      // Create/edit tables and generate QR codes
  "settings:manage",    // Edit restaurant settings (tax, service charge, etc.)
  "branding:manage",    // Edit restaurant branding (logo, colors, layout)
  "invoices:read",      // View and download invoices
  "loyalty:manage",     // Configure merchant loyalty program
  "billing:read",       // View own FBQR subscription invoices and billing history
] as const;

export type MerchantPermission = (typeof MERCHANT_PERMISSIONS)[number];

export interface MerchantRoleTemplate {
  name: string;
  description: string;
  permissions: MerchantPermission[];
}

/**
 * Suggested merchant role templates.
 * Hardcoded JSON — NOT stored in DB. See ADR-005.
 * Merchants may rename or modify these after creation.
 */
export const MERCHANT_ROLE_TEMPLATES: MerchantRoleTemplate[] = [
  {
    name: "Owner",
    description: "Full access to all merchant features",
    permissions: [...MERCHANT_PERMISSIONS],
  },
  {
    name: "Supervisor",
    description: "Floor supervisor — menu, orders, tables, invoices",
    permissions: [
      "menu:manage",
      "promotions:manage",
      "reports:read",
      "orders:view",
      "orders:manage",
      "orders:refund",
      "tables:manage",
      "invoices:read",
    ],
  },
  {
    name: "Kasir",
    description: "Cashier — handles orders and cash transactions",
    permissions: ["orders:view", "orders:manage", "invoices:read"],
  },
  {
    name: "Kitchen Admin",
    description: "Kitchen admin — manages kitchen queue and order status",
    permissions: ["kitchen:view", "kitchen:manage", "orders:view"],
  },
  {
    name: "Kitchen Staff",
    description: "Kitchen display — view-only kitchen queue",
    permissions: ["kitchen:view", "orders:view"],
  },
  {
    name: "Pelayan",
    description: "Waiter — assists customers at tables, places and views orders",
    permissions: ["orders:view", "orders:manage"],
  },
  {
    name: "Manajer",
    description: "Restaurant manager — full operational access, no billing",
    permissions: [
      "menu:manage",
      "promotions:manage",
      "reports:read",
      "orders:view",
      "orders:manage",
      "orders:refund",
      "kitchen:view",
      "kitchen:manage",
      "staff:manage",
      "tables:manage",
      "settings:manage",
      "branding:manage",
      "invoices:read",
      "loyalty:manage",
    ],
  },
];

// =============================================================================
// FBQRSYS (SYSTEM ADMIN) PERMISSIONS
// =============================================================================

/**
 * All system-defined FBQRSYS permission keys.
 * These control what FBQRSYS staff can do in the platform admin panel.
 * Permissions are granted via SystemRole assignments.
 */
export const SYSTEM_PERMISSIONS = [
  "merchants:create",   // Create new merchant accounts
  "merchants:read",     // View merchant list and details
  "merchants:update",   // Edit merchant details and settings
  "merchants:delete",   // Deactivate or delete merchant accounts
  "merchants:suspend",  // Manually lock or unlock a merchant account
  "reports:read",       // View platform-level reports
  "settings:manage",    // Modify platform-level settings
  "admins:manage",      // Create/manage other FBQRSYS staff accounts
  "billing:manage",     // Manage subscription plans, view/edit merchant billing
] as const;

export type SystemPermission = (typeof SYSTEM_PERMISSIONS)[number];

export interface SystemRoleTemplate {
  name: string;
  description: string;
  permissions: SystemPermission[];
}

/**
 * Suggested FBQRSYS system role templates.
 * Hardcoded JSON — NOT stored in DB. See ADR-005.
 */
export const SYSTEM_ROLE_TEMPLATES: SystemRoleTemplate[] = [
  {
    name: "Platform Owner",
    description: "Full access to all platform admin features",
    permissions: [...SYSTEM_PERMISSIONS],
  },
  {
    name: "Merchant Manager",
    description: "Create and manage merchant accounts",
    permissions: ["merchants:create", "merchants:read", "merchants:update"],
  },
  {
    name: "Billing Admin",
    description: "Manage billing, subscriptions, and suspend overdue accounts",
    permissions: ["billing:manage", "merchants:read", "merchants:suspend"],
  },
  {
    name: "Analyst",
    description: "View platform reports and merchant account data",
    permissions: ["reports:read", "merchants:read"],
  },
  {
    name: "Support Staff",
    description: "Read-only access to merchant accounts",
    permissions: ["merchants:read"],
  },
];

// =============================================================================
// LEGACY EXPORTS — backward compatibility aliases
// =============================================================================

/** @deprecated Use MerchantPermission instead */
export type Permission = MerchantPermission;

/** @deprecated Use MerchantRoleTemplate instead */
export type RoleTemplate = MerchantRoleTemplate;

/** @deprecated Use MERCHANT_ROLE_TEMPLATES instead */
export const ROLE_TEMPLATES = MERCHANT_ROLE_TEMPLATES;
