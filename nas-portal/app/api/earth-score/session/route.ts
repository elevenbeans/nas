import { NextRequest } from "next/server";
import { corsHeaders, isRequestAllowed } from "@/lib/cors";
import {
  getClientIp,
  isIpRateLimited,
  issueSession,
} from "@/lib/earth-score";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(req: NextRequest, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req: NextRequest): Promise<Response> {
  if (!isRequestAllowed(req)) return json(req, { error: "forbidden" }, 403);

  const ip = getClientIp(req);
  if (isIpRateLimited(ip, "earth-score-session", 30, 60_000)) {
    return json(req, { error: "rate_limited" }, 429);
  }

  return json(req, issueSession());
}

export async function OPTIONS(req: NextRequest): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}
