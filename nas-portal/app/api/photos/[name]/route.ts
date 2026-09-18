import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { heicToJpeg, isHeicPath } from "@/lib/heic";

const PHOTOS_DIR = "/Volumes/NAS-Data/Photos";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".heic": "image/jpeg",
  ".heif": "image/jpeg",
  ".webp": "image/webp",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const safe = path.basename(name);
  const fullPath = path.join(PHOTOS_DIR, safe);
  const ext = path.extname(safe).toLowerCase();
  const isHeic = isHeicPath(safe);

  try {
    const buf = await readFile(fullPath);
    const explicitW = req.nextUrl.searchParams.get("w");

    if (isHeic) {
      const jpeg = await heicToJpeg(
        buf,
        explicitW ? parseInt(explicitW, 10) || undefined : undefined
      );
      return new Response(new Uint8Array(jpeg), {
        headers: { "Content-Type": "image/jpeg" },
        status: 200,
      });
    }

    if (explicitW) {
      const width = parseInt(explicitW, 10);
      if (width > 0) {
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

    const ua = req.headers.get("user-agent") || "";
    const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);

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
      headers: { "Content-Type": MIME[ext] || "application/octet-stream" },
      status: 200,
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
