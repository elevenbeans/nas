import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const PHOTOS_DIR = "/Volumes/NAS-Data/Photos";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const safe = path.basename(name);
  const fullPath = path.join(PHOTOS_DIR, safe);

  try {
    const buf = await readFile(fullPath);
    const ext = path.extname(safe).toLowerCase();
    const mime: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".heic": "image/heic",
      ".heif": "image/heif",
      ".webp": "image/webp",
    };
    return new NextResponse(buf, {
      headers: { "Content-Type": mime[ext] || "application/octet-stream" },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
