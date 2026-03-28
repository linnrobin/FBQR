"use client";

/**
 * PaymentMethodSelector — radio cards for selecting payment method.
 * Shown on the checkout screen in PAY_FIRST mode only.
 */

import { QrCode, Building2, CreditCard } from "lucide-react";

export type PaymentMethodOption = "QRIS" | "VA" | "CARD";

interface PaymentMethodSelectorProps {
  selected: PaymentMethodOption;
  onChange: (method: PaymentMethodOption) => void;
}

const METHODS: {
  id: PaymentMethodOption;
  label: string;
  subtitle: string;
  fee: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "QRIS",
    label: "QRIS (disarankan)",
    subtitle: "Bayar dengan GoPay, OVO, DANA, dll.",
    fee: "0.7% biaya",
    Icon: QrCode,
  },
  {
    id: "VA",
    label: "Transfer Virtual Account",
    subtitle: "BCA, Mandiri, BNI, dll.",
    fee: "Rp 4.000 biaya",
    Icon: Building2,
  },
  {
    id: "CARD",
    label: "Kartu Kredit / Debit",
    subtitle: "Visa, Mastercard",
    fee: "2.9% biaya",
    Icon: CreditCard,
  },
];

export function PaymentMethodSelector({
  selected,
  onChange,
}: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-2">
      {METHODS.map((m) => {
        const isSelected = selected === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-[--border-radius] border text-left transition-all ${
              isSelected
                ? "border-[--color-primary] bg-[--color-primary]/5"
                : "border-stone-200 hover:border-stone-300"
            }`}
          >
            {/* Radio dot */}
            <div
              className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                isSelected
                  ? "border-[--color-primary]"
                  : "border-stone-300"
              }`}
            >
              {isSelected && (
                <div className="h-2 w-2 rounded-full bg-[--color-primary]" />
              )}
            </div>

            {/* Icon */}
            <m.Icon
              className={`h-5 w-5 shrink-0 ${
                isSelected ? "text-[--color-primary]" : "text-stone-400"
              }`}
            />

            {/* Labels */}
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium ${
                  isSelected ? "text-[--color-primary]" : "text-stone-900"
                }`}
              >
                {m.label}
              </p>
              <p className="text-xs text-stone-500 mt-0.5">{m.subtitle}</p>
            </div>

            {/* Fee */}
            <span className="text-xs text-stone-400 shrink-0">{m.fee}</span>
          </button>
        );
      })}
    </div>
  );
}
