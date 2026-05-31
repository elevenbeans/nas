import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { resolveSafePath } from "@/lib/api-utils";
import { getFileCategory } from "@/lib/file-types";
import { isExternalRequest, isMoviePath } from "@/lib/network-utils";

export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get("path");
  if (!filePath) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }
  if (isExternalRequest(req) && isMoviePath(filePath)) {
    return NextResponse.json({ error: "Access denied due to copyright restrictions" }, { status: 403 });
  }
  const fullPath = resolveSafePath(filePath);
  if (!fullPath) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  const category = getFileCategory(filePath);
  if (category !== "image") {
    return NextResponse.json({ error: "Not an image" }, { status: 404 });
  }
  try {
    const resized = await sharp(fullPath)
      .resize(200, 200, { fit: "cover", position: "centre" })
      .jpeg({ quality: 80 })
      .toBuffer();
    return new NextResponse(new Uint8Array(resized), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate thumbnail" }, { status: 500 });
  }
}
