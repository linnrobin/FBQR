import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui", "@repo/types", "@repo/config"],
  images: {
    remotePatterns: [
      {
        // Supabase Storage — Singapore region (ap-southeast-1)
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // after() from 'next/server' is available without experimental flag in Next.js 15.1+
};

export default withNextIntl(nextConfig);
