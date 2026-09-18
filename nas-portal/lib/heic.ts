import { readFile, writeFile, unlink } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { tmpdir } from "os";
import sharp from "sharp";

const exec = promisify(execFile);

export const HEIC_EXTS = new Set([".heic", ".heif"]);

export function isHeicPath(filePath: string): boolean {
  return HEIC_EXTS.has(path.extname(filePath).toLowerCase());
}

export async function heicToJpeg(buf: Buffer, width?: number): Promise<Buffer> {
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
