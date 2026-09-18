import { NextRequest } from "next/server";

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;
const buckets = new Map<string, number[]>();

function getClientIp(req: NextRequest): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf;
  return "unknown";
}

export function isRateLimited(req: NextRequest): boolean {
  const ip = getClientIp(req);
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  if (buckets.size > 500) {
    for (const [k, times] of buckets) {
      const fresh = times.filter((t) => t > cutoff);
      if (fresh.length === 0) buckets.delete(k);
      else buckets.set(k, fresh);
    }
  }
  const times = (buckets.get(ip) ?? []).filter((t) => t > cutoff);
  if (times.length >= RATE_MAX) {
    buckets.set(ip, times);
    return true;
  }
  times.push(now);
  buckets.set(ip, times);
  return false;
}
