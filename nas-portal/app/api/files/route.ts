import { NextRequest, NextResponse } from "next/server";
import { readdirSync, statSync } from "fs";
import path from "path";
import { resolveSafePath } from "@/lib/api-utils";
import { getMimeType } from "@/lib/file-types";
import { isExternalRequest, isMoviePath } from "@/lib/network-utils";

export async function GET(req: NextRequest) {
  const dir = req.nextUrl.searchParams.get("path") || "/";
  const fullPath = resolveSafePath(dir);
  if (!fullPath) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  try {
    const entries = readdirSync(fullPath);
    const restricted = isExternalRequest(req) && isMoviePath(dir);
    const items = entries
      .map((name) => {
        try {
          const p = path.join(fullPath, name);
          const s = statSync(p);
          const base = {
            name,
            isDirectory: s.isDirectory(),
            size: s.isDirectory() ? null : s.size,
          };
          if (restricted) return base;
          return {
            ...base,
            mtime: s.mtime.toISOString(),
            mimeType: s.isDirectory() ? null : getMimeType(name),
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .filter((item: any) => !item.name.startsWith(".") && item.name !== "Docker");
    return NextResponse.json({ path: dir, items, ...(restricted && { restricted: true }) });
  } catch {
    return NextResponse.json({ error: "Directory not found" }, { status: 404 });
  }
}
