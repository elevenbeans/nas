import { NextRequest } from "next/server";
import { corsHeaders, isRequestAllowed } from "@/lib/cors";
import {
  addEvent,
  getClientIp,
  getScores,
  isCityId,
  isIpRateLimited,
  isScoreAction,
  isValidEventId,
  isValidSession,
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

export async function GET(req: NextRequest): Promise<Response> {
  if (!isRequestAllowed(req)) return json(req, { error: "forbidden" }, 403);
  const ip = getClientIp(req);
  if (isIpRateLimited(ip, "earth-score-get", 240, 60_000)) {
    return json(req, { error: "rate_limited" }, 429);
  }
  return json(req, await getScores());
}

export async function POST(req: NextRequest): Promise<Response> {
  if (!isRequestAllowed(req)) return json(req, { error: "forbidden" }, 403);

  const ip = getClientIp(req);
  if (isIpRateLimited(ip, "earth-score-post", 120, 60_000)) {
    return json(req, { error: "rate_limited" }, 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "invalid_json" }, 400);
  }
  if (!body || typeof body !== "object") {
    return json(req, { error: "invalid_body" }, 400);
  }

  const payload = body as Record<string, unknown>;
  const token = typeof payload.token === "string" ? payload.token : "";
  const cityId = payload.cityId;
  const action = payload.action;
  const eventId = payload.eventId;

  if (!token || !isValidSession(token)) {
    return json(req, { error: "session" }, 401);
  }
  if (!isCityId(cityId) || !isScoreAction(action) || !isValidEventId(eventId)) {
    return json(req, { error: "invalid_event" }, 400);
  }

  const result = await addEvent({ token, cityId, action, eventId });
  if (result.rateLimited) {
    return json(
      req,
      { error: "rate_limited", retryAfter: result.retryAfter ?? 1 },
      429
    );
  }
  return json(req, result);
}

export async function OPTIONS(req: NextRequest): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}
