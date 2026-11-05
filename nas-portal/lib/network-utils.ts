import type { NextRequest } from "next/server";
import path from "node:path";

const PRIVATE_PREFIXES = ["localhost", "127.0.0.1", "192.168.", "10.", "172."];

export function isExternalRequest(req: NextRequest): boolean {
  const host = req.headers.get("host") || "";
  return !PRIVATE_PREFIXES.some((p) => host.startsWith(p));
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
