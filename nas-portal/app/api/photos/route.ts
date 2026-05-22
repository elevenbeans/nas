import { NextResponse } from "next/server";
import { readdirSync, statSync } from "fs";
import path from "path";
import exifr from "exifr";

const PHOTOS_DIR = "/Volumes/NAS-Data/Photos";

const IMAGE_RE = /\.(jpg|jpeg|png|heic|heif|webp)$/i;

async function getCaptureDate(filePath: string): Promise<Date | null> {
  try {
    const exif = await exifr.parse(filePath, ["DateTimeOriginal"]);
    if (exif?.DateTimeOriginal) return exif.DateTimeOriginal;
  } catch {}
  return null;
}

export async function GET() {
  try {
    const entries = readdirSync(PHOTOS_DIR);
    const files = entries.filter((name) => IMAGE_RE.test(name));

    const photos = await Promise.all(
      files.map(async (name) => {
        const p = path.join(PHOTOS_DIR, name);
        const s = statSync(p);
        const capturedAt = (await getCaptureDate(p)) || s.mtime;
        return { name, capturedAt: capturedAt.toISOString(), size: s.size };
      })
    );

    photos.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));

    return NextResponse.json({ photos });
  } catch {
    return NextResponse.json({ photos: [], error: "Photos directory not found" });
  }
}
