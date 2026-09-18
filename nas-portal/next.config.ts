import type { NextConfig } from "next";
import { ALLOWED_ORIGINS } from "./lib/cors";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  async headers() {
    return [
      {
        source: "/api/profile-chat",
        headers: [
          { key: "Vary", value: "Origin" },
          { key: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
      ...ALLOWED_ORIGINS.map((origin) => ({
        source: "/api/profile-chat",
        has: [{ type: "header" as const, key: "origin", value: origin }],
        headers: [{ key: "Access-Control-Allow-Origin", value: origin }],
      })),
    ];
  },
};

export default nextConfig;
