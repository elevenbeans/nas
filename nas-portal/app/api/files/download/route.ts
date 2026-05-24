import { NextRequest, NextResponse } from "next/server";
import { createReadStream, statSync } from "fs";
import { resolveSafePath } from "@/lib/api-utils";
import { getMimeType } from "@/lib/file-types";

export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get("path");
  if (!filePath) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }
  const fullPath = resolveSafePath(filePath);
  if (!fullPath) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  try {
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      return NextResponse.json({ error: "Cannot download a directory" }, { status: 400 });
    }
    const mime = getMimeType(filePath);
    const name = filePath.split("/").pop() || "download";
    const encodedName = encodeURIComponent(name);
    const stream = createReadStream(fullPath);
    return new NextResponse(stream as any, {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="${name}"; filename*=UTF-8''${encodedName}`,
        "Content-Length": String(stat.size),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    console.error("Download error:", e);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
