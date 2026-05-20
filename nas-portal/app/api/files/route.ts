import { NextRequest, NextResponse } from "next/server";
import { readdirSync, statSync } from "fs";
import path from "path";

const BASE = "/Volumes/NAS-Data";

export async function GET(req: NextRequest) {
  const dir = req.nextUrl.searchParams.get("path") || "/";
  const fullPath = path.join(BASE, dir);

  try {
    const entries = readdirSync(fullPath);
    const items = entries
      .map((name) => {
        try {
          const p = path.join(fullPath, name);
          const s = statSync(p);
          return {
            name,
            isDirectory: s.isDirectory(),
            size: s.isDirectory() ? null : s.size,
            mtime: s.mtime.toISOString(),
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return NextResponse.json({ path: dir, items });
  } catch {
    return NextResponse.json({ error: "Directory not found" }, { status: 404 });
  }
}
