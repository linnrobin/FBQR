/**
 * Hardcoded role template presets — NOT stored in the DB.
 * These are suggestion templates shown during restaurant setup.
 * Merchants can customise the generated roles after creation.
 * See docs/merchant.md § Merchant RBAC for the full permission list.
 */

export type Permission =
  | "orders:view"
  | "orders:manage"
  | "menu:view"
  | "menu:manage"
  | "kitchen:view"
  | "kitchen:manage"
  | "staff:manage"
  | "tables:manage"
  | "settings:manage"
  | "branding:manage"
  | "invoices:read"
  | "loyalty:manage"
  | "billing:read"
  | "reports:view"
  | "promotions:manage";

export interface RoleTemplate {
  name: string;
  description: string;
  permissions: Permission[];
}

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    name: "Kasir",
    description: "Handles orders and cash transactions at the counter",
    permissions: ["orders:view", "orders:manage", "kitchen:view", "invoices:read"],
  },
  {
    name: "Pelayan",
    description: "Takes orders and assists customers at tables",
    permissions: ["orders:view", "orders:manage", "menu:view", "kitchen:view"],
  },
  {
    name: "Koki / Dapur",
    description: "Kitchen staff — views and manages the kitchen queue",
    permissions: ["kitchen:view", "kitchen:manage", "orders:view"],
  },
  {
    name: "Supervisor",
    description: "Floor supervisor — can cancel orders and manage staff",
    permissions: [
      "orders:view",
      "orders:manage",
      "kitchen:view",
      "kitchen:manage",
      "menu:view",
      "tables:manage",
      "invoices:read",
      "reports:view",
    ],
  },
  {
    name: "Manajer",
    description: "Restaurant manager — full operational access, no billing",
    permissions: [
      "orders:view",
      "orders:manage",
      "menu:view",
      "menu:manage",
      "kitchen:view",
      "kitchen:manage",
      "staff:manage",
      "tables:manage",
      "settings:manage",
      "branding:manage",
      "invoices:read",
      "loyalty:manage",
      "reports:view",
      "promotions:manage",
    ],
  },
];
