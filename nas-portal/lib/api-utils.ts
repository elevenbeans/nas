import path from "path";
import { realpathSync } from "fs";

const BASE = realpathSync("/Volumes/NAS-Data");

export function resolveSafePath(requestedPath: string): string | null {
  try {
    const fullPath = realpathSync(path.resolve(path.join(BASE, requestedPath)));
    if (!fullPath.startsWith(BASE + path.sep) && fullPath !== BASE) {
      return null;
    }
    return fullPath;
  } catch {
    return null;
  }
}

export { BASE };
