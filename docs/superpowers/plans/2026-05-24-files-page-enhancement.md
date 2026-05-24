# Files Page Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the files browser with image thumbnails, inline video playback, type-specific file icons, and download/stream endpoints.

**Architecture:** Add 3 new API endpoints (thumbnail, download, stream) and extract frontend into reusable components (file-icon, file-row). The existing files API is extended with MIME type info. Sharp handles thumbnail generation. Video streaming uses HTTP Range for seeking.

**Tech Stack:** Next.js 15 App Router, sharp (already installed), lucide-react (already installed), Tailwind v4

---

### Task 1: Create shared path validation utility

**Files:**
- Create: `nas-portal/lib/api-utils.ts`
- Test: manual verification via API after all tasks

- [ ] **Step 1: Create `lib/api-utils.ts`**

```typescript
import path from "path";

const BASE = "/Volumes/NAS-Data";

export function resolveSafePath(requestedPath: string): string | null {
  const fullPath = path.resolve(path.join(BASE, requestedPath));
  if (!fullPath.startsWith(path.resolve(BASE) + path.sep) && fullPath !== path.resolve(BASE)) {
    return null;
  }
  return fullPath;
}

export { BASE };
```

- [ ] **Step 2: Commit**

```bash
git add nas-portal/lib/api-utils.ts
git commit -m "feat: add shared path validation utility"
```

---

### Task 2: Create file type detection library

**Files:**
- Create: `nas-portal/lib/file-types.ts`

- [ ] **Step 1: Create `lib/file-types.ts`**

```typescript
const EXT_MIME: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".png": "image/png", ".gif": "image/gif",
  ".webp": "image/webp", ".heic": "image/heic",
  ".heif": "image/heif", ".avif": "image/avif",
  ".tiff": "image/tiff", ".tif": "image/tiff",
  ".bmp": "image/bmp",
  ".mp4": "video/mp4", ".webm": "video/webm",
  ".mov": "video/quicktime", ".avi": "video/x-msvideo",
  ".mkv": "video/x-matroska",
  ".mp3": "audio/mpeg", ".wav": "audio/wav",
  ".flac": "audio/flac", ".aac": "audio/aac",
  ".m4a": "audio/mp4", ".opus": "audio/opus",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".csv": "text/csv",
  ".txt": "text/plain", ".md": "text/markdown",
  ".json": "application/json", ".xml": "application/xml",
  ".yaml": "text/yaml", ".yml": "text/yaml",
  ".js": "text/javascript", ".ts": "text/typescript",
  ".py": "text/x-python", ".sh": "text/x-shellscript",
  ".html": "text/html", ".css": "text/css",
  ".zip": "application/zip", ".tar": "application/x-tar",
  ".gz": "application/gzip", ".rar": "application/vnd.rar",
  ".7z": "application/x-7z-compressed",
};

const BROWSER_VIDEO = new Set([".mp4", ".webm"]);

export type FileCategory =
  | "image" | "video" | "audio" | "pdf"
  | "document" | "spreadsheet" | "archive"
  | "code" | "text" | "other";

export function getExtension(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i === -1 ? "" : filename.slice(i);
}

export function getMimeType(filename: string): string {
  return EXT_MIME[getExtension(filename).toLowerCase()] || "application/octet-stream";
}

export function getFileCategory(filename: string): FileCategory {
  const ext = getExtension(filename).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif", ".avif", ".tiff", ".tif", ".bmp"].includes(ext)) return "image";
  if ([".mp4", ".webm", ".mov", ".avi", ".mkv"].includes(ext)) return "video";
  if ([".mp3", ".wav", ".flac", ".aac", ".m4a", ".opus"].includes(ext)) return "audio";
  if (ext === ".pdf") return "pdf";
  if ([".doc", ".docx"].includes(ext)) return "document";
  if ([".xls", ".xlsx", ".csv"].includes(ext)) return "spreadsheet";
  if ([".zip", ".tar", ".gz", ".rar", ".7z"].includes(ext)) return "archive";
  if ([".js", ".ts", ".py", ".sh", ".html", ".css", ".json", ".xml", ".yaml", ".yml"].includes(ext)) return "code";
  if ([".txt", ".md"].includes(ext)) return "text";
  return "other";
}

export function isVideoBrowserSupported(filename: string): boolean {
  return BROWSER_VIDEO.has(getExtension(filename).toLowerCase());
}

export function isPreviewableInBrowser(filename: string): boolean {
  return getFileCategory(filename) === "pdf" || getFileCategory(filename) === "text" || getFileCategory(filename) === "code";
}
```

- [ ] **Step 2: Commit**

```bash
git add nas-portal/lib/file-types.ts
git commit -m "feat: add file type detection and MIME mapping"
```

---

### Task 3: Modify /api/files to return mimeType

**Files:**
- Modify: `nas-portal/app/api/files/route.ts`
- Uses: `lib/api-utils.ts`, `lib/file-types.ts`

- [ ] **Step 1: Rewrite the API route to use shared utils and include mimeType**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { readdirSync, statSync } from "fs";
import path from "path";
import { resolveSafePath } from "@/lib/api-utils";
import { getMimeType } from "@/lib/file-types";

export async function GET(req: NextRequest) {
  const dir = req.nextUrl.searchParams.get("path") || "/";
  const fullPath = resolveSafePath(dir);
  if (!fullPath) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  try {
    const entries = readdirSync(fullPath);
    const items = entries
      .map((name) => {
        try {
          const p = path.join(fullPath, name);
          const s = statSync(p);
          return {
            name,
            isDirectory: s.isDirectory(),
            size: s.isDirectory() ? null : s.size,
            mtime: s.mtime.toISOString(),
            mimeType: s.isDirectory() ? null : getMimeType(name),
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .filter((item: any) => !item.name.startsWith(".") && item.name !== "Docker");
    return NextResponse.json({ path: dir, items });
  } catch {
    return NextResponse.json({ error: "Directory not found" }, { status: 404 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add nas-portal/app/api/files/route.ts
git commit -m "feat: add mimeType to file listing response"
```

---

### Task 4: Create /api/files/thumbnail endpoint

**Files:**
- Create: `nas-portal/app/api/files/thumbnail/route.ts`
- Uses: `lib/api-utils.ts`, `lib/file-types.ts`, `sharp`

- [ ] **Step 1: Create the thumbnail endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import sharp from "sharp";
import { resolveSafePath, BASE } from "@/lib/api-utils";
import { getFileCategory, getMimeType } from "@/lib/file-types";

export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get("path");
  if (!filePath) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
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
    const buf = readFileSync(fullPath);
    const resized = await sharp(buf)
      .resize(200, 200, { fit: "cover", position: "centre" })
      .jpeg({ quality: 80 })
      .toBuffer();
    return new NextResponse(resized, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "Failed to generate thumbnail" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add nas-portal/app/api/files/thumbnail/route.ts
git commit -m "feat: add image thumbnail generation endpoint"
```

---

### Task 5: Create /api/files/download endpoint

**Files:**
- Create: `nas-portal/app/api/files/download/route.ts`

- [ ] **Step 1: Create the download endpoint**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add nas-portal/app/api/files/download/route.ts
git commit -m "feat: add file download endpoint"
```

---

### Task 6: Create /api/files/stream endpoint for video

**Files:**
- Create: `nas-portal/app/api/files/stream/route.ts`

- [ ] **Step 1: Create the streaming endpoint with range request support**

```typescript
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
    const range = req.headers.get("range");

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = end - start + 1;
      const stream = createReadStream(fullPath, { start, end });
      return new NextResponse(stream as any, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Accept-Ranges": "bytes",
          "Content-Type": mime,
          "Content-Length": String(chunkSize),
        },
      });
    }

    const stream = createReadStream(fullPath);
    return new NextResponse(stream as any, {
      headers: {
        "Content-Type": mime,
        "Accept-Ranges": "bytes",
        "Content-Length": String(stat.size),
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add nas-portal/app/api/files/stream/route.ts
git commit -m "feat: add video streaming endpoint with range support"
```

---

### Task 7: Update i18n with new translation keys

**Files:**
- Modify: `nas-portal/lib/i18n.ts`

- [ ] **Step 1: Add play, download, preview, hide keys**

In the `files` section of both `zh` and `en` locales, add:

```typescript
// zh:
files: {
  back: "← 返回",
  loadError: "无法加载文件",
  play: "播放",
  download: "下载",
  preview: "预览",
  hide: "隐藏",
},

// en:
files: {
  back: "← Back",
  loadError: "Failed to load files",
  play: "Play",
  download: "Download",
  preview: "Preview",
  hide: "Hide",
},
```

Full edit: add the 4 new keys after `loadError` in both locale definitions.

- [ ] **Step 2: Commit**

```bash
git add nas-portal/lib/i18n.ts
git commit -m "feat: add i18n keys for play/download/preview/hide"
```

---

### Task 8: Create FileIcon component

**Files:**
- Create: `nas-portal/components/file-icon.tsx`

- [ ] **Step 1: Create the icon component**

```typescript
"use client";

import { useState } from "react";
import {
  FileText, FileSpreadsheet, FileArchive, File as FileIcon,
  Video, Music, Folder,
} from "lucide-react";
import { getFileCategory, isVideoBrowserSupported } from "@/lib/file-types";

type FileIconProps = {
  name: string;
  isDirectory: boolean;
  path: string;
};

const bgColors: Record<string, string> = {
  pdf: "bg-red-50",
  document: "bg-blue-50",
  spreadsheet: "bg-green-50",
  archive: "bg-gray-100",
  code: "bg-gray-100",
  text: "bg-gray-100",
  audio: "bg-gray-100",
  video: "bg-neutral-900",
  image: "",
  other: "bg-gray-100",
};

const iconColors: Record<string, string> = {
  pdf: "text-red-600",
  document: "text-blue-600",
  spreadsheet: "text-green-600",
  archive: "text-gray-500",
  code: "text-gray-500",
  text: "text-gray-500",
  audio: "text-gray-500",
  video: "text-white",
  other: "text-gray-500",
};

export default function FileIcon({ name, isDirectory, path }: FileIconProps) {
  const [thumbError, setThumbError] = useState(false);

  if (isDirectory) {
    return (
      <div className="w-11 h-11 rounded-[6px] bg-gray-100 flex items-center justify-center shrink-0">
        <Folder className="w-5 h-5 text-gray-500" />
      </div>
    );
  }

  const category = getFileCategory(name);

  if (category === "image" && !thumbError) {
    return (
      <div className="w-11 h-11 rounded-[6px] overflow-hidden shrink-0 bg-gray-100">
        <img
          src={`/api/files/thumbnail?path=${encodeURIComponent(path)}`}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setThumbError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  if (category === "video") {
    const supported = isVideoBrowserSupported(name);
    return (
      <div className={`w-11 h-11 rounded-[6px] ${bgColors[category]} flex items-center justify-center shrink-0`}>
        {supported ? (
          <Video className={`w-5 h-5 ${iconColors[category]}`} />
        ) : (
          <Video className={`w-5 h-5 ${iconColors[category]}`} />
        )}
      </div>
    );
  }

  const Icon = iconMap[category] || FileIcon;

  return (
    <div className={`w-11 h-11 rounded-[6px] ${bgColors[category] || "bg-gray-100"} flex items-center justify-center shrink-0`}>
      <Icon className={`w-5 h-5 ${iconColors[category] || "text-gray-500"}`} />
    </div>
  );
}

// ...rest of file
```

Actually, let me make sure I list the full icon map correctly. The full component:

```typescript
"use client";

import { useState } from "react";
import {
  FileText, FileSpreadsheet, FileArchive, File as FileIcon,
  Video, Music, Folder, FileImage,
} from "lucide-react";
import { getFileCategory, isVideoBrowserSupported } from "@/lib/file-types";

type FileIconProps = {
  name: string;
  isDirectory: boolean;
  path: string;
};

const iconMap: Record<string, any> = {
  pdf: FileText,
  document: FileText,
  spreadsheet: FileSpreadsheet,
  archive: FileArchive,
  code: FileText,
  text: FileText,
  audio: Music,
  video: Video,
};

const bgColors: Record<string, string> = {
  pdf: "bg-red-50",
  document: "bg-blue-50",
  spreadsheet: "bg-green-50",
  archive: "bg-stone-100",
  code: "bg-gray-100",
  text: "bg-gray-100",
  audio: "bg-gray-100",
  video: "bg-neutral-900",
};

const iconColors: Record<string, string> = {
  pdf: "text-red-600",
  document: "text-blue-600",
  spreadsheet: "text-green-600",
  archive: "text-stone-500",
  code: "text-gray-500",
  text: "text-gray-500",
  audio: "text-gray-500",
  video: "text-white",
};

export default function FileIcon({ name, isDirectory, path }: FileIconProps) {
  const [thumbError, setThumbError] = useState(false);

  if (isDirectory) {
    return (
      <div className="w-11 h-11 rounded-[6px] bg-gray-100 flex items-center justify-center shrink-0">
        <Folder className="w-5 h-5 text-gray-500" />
      </div>
    );
  }

  const category = getFileCategory(name);

  if (category === "image" && !thumbError) {
    return (
      <div className="w-11 h-11 rounded-[6px] overflow-hidden shrink-0 bg-gray-100">
        <img
          src={`/api/files/thumbnail?path=${encodeURIComponent(path)}`}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setThumbError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  const Icon = iconMap[category] || FileIcon;

  return (
    <div className={`w-11 h-11 rounded-[6px] ${bgColors[category] || "bg-gray-100"} flex items-center justify-center shrink-0`}>
      <Icon className={`w-5 h-5 ${iconColors[category] || "text-gray-500"}`} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add nas-portal/components/file-icon.tsx
git commit -m "feat: add FileIcon component with thumbnails and type icons"
```

---

### Task 9: Create FileRow component

**Files:**
- Create: `nas-portal/components/file-row.tsx`

- [ ] **Step 1: Create the row component**

```typescript
"use client";

import { useState } from "react";
import FileIcon from "@/components/file-icon";
import { useLanguage } from "@/components/language-toggle";
import { locales } from "@/lib/i18n";
import {
  getFileCategory, isVideoBrowserSupported, isPreviewableInBrowser,
} from "@/lib/file-types";

type FileEntry = {
  name: string;
  isDirectory: boolean;
  size: number | null;
  mtime: string;
  mimeType?: string | null;
};

type FileRowProps = {
  item: FileEntry;
  dir: string;
  onNavigate: (name: string) => void;
};

function formatSize(size: number): string {
  if (size > 1024 * 1024 * 1024) return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (size > 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${(size / 1024).toFixed(1)} KB`;
}

export default function FileRow({ item, dir, onNavigate }: FileRowProps) {
  const { locale } = useLanguage();
  const t = locales[locale];
  const [showVideo, setShowVideo] = useState(false);

  const itemPath = dir === "/" ? `/${item.name}` : `${dir}/${item.name}`;

  if (item.isDirectory) {
    return (
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#f0f0f2] last:border-0">
        <div className="flex items-center gap-3 min-w-0">
          <FileIcon name={item.name} isDirectory path={itemPath} />
          <button
            onClick={() => onNavigate(item.name)}
            className="text-sm font-medium text-apple-text bg-transparent border-0 cursor-pointer hover:text-clean-blue truncate"
          >
            {item.name}
          </button>
        </div>
        <span className="text-xs text-apple-muted shrink-0 ml-4">—</span>
      </div>
    );
  }

  const category = getFileCategory(item.name);

  const renderAction = () => {
    if (category === "video" && isVideoBrowserSupported(item.name)) {
      return (
        <button
          onClick={() => setShowVideo(!showVideo)}
          className="text-xs text-clean-blue bg-transparent border-0 cursor-pointer hover:underline"
        >
          {showVideo ? t.files.hide : t.files.play}
        </button>
      );
    }
    if (isPreviewableInBrowser(item.name)) {
      return (
        <a
          href={`/api/files/download?path=${encodeURIComponent(itemPath)}`}
          target="_blank"
          className="text-xs text-clean-blue hover:underline"
        >
          {t.files.preview}
        </a>
      );
    }
    return (
      <a
        href={`/api/files/download?path=${encodeURIComponent(itemPath)}`}
        className="text-xs text-apple-muted hover:text-clean-blue"
      >
        {t.files.download}
      </a>
    );
  };

  return (
    <>
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#f0f0f2] last:border-0">
        <div className="flex items-center gap-3 min-w-0">
          <FileIcon name={item.name} isDirectory={false} path={itemPath} />
          <div className="min-w-0">
            <div className="text-sm text-apple-text truncate">{item.name}</div>
            <div className="mt-0.5">{renderAction()}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {item.size != null && (
            <span className="text-xs text-apple-muted">{formatSize(item.size)}</span>
          )}
        </div>
      </div>
      {showVideo && category === "video" && (
        <div className="px-5 py-3 border-b border-[#f0f0f2] bg-gray-50">
          <video
            controls
            autoPlay
            className="w-full max-h-[480px] rounded-lg"
            preload="metadata"
          >
            <source
              src={`/api/files/stream?path=${encodeURIComponent(itemPath)}`}
              type={item.mimeType || "video/mp4"}
            />
          </video>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add nas-portal/components/file-row.tsx
git commit -m "feat: add FileRow component with inline video playback"
```

---

### Task 10: Update files page to use new components

**Files:**
- Modify: `nas-portal/app/files/page.tsx`

- [ ] **Step 1: Rewrite the page to use FileRow**

```typescript
"use client";

import { useEffect, useState } from "react";
import FileRow from "@/components/file-row";
import { useLanguage } from "@/components/language-toggle";
import { locales } from "@/lib/i18n";

type FileEntry = {
  name: string;
  isDirectory: boolean;
  size: number | null;
  mtime: string;
  mimeType?: string | null;
};

export default function FilesPage() {
  const { locale } = useLanguage();
  const t = locales[locale];
  const [dir, setDir] = useState("/");
  const [items, setItems] = useState<FileEntry[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/files?path=${encodeURIComponent(dir)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setItems(data.items);
      })
      .catch(() => setError(t.files.loadError));
  }, [dir, t.files.loadError]);

  const goInto = (name: string) => {
    setDir((prev) => (prev === "/" ? `/${name}` : `${prev}/${name}`));
    setError("");
  };

  const goBack = () => {
    setDir((prev) => {
      const parts = prev.replace(/\/$/, "").split("/");
      parts.pop();
      return parts.join("/") || "/";
    });
    setError("");
  };

  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 pt-10 pb-20">
      <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-1">
        {t.nav.files}
      </h1>
      <p className="text-[15px] text-apple-muted mb-4">NAS‑Data{dir}</p>

      {dir !== "/" && (
        <button
          onClick={goBack}
          className="text-sm text-clean-blue mb-4 bg-transparent border-0 cursor-pointer"
        >
          {t.files.back}
        </button>
      )}

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <div className="bg-white rounded-[20px] overflow-hidden">
        {items.map((item) => (
          <FileRow
            key={item.name}
            item={item}
            dir={dir}
            onNavigate={goInto}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build the project to check for type errors**

Run: `cd nas-portal && npx tsc --noEmit`
Expected: no type errors

- [ ] **Step 3: Commit**

```bash
git add nas-portal/app/files/page.tsx
git commit -m "feat: integrate new FileRow component into files page"
```

---

### Self-Review Checklist

1. **Spec coverage:** All spec items covered — image thumbnails (Task 4, 8), video playback (Task 6, 9), type-specific icons (Task 8), download (Task 5), i18n (Task 7).
2. **Placeholders:** No TBDs, TODOs, or vague steps.
3. **Type consistency:** All `FileEntry` types match between API response and frontend props. `resolveSafePath` used consistently across all 3 new API endpoints. `getFileCategory`/`getMimeType` used consistently. `mimeType` is added to the API response and used in the frontend.
4. **Edge cases:** Broken thumbnails fall back to icon (onError handler), video seeking supported via range requests, directory folders get Folder icon instead of file icon, size formatting handles GB/MB/KB.
