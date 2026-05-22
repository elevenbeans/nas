import { NextRequest } from "next/server";
import { readFile, writeFile, unlink } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { tmpdir } from "os";
import sharp from "sharp";

const PHOTOS_DIR = "/Volumes/NAS-Data/Photos";
const exec = promisify(execFile);

const HEIC_EXTS = new Set([".heic", ".heif"]);

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".heic": "image/jpeg",
  ".heif": "image/jpeg",
  ".webp": "image/webp",
};

async function heicToJpeg(buf: Buffer, width?: number): Promise<Buffer> {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const tmpIn = path.join(tmpdir(), `heic_${id}.heic`);
  const tmpOut = path.join(tmpdir(), `heic_${id}.jpg`);
  try {
    await writeFile(tmpIn, buf);
    await exec("sips", ["-s", "format", "jpeg", tmpIn, "--out", tmpOut]);
    const jpegBuf = await readFile(tmpOut);
    const pipeline = sharp(jpegBuf, { failOnError: false }).rotate(0).jpeg({ quality: 80, mozjpeg: true });
    if (width) pipeline.resize({ width, withoutEnlargement: true });
    return await pipeline.toBuffer();
  } finally {
    await unlink(tmpIn).catch(() => {});
    await unlink(tmpOut).catch(() => {});
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const safe = path.basename(name);
  const fullPath = path.join(PHOTOS_DIR, safe);
  const ext = path.extname(safe).toLowerCase();
  const isHeic = HEIC_EXTS.has(ext);

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
