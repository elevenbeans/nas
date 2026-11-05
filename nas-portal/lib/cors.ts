import type { NextRequest } from "next/server";

const ALLOWED_HOST = "elevenbeans.me";

function isAllowedHost(hostname: string): boolean {
  return hostname === ALLOWED_HOST || hostname.endsWith(`.${ALLOWED_HOST}`);
}

function isLocalDev(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function isAllowedUrl(value: string | null): boolean {
  if (!value) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol === "https:") return isAllowedHost(url.hostname);
  if (url.protocol === "http:") return isLocalDev(url.hostname);
  return false;
}

/**
 * True when the header points at the very host serving this request — the
 * NAS portal's own pages, including LAN access over `http://192.168.x.x` or
 * `http://<name>.local`, which the public allowlist deliberately excludes.
 * A foreign page cannot satisfy this: its Origin carries its own host.
 */
function isSameOrigin(value: string | null, req: NextRequest): boolean {
  if (!value) return false;
  const host = req.headers.get("host");
  if (!host) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return url.host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

export function isRequestAllowed(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (origin && origin !== "null") {
    return isAllowedUrl(origin) || isSameOrigin(origin, req);
  }
  const referer = req.headers.get("referer");
  return isAllowedUrl(referer) || isSameOrigin(referer, req);
}

export function corsHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = { Vary: "Origin" };
  if (!isRequestAllowed(req)) return headers;

  const origin = req.headers.get("origin");
  headers["Access-Control-Allow-Origin"] =
    origin && origin !== "null" ? origin : "*";
  headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
  headers["Access-Control-Allow-Headers"] = "Content-Type";
  headers["Access-Control-Max-Age"] = "86400";
  return headers;
}
