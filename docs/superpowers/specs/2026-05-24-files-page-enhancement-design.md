# Files Page Enhancement Design

## Overview

Enhance the NAS files browser with rich media previews — image thumbnails (macOS as-icon style), inline video playback for browser-supported formats, download links for unsupported formats, and type-specific file icons for all other file types.

## Architecture

### Backend: New & Modified API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/files?path=` | Existing (modified) | Add `mimeType` field to each entry |
| `GET /api/files/thumbnail?path=` | New | Serve 200px-wide image thumbnails via sharp |
| `GET /api/files/download?path=` | New | Serve file with Content-Disposition: attachment |
| `GET /api/files/stream?path=` | New | Serve video with range-request support |

### File Type Detection

A shared helper (`lib/file-types.ts`) maps extensions to MIME types and categories:

```
Category: image, video, audio, document, spreadsheet, archive, code, text, pdf, other
```

Extension → MIME mapping for browser-supported video formats: `.mp4` (video/mp4), `.webm` (video/webm), `.ogg` (video/ogg). All other video extensions (.mov, .avi, .mkv, .wmv, .flv) are marked as unsupported.

### Thumbnail Generation (sharp)

Reuses the existing `sharp` dependency. Generates 200px-wide thumbnails on the fly. Supports JPEG, PNG, HEIC, WebP, AVIF, TIFF. Non-image files return a 404 placeholder icon.

### Video Streaming

The `/api/files/stream` endpoint reads the file and pipes it with proper `Content-Type`, `Content-Length`, and HTTP Range header support (for seeking). Browser-supported formats render in `<video>`; unsupported formats show a download link.

### File Download

The `/api/files/download` endpoint sets `Content-Disposition: attachment` and `Content-Type` based on MIME detection. No range support needed — simple streaming response.

## Frontend

### File Row Rendering

Each row in the file list has a 44×44 icon box on the left:

```
┌──────────────────────────────────────────┐
│ ┌──────┐ filename.txt           120 KB  │
│ │ icon │                        ⤓ Down  │
│ └──────┘                                │
├──────────────────────────────────────────┤
│ ┌──────┐                              │
│ │  🌄 │ photo.jpg              3.2 MB  │
│ └──────┘                                │
├──────────────────────────────────────────┤
│ ┌──────┐ vacation.mp4         128 MB    │
│ │ ▶   │                   ▶ Play        │
│ └──────┘                                │
│  ┌──────────────────────────────┐       │
│  │         <video>              │       │   ← expands on Play
│  └──────────────────────────────┘       │
└──────────────────────────────────────────┘
```

### Visual Details

- **Image thumbnails**: 44×44, `rounded-[6px]`, object-fit cover, lazy-loaded via `<img>` from `/api/files/thumbnail`. Rendered in-place replacing the generic file icon.
- **Directory icon**: Unchanged (`📁` emoji or lucide `Folder` icon).
- **Video icon**: lucide `Film` or `Video` icon on dark background. "▶ Play" text link for supported formats, "⤓ Download" for unsupported.
- **PDF icon**: lucide `FilePdf` (or `FileText` variant) on red-tinted background (`#fef2f2`). "📄 Preview" opens in new tab.
- **Text/Code icon**: lucide `FileText` on gray background (`#f0f0f2`).
- **Spreadsheet icon**: lucide `FileSpreadsheet` on green-tinted background (`#f0fdf4`).
- **Archive icon**: lucide `FileArchive` on gray background.
- **Audio icon**: lucide `FileAudio` on gray background. Inline `<audio>` playback.
- **Generic file**: lucide `File` on gray background.

### Inline Video Playback

Clicking "▶ Play" on a supported video expands the row with a `<video>` element below it, spanning the full card width. A "▼ Hide" button collapses it. Video controls are enabled.

### State Management

Component state additions to the existing `FilesPage`:

```
thumbnails: Map<string, string>    — base64 or blob URL cache for thumbnails
playing: string | null             — name of currently expanded video
```

### Component Structure

The current single-file `page.tsx` is extracted into:

```
components/file-browser.tsx         — main file browser (state, data fetching, navigation)
components/file-row.tsx             — individual row (icon, name, size, action)
components/file-icon.tsx            — icon/thumbnail renderer (image/video/doc logic)
components/video-player.tsx         — inline video player component
```

## i18n Additions

```
files:
  back: "← 返回" / "← Back"
  loadError: "无法加载文件" / "Failed to load files"
  play: "播放" / "Play"
  download: "下载" / "Download"
  preview: "预览" / "Preview"
  hide: "隐藏" / "Hide"
```

## Edge Cases

- **Broken thumbnail**: Sharp fails → show generic file icon silently
- **Large video**: Sets preload="metadata" to avoid downloading entire file
- **Directory with 1000+ items**: No pagination for v1 (acceptable for home NAS)
- **Special characters in filenames**: URL-encode all path params
- **Path traversal**: Already handled by existing API guard

## Non-Goals (v1)

- File upload / delete / rename / move
- Search / sort / filter
- Drag-and-drop
- Multi-select / batch operations
- Grid/list view toggle
- File type icons for directories
