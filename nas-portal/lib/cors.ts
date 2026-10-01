import type { NextRequest } from "next/server";

export function corsHeaders(_req: NextRequest): Record<string, string> {
  return {
    Vary: "Origin",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}
