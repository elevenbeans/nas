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
    const mime = getMimeType(filePath);
    const name = filePath.split("/").pop() || "download";
    const stream = createReadStream(fullPath);
    return new NextResponse(stream as any, {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="${name}"`,
        "Content-Length": String(stat.size),
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
