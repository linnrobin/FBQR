import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "@repo/ui/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Menu",
  description: "QR digital menu",
  // PWA manifest added in future step (apps/menu PWA — deferred)
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Prevent zoom on iOS input focus
  userScalable: false,
  // Use status bar color from restaurant branding (dynamic — set per-session)
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${geistSans.variable} antialiased`}>{children}</body>
    </html>
  );
}
