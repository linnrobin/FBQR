/**
 * FBQRSYS layout — platform super-admin routes.
 * Route protection is handled by middleware.ts.
 * Renders the sidebar shell for all authenticated FBQRSYS pages.
 *
 * Note: login and change-password pages render a full-screen centered form
 * that covers the sidebar background — acceptable for Phase 1.
 */
import type { Metadata } from "next";
import { FbqrsysSidebar } from "@/components/fbqrsys/sidebar";

export const metadata: Metadata = {
  title: {
    default: "FBQRSYS",
    template: "%s | FBQRSYS",
  },
};

export default function FbqrsysLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-stone-50">
      <FbqrsysSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
