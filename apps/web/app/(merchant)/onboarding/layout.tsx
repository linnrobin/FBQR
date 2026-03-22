/**
 * Onboarding wizard layout — full-page, no sidebar.
 * All /merchant/onboarding/* routes use this layout.
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Setup Restoran | FBQR",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-stone-50">
      {children}
    </div>
  );
}
