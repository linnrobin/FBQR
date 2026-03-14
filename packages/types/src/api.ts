/**
 * Shared API response types used across apps/web and apps/menu.
 */

/** Standard API error response shape */
export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

/** Standard paginated list response */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** Cron route success response */
export interface CronResult {
  ok: boolean;
  affectedRows: number;
  durationMs: number;
}

/** Error codes returned from the API */
export const ErrorCode = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  PLAN_LIMIT_REACHED: "PLAN_LIMIT_REACHED",
  ORDERING_PAUSED: "ORDERING_PAUSED",
  MAX_PENDING_ORDERS: "MAX_PENDING_ORDERS",
  MAX_ORDER_VALUE: "MAX_ORDER_VALUE",
  MAX_ACTIVE_ORDERS: "MAX_ACTIVE_ORDERS",
  DUPLICATE_ORDER: "DUPLICATE_ORDER",
  INVALID_QR: "INVALID_QR",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  RESTAURANT_UNAVAILABLE: "RESTAURANT_UNAVAILABLE",
  BY_WEIGHT_NOT_ALLOWED: "BY_WEIGHT_NOT_ALLOWED",
  PATUNGAN_INVALID: "PATUNGAN_INVALID",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
