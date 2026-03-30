"use client";

/**
 * OrderTimeline — vertical status progression for the order tracking screen.
 *
 * Renders 4 steps: CONFIRMED → PREPARING → READY → COMPLETED
 * Active step has an animated pulse ring; completed steps show a checkmark.
 */

import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";

export type OrderStatusStep = "CONFIRMED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";

interface TimelineStep {
  status: OrderStatusStep;
  label: string;
  description: string;
}

const STEPS: TimelineStep[] = [
  { status: "CONFIRMED", label: "Pesanan dikonfirmasi", description: "Pembayaran berhasil" },
  { status: "PREPARING", label: "Sedang disiapkan", description: "Dapur sedang memproses pesanan" },
  { status: "READY", label: "Siap diambil", description: "Pesanan Anda sudah siap" },
  { status: "COMPLETED", label: "Selesai", description: "Pesanan telah diterima" },
];

const STATUS_ORDER: Record<OrderStatusStep, number> = {
  CONFIRMED: 0,
  PREPARING: 1,
  READY: 2,
  COMPLETED: 3,
  CANCELLED: -1,
};

interface OrderTimelineProps {
  currentStatus: OrderStatusStep;
  confirmedAt?: string | null;
  readyAt?: string | null;
  cancelledAt?: string | null;
}

function formatTime(iso: string): string {
  return formatInTimeZone(new Date(iso), "Asia/Jakarta", "HH:mm");
}

export function OrderTimeline({
  currentStatus,
  confirmedAt,
  readyAt,
  cancelledAt,
}: OrderTimelineProps) {
  const currentIndex = STATUS_ORDER[currentStatus] ?? -1;

  if (currentStatus === "CANCELLED") {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <span className="text-red-500 text-lg">✕</span>
        </div>
        <div>
          <p className="font-semibold text-red-700 text-sm">Pesanan Dibatalkan</p>
          {cancelledAt && (
            <p className="text-xs text-red-500 mt-0.5">{formatTime(cancelledAt)}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {STEPS.map((step, idx) => {
        const isCompleted = currentIndex > idx;
        const isActive = currentIndex === idx;
        const isPending = currentIndex < idx;

        // Determine timestamp for this step
        let timestamp: string | null = null;
        if (step.status === "CONFIRMED" && confirmedAt) timestamp = formatTime(confirmedAt);
        if (step.status === "READY" && readyAt) timestamp = formatTime(readyAt);

        return (
          <div key={step.status} className="flex gap-3">
            {/* Icon column */}
            <div className="flex flex-col items-center">
              <div className="relative flex items-center justify-center h-8 w-8 flex-shrink-0 mt-1">
                {isCompleted ? (
                  <CheckCircle2 className="h-7 w-7 text-green-500" />
                ) : isActive ? (
                  <>
                    {/* Pulse ring */}
                    <span className="absolute inline-flex h-7 w-7 rounded-full bg-[--color-primary] opacity-25 animate-ping" />
                    <Loader2 className="h-7 w-7 text-[--color-primary] animate-spin relative" />
                  </>
                ) : (
                  <Circle className="h-6 w-6 text-stone-300" />
                )}
              </div>
              {/* Connector line */}
              {idx < STEPS.length - 1 && (
                <div
                  className={`w-0.5 flex-1 min-h-[24px] my-0.5 ${
                    currentIndex > idx ? "bg-green-400" : "bg-stone-200"
                  }`}
                />
              )}
            </div>

            {/* Text column */}
            <div className="pb-5 flex-1">
              <div className="flex items-center gap-2">
                <p
                  className={`text-sm font-semibold ${
                    isCompleted
                      ? "text-stone-400"
                      : isActive
                      ? "text-stone-900"
                      : "text-stone-300"
                  }`}
                >
                  {step.label}
                </p>
                {timestamp && (
                  <span className="text-xs text-stone-400">{timestamp}</span>
                )}
              </div>
              {(isActive || isCompleted) && !isPending && (
                <p className={`text-xs mt-0.5 ${isActive ? "text-stone-500" : "text-stone-300"}`}>
                  {step.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
