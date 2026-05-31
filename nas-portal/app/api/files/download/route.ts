import { NextRequest, NextResponse } from "next/server";
import { createReadStream, statSync } from "fs";
import { resolveSafePath } from "@/lib/api-utils";
import { getMimeType } from "@/lib/file-types";
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
  try {
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      return NextResponse.json({ error: "Cannot download a directory" }, { status: 400 });
    }
    const inline = req.nextUrl.searchParams.get("inline") === "1";
    const mime = getMimeType(filePath);
    const name = filePath.split("/").pop() || "download";
    const encodedName = encodeURIComponent(name);
    const disp = inline ? "inline" : "attachment";
    const stream = createReadStream(fullPath);
    return new NextResponse(stream as any, {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `${disp}; filename="${name}"; filename*=UTF-8''${encodedName}`,
        "Content-Length": String(stat.size),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    console.error("Download error:", e);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
