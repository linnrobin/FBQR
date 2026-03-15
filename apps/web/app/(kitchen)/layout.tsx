/**
 * Kitchen display layout — dark theme applied via Tailwind dark class.
 * Route protection is handled by middleware.ts (fbqr_staff_session cookie check).
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Kitchen Display",
    template: "%s | Kitchen",
  },
};

export default function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="dark">{children}</div>;
}
