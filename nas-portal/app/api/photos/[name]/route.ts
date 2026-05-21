import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

const PHOTOS_DIR = "/Volumes/NAS-Data/Photos";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const safe = path.basename(name);
  const fullPath = path.join(PHOTOS_DIR, safe);
  const ext = path.extname(safe).toLowerCase();
  const mime: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".heic": "image/heic",
    ".heif": "image/heif",
    ".webp": "image/webp",
  };

  const ua = req.headers.get("user-agent") || "";
  const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  try {
    const explicitW = req.nextUrl.searchParams.get("w");
    if (explicitW) {
      const width = parseInt(explicitW, 10);
      if (width > 0) {
        const buf = await readFile(fullPath);
        const resized = await sharp(buf)
          .resize({ width, withoutEnlargement: true })
          .jpeg({ quality: 80, mozjpeg: true })
          .toBuffer();
        return new Response(new Uint8Array(resized), {
          headers: { "Content-Type": "image/jpeg" },
          status: 200,
        });
      }
    }

    const buf = await readFile(fullPath);

    if (isMobile) {
      const resized = await sharp(buf)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();
      return new Response(new Uint8Array(resized), {
        headers: { "Content-Type": "image/jpeg" },
        status: 200,
      });
    }

    return new Response(buf, {
      headers: { "Content-Type": mime[ext] || "application/octet-stream" },
      status: 200,
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
