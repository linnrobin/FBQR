"use client";

/**
 * Wizard progress bar — shown at the top of every onboarding step.
 * Shows "Langkah N dari 5" + a filled progress bar.
 */

const STEP_LABELS = [
  "Info Restoran",
  "Menu Pertama",
  "Meja & QR",
  "Pembayaran",
  "Staff",
];

interface WizardProgressProps {
  currentStep: number; // 1–5
  totalSteps?: number;
}

export function WizardProgress({
  currentStep,
  totalSteps = 5,
}: WizardProgressProps) {
  const pct = Math.round(((currentStep - 1) / totalSteps) * 100);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-stone-500">
          Langkah {currentStep} dari {totalSteps}
        </span>
        <span className="text-xs text-stone-400">{pct}% selesai</span>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-orange-500 rounded-full transition-all duration-300"
          style={{ width: `${pct + 100 / totalSteps}%` }}
        />
      </div>
      {/* Step labels */}
      <div className="flex mt-2">
        {STEP_LABELS.map((label, idx) => {
          const stepNum = idx + 1;
          const isDone = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          return (
            <div
              key={stepNum}
              className="flex-1 text-center"
              title={label}
            >
              <div
                className={`text-xs truncate ${
                  isCurrent
                    ? "font-semibold text-orange-600"
                    : isDone
                    ? "text-stone-400"
                    : "text-stone-300"
                }`}
              >
                {isCurrent || isDone ? label : ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
