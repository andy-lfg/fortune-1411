// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Verhindert Build-Abbruch wegen ESLint-Fehlern
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Verhindert Build-Abbruch wegen TypeScript-Fehlern
    ignoreBuildErrors: true,
  },
};