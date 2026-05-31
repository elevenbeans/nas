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
      return NextResponse.json({ error: "Cannot stream a directory" }, { status: 400 });
    }
    const mime = getMimeType(filePath);
    const fileSize = stat.size;
    const range = req.headers.get("range");

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const rawStart = parts[0] === "" ? undefined : parseInt(parts[0], 10);
      const rawEnd = parts[1] ? parseInt(parts[1], 10) : undefined;

      if ((rawStart !== undefined && isNaN(rawStart)) || (rawEnd !== undefined && isNaN(rawEnd))) {
        return NextResponse.json({ error: "Invalid range" }, { status: 400 });
      }

      let start: number;
      let end: number;

      if (rawStart === undefined && rawEnd !== undefined) {
        start = Math.max(0, fileSize - rawEnd);
        end = fileSize - 1;
      } else {
        start = Math.max(0, rawStart!);
        end = rawEnd !== undefined ? rawEnd : fileSize - 1;
      }

      if (start >= fileSize) {
        return new NextResponse("Range Not Satisfiable", {
          status: 416,
          headers: { "Content-Range": `bytes */${fileSize}` },
        });
      }

      end = Math.min(end, fileSize - 1);
      const chunkSize = end - start + 1;
      const stream = createReadStream(fullPath, { start, end });
      return new NextResponse(stream as any, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Type": mime,
          "Content-Length": String(chunkSize),
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const stream = createReadStream(fullPath);
    return new NextResponse(stream as any, {
      headers: {
        "Content-Type": mime,
        "Accept-Ranges": "bytes",
        "Content-Length": String(fileSize),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    console.error("Stream error:", e);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
