/**
 * Shared enums — mirror the Prisma schema enums.
 * Keep in sync with packages/database/prisma/schema.prisma.
 * Used in shared business logic, API route handlers, and client components
 * that can't import from @prisma/client directly (e.g. apps/menu Edge Runtime).
 */

export const OrderStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  PREPARING: "PREPARING",
  READY: "READY",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentStatus = {
  PENDING: "PENDING",
  PENDING_CASH: "PENDING_CASH",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  EXPIRED: "EXPIRED",
  REFUNDED: "REFUNDED",
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PaymentMethod = {
  QRIS: "QRIS",
  EWALLET: "EWALLET",
  VA: "VA",
  CARD: "CARD",
  CASH: "CASH",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentProvider = {
  GOPAY: "GOPAY",
  OVO: "OVO",
  DANA: "DANA",
  SHOPEEPAY: "SHOPEEPAY",
  BCA: "BCA",
  MANDIRI: "MANDIRI",
  BNI: "BNI",
  OTHER: "OTHER",
} as const;
export type PaymentProvider = (typeof PaymentProvider)[keyof typeof PaymentProvider];

export const PaymentType = {
  FULL: "FULL",
  DEPOSIT: "DEPOSIT",
  BALANCE_CHARGE: "BALANCE_CHARGE",
  BALANCE_REFUND: "BALANCE_REFUND",
} as const;
export type PaymentType = (typeof PaymentType)[keyof typeof PaymentType];

export const TableStatus = {
  AVAILABLE: "AVAILABLE",
  OCCUPIED: "OCCUPIED",
  DIRTY: "DIRTY",
  RESERVED: "RESERVED",
  CLOSED: "CLOSED",
} as const;
export type TableStatus = (typeof TableStatus)[keyof typeof TableStatus];

export const MenuLayout = {
  GRID: "GRID",
  BUNDLE: "BUNDLE",
  LIST: "LIST",
  SPOTLIGHT: "SPOTLIGHT",
} as const;
export type MenuLayout = (typeof MenuLayout)[keyof typeof MenuLayout];

export const MerchantStatus = {
  TRIAL: "TRIAL",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  CANCELLED: "CANCELLED",
} as const;
export type MerchantStatus = (typeof MerchantStatus)[keyof typeof MerchantStatus];

export const CustomerStatus = {
  ACTIVE: "ACTIVE",
  DELETED: "DELETED",
} as const;
export type CustomerStatus = (typeof CustomerStatus)[keyof typeof CustomerStatus];

export const CustomerSessionStatus = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  CLOSED: "CLOSED",
} as const;
export type CustomerSessionStatus = (typeof CustomerSessionStatus)[keyof typeof CustomerSessionStatus];

export const PatunganSplitMode = {
  EQUAL: "EQUAL",
  MANUAL: "MANUAL",
} as const;
export type PatunganSplitMode = (typeof PatunganSplitMode)[keyof typeof PatunganSplitMode];

export const PatunganStatus = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type PatunganStatus = (typeof PatunganStatus)[keyof typeof PatunganStatus];

export const WaiterRequestType = {
  CALL: "CALL",
  ASSISTANCE: "ASSISTANCE",
  BILL: "BILL",
} as const;
export type WaiterRequestType = (typeof WaiterRequestType)[keyof typeof WaiterRequestType];

export const PaymentMode = {
  PAY_FIRST: "PAY_FIRST",
  PAY_AT_CASHIER: "PAY_AT_CASHIER",
} as const;
export type PaymentMode = (typeof PaymentMode)[keyof typeof PaymentMode];

export const RoundingRule = {
  NONE: "NONE",
  ROUND_50: "ROUND_50",
  ROUND_100: "ROUND_100",
} as const;
export type RoundingRule = (typeof RoundingRule)[keyof typeof RoundingRule];

export const ActorType = {
  SYSTEM: "SYSTEM",
  STAFF: "STAFF",
  MERCHANT: "MERCHANT",
  ADMIN: "ADMIN",
  CUSTOMER: "CUSTOMER",
} as const;
export type ActorType = (typeof ActorType)[keyof typeof ActorType];
