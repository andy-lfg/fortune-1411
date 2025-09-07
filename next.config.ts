// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // verhindert Build-Abbruch bei ESLint-Fehlern
    ignoreDuringBuilds: true,
  },
  typescript: {
    // verhindert Build-Abbruch bei TS-Fehlern
    ignoreBuildErrors: true,
  },
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
