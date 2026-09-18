import { NextResponse } from "next/server";
import { readdirSync, statSync } from "fs";
import path from "path";
import exifr from "exifr";

const PHOTOS_DIR = "/Volumes/NAS-Data/Photos";

const IMAGE_RE = /\.(jpg|jpeg|png|heic|heif|webp)$/i;

async function getCaptureDate(filePath: string): Promise<Date | null> {
  try {
    const exif = await exifr.parse(filePath, ["DateTimeOriginal"]);
    const date = exif?.DateTimeOriginal;
    if (date instanceof Date && !Number.isNaN(date.getTime())) return date;
  } catch {}
  return null;
}

export async function GET() {
  let entries: string[];
  try {
    entries = readdirSync(PHOTOS_DIR);
  } catch {
    return NextResponse.json({ photos: [], error: "Photos directory not found" });
  }

  const files = entries.filter((name) => IMAGE_RE.test(name));

  try {
    const photos = (
      await Promise.all(
        files.map(async (name) => {
          const p = path.join(PHOTOS_DIR, name);
          try {
            const s = statSync(p);
            const capturedAt = (await getCaptureDate(p)) || s.mtime;
            return { name, capturedAt: capturedAt.toISOString(), size: s.size };
          } catch (err) {
            console.error(`Failed to process photo ${name}`, err);
            return null;
          }
        })
      )
    ).filter((p): p is { name: string; capturedAt: string; size: number } => p !== null);

    photos.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));

    return NextResponse.json({ photos });
  } catch (err) {
    console.error("Failed to list photos", err);
    return NextResponse.json({ photos: [], error: "Failed to process photos" });
  }
}
