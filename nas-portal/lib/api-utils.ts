import path from "path";

const BASE = "/Volumes/NAS-Data";

export function resolveSafePath(requestedPath: string): string | null {
  const fullPath = path.resolve(path.join(BASE, requestedPath));
  if (!fullPath.startsWith(path.resolve(BASE) + path.sep) && fullPath !== path.resolve(BASE)) {
    return null;
  }
  return fullPath;
}

export { BASE };
