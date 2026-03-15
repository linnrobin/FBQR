/**
 * Merchant POS layout — restaurant owner routes.
 * Route protection is handled by middleware.ts.
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Merchant Portal",
    template: "%s | Merchant Portal",
  },
};

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
