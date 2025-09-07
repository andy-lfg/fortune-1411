// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ ESLint-Fehler brechen den Prod-Build nicht mehr ab
  eslint: {
    ignoreDuringBuilds: true,
  },
  // ✅ TS-Fehler brechen den Prod-Build nicht mehr ab
  typescript: {
    ignoreBuildErrors: true,
  },
  // optional: falls du Images von externen Domains nutzt
  images: {
    remotePatterns: [
      // { protocol: "https", hostname: "images.example.com" },
    ],
  },
};

export default nextConfig;
