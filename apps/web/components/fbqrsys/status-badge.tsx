/**
 * Status badge components for FBQRSYS screens.
 * Colors per docs/ui-ux.md § Status Badge Color Mapping.
 *
 * Note: MerchantStatus enum has TRIAL | ACTIVE | SUSPENDED | CANCELLED.
 * FREE is planned for Phase 2 and not yet in the Prisma schema.
 */

import type { MerchantStatus } from "@prisma/client";

const merchantStatusConfig: Record<
  MerchantStatus,
  { label: string; className: string }
> = {
  TRIAL: {
    label: "Trial",
    className: "bg-blue-100 text-blue-800 border border-blue-300",
  },
  ACTIVE: {
    label: "Aktif",
    className: "bg-green-100 text-green-800 border border-green-300",
  },
  SUSPENDED: {
    label: "Ditangguhkan",
    className: "bg-red-100 text-red-700 border border-red-300",
  },
  CANCELLED: {
    label: "Dibatalkan",
    className: "bg-stone-100 text-stone-500 border border-stone-200",
  },
};

export function MerchantStatusBadge({ status }: { status: MerchantStatus }) {
  const config = merchantStatusConfig[status] ?? merchantStatusConfig.CANCELLED;
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

const subscriptionStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  TRIAL: {
    label: "Trial",
    className: "bg-blue-100 text-blue-800 border border-blue-300",
  },
  ACTIVE: {
    label: "Aktif",
    className: "bg-green-100 text-green-800 border border-green-300",
  },
  PAST_DUE: {
    label: "Menunggak",
    className: "bg-red-100 text-red-700 border border-red-300",
  },
  CANCELLED: {
    label: "Dibatalkan",
    className: "bg-stone-100 text-stone-500 border border-stone-200",
  },
};

const fallbackBadge = {
  label: "Dibatalkan",
  className: "bg-stone-100 text-stone-500 border border-stone-200",
};

export function SubscriptionStatusBadge({ status }: { status: string }) {
  const config = subscriptionStatusConfig[status] ?? fallbackBadge;
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

const billingInvoiceStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Menunggu",
    className: "bg-yellow-100 text-yellow-800 border border-yellow-300",
  },
  PAID: {
    label: "Dibayar",
    className: "bg-green-100 text-green-800 border border-green-300",
  },
  OVERDUE: {
    label: "Terlambat",
    className: "bg-red-100 text-red-700 border border-red-300",
  },
  CANCELLED: {
    label: "Dibatalkan",
    className: "bg-stone-100 text-stone-500 border border-stone-200",
  },
};

export function BillingInvoiceStatusBadge({ status }: { status: string }) {
  const config = billingInvoiceStatusConfig[status] ?? fallbackBadge;
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
