import { NextResponse } from "next/server";
import { readdirSync, statSync } from "fs";
import path from "path";

const PHOTOS_DIR = "/Volumes/NAS-Data/Photos";

export async function GET() {
  try {
    const entries = readdirSync(PHOTOS_DIR);
    const photos = entries
      .filter((name) => /\.(jpg|jpeg|png|heic|heif|webp)$/i.test(name))
      .map((name) => {
        const p = path.join(PHOTOS_DIR, name);
        const s = statSync(p);
        return { name, mtime: s.mtime.toISOString(), size: s.size };
      })
      .sort((a, b) => b.mtime.localeCompare(a.mtime));

    return NextResponse.json({ photos });
  } catch {
    return NextResponse.json({ photos: [], error: "Photos directory not found" });
  }
}
