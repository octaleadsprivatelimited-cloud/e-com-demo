import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ── Performance ──────────────────────────────────────────────
  reactStrictMode: true,

  // Compress responses with gzip/brotli
  compress: true,

  // Optimize package imports — tree-shake heavy libraries
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@tanstack/react-query",
    ],
  },

  // ── Security Headers (applied to all routes) ────────────────
  // These supplement the middleware headers for routes the middleware may miss
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "0" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
    ];
  },

  // ── Image Optimization ──────────────────────────────────────
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    minimumCacheTTL: 86400,
  },

  // ── Powered-by header removal ───────────────────────────────
  // Hides "X-Powered-By: Next.js" to reduce fingerprinting surface
  poweredByHeader: false,
};

export default nextConfig;
