import type { NextRequest } from "next/server";
import path from "node:path";

/**
 * True when the hostname looks like the home network: loopback, mDNS
 * (`*.local`), or a private IPv4/IPv6 literal. Parsed rather than prefix
 * matched, so `10.example.com` stays external and `172.15.x` is not treated
 * as private (only 172.16/12 is).
 */
function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return false;
  if (host === "localhost" || host.endsWith(".local")) return true;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    if (a === 10 || a === 127) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true;
    return false;
  }

  if (host.includes(":")) {
    if (host === "::1") return true;
    if (/^fe80:/.test(host)) return true;
    if (/^f[cd][0-9a-f]{2}:/.test(host)) return true;
  }
  return false;
}

export function isExternalRequest(req: NextRequest): boolean {
  const header = req.headers.get("host") || "";
  const hostname = header.replace(/:\d+$/, "").replace(/^\[|\]$/g, "");
  return !isPrivateHostname(hostname);
}

const MOVIE_DIR = "movies";

/**
 * True when a NAS-relative path (leading slash optional) points at Movies/.
 *
 * The path is normalized before matching, so `..` segments cannot disguise the
 * target: `/Photos/../Movies/x` becomes `/Movies/x` and is rejected.
 */
export function isMoviePath(requestedPath: string): boolean {
  const normalized = path.posix
    .normalize(String(requestedPath ?? "").replace(/\\/g, "/"))
    .replace(/^\/+/, "")
    .toLowerCase();
  return normalized === MOVIE_DIR || normalized.startsWith(`${MOVIE_DIR}/`);
}

/**
 * True when a path already resolved inside `base` lands in Movies/. This sees
 * through symlinks and anything else the raw-path check above cannot catch.
 */
export function isMovieResolvedPath(base: string, resolvedPath: string): boolean {
  const relative = path.relative(base, resolvedPath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return false;
  return isMoviePath(relative);
}
