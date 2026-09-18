import type { NextRequest } from "next/server";

export const ALLOWED_ORIGINS = [
  "https://elevenbeans.me",
  "https://www.elevenbeans.me",
  "http://localhost:8080",
  "http://localhost:3001",
];

const ALLOWED = new Set(ALLOWED_ORIGINS);

export function corsHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
  const origin = req.headers.get("origin");
  if (origin && ALLOWED.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}
