import { NextRequest } from "next/server";

const PRIVATE_PREFIXES = ["localhost", "127.0.0.1", "192.168.", "10.", "172."];

export function isExternalRequest(req: NextRequest): boolean {
  const host = req.headers.get("host") || "";
  return !PRIVATE_PREFIXES.some((p) => host.startsWith(p));
}

const MOVIE_DIR = "movies";

export function isMoviePath(requestedPath: string): boolean {
  const cleaned = requestedPath.replace(/^\/+/, "").toLowerCase();
  return cleaned === MOVIE_DIR || cleaned.startsWith(MOVIE_DIR + "/");
}
