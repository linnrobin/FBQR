/**
 * FBQRSYS layout — platform super-admin routes.
 * Route protection is handled by middleware.ts.
 * This layout provides the session to Server Components via auth().
 */
import type { Metadata } from "next";

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
  return <>{children}</>;
}
