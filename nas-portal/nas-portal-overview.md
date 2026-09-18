# NAS Portal — Project Overview

> A home NAS management dashboard powered by Next.js 15 + Tailwind v4 + TypeScript, running on Mac Mini.

## Directory Structure

```
nas-portal/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts              POST /api/chat (local AI assistant, streaming)
│   │   ├── files/
│   │   │   ├── route.ts              GET /api/files?path=
│   │   │   ├── download/
│   │   │   │   └── route.ts          GET /api/files/download?path=
│   │   │   ├── stream/
│   │   │   │   └── route.ts          GET /api/files/stream?path=
│   │   │   └── thumbnail/
│   │   │       └── route.ts          GET /api/files/thumbnail?path=
│   │   ├── photos/
│   │   │   ├── [name]/
│   │   │   │   └── route.ts          GET /api/photos/[name]?w=
│   │   │   └── route.ts              GET /api/photos
│   │   └── system/
│   │       └── status/
│   │           └── route.ts          GET /api/system/status
│   ├── chat/
│   │   └── page.tsx                  AI chat assistant
│   ├── files/
│   │   ├── page.tsx                  File browser
│   │   └── [...path]/page.tsx        File sub-folder catch-all
│   ├── guide/
│   │   └── page.tsx                  User guide
│   ├── photos/
│   │   └── page.tsx                  Photo timeline
│   ├── settings/
│   │   └── page.tsx                  System settings
│   ├── layout.tsx                    Root layout
│   ├── page.tsx                      Dashboard (home)
│   └── globals.css                   Tailwind + theme tokens
├── components/
│   ├── top-nav.tsx                   Sticky navbar + mobile floating compass radial menu
│   ├── files-browser.tsx             File list + navigation state (mobile-friendly)
│   ├── file-icon.tsx                 File type icon + image thumbnail renderer
│   ├── file-row.tsx                  File row with actions (play/preview/download) + video player
│   ├── photo-carousel.tsx            Photo carousel (responsive + srcset)
│   ├── language-toggle.tsx           Language switch + Context
│   ├── markdown-content.tsx          Markdown renderer for chat replies
│   └── providers.tsx                 Client-side providers wrapper
├── lib/
│   ├── api.ts                        SystemStatus type + fetch
│   ├── api-utils.ts                  File path validation (resolveSafePath)
│   ├── file-types.ts                 MIME detection + file category classification
│   ├── i18n.ts                       Chinese/English translation dicts
│   ├── nas-knowledge.ts              NAS facts + chat system-prompt builder
│   └── network-utils.ts              Internal vs external network detection
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── com.nas.portal.plist              LaunchAgent (Next.js port 3000)
└── com.nas.socat.plist               LaunchDaemon (socat 80→3000)
```

---

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Greeting, system status (storage/network/services), photo carousel (10 random picks) |
| `/files` | File Browser | Directory tree navigation, image thumbnails, inline video playback, file type icons, download/stream endpoints, path traversal protection, empty-state message |
| `/photos` | Photo Timeline | Grouped by EXIF capture date into monthly groups, responsive grid, lazy-loaded thumbnails |
| `/guide` | User Guide | NAS usage guide, FAQ, storage decision table, fully localized |
| `/settings` | Settings | SMB status, Tailscale status display |
| `/chat` | AI Assistant | Streaming chat with a local LLM answering questions about this NAS |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/system/status` | GET | Storage usage (`df -H`), network IP (active interface), SMB service |
| `/api/files?path=` | GET | Directory listing with path traversal protection, returns mimeType per entry; Movies/ folder restricted over external network (name+size only) |
| `/api/files/thumbnail?path=` | GET | 200×200 JPEG thumbnail via sharp (fit cover) |
| `/api/files/download?path=&inline=` | GET | File download with Content-Disposition; `inline=1` for inline preview; 403 for restricted paths over external network |
| `/api/files/stream?path=` | GET | Video streaming with HTTP Range 206/416 support; 403 for restricted paths over external network |
| `/api/photos` | GET | Photo list sorted by EXIF DateTimeOriginal desc (jpg/png/heic/heif/webp), EXIF fallback to mtime |
| `/api/photos/[name]?w=` | GET | Image serving + sharp server-side resize (JPEG quality 80) |
| `/api/chat` | POST | Streaming chat proxy to local Ollama; builds system prompt from `nas-knowledge.ts`, NDJSON→plain-text stream, per-IP rate limit (10/min) |

---

## Components

| Component | Description |
|-----------|-------------|
| `TopNav` | Sticky navbar, desktop links with active highlighting; mobile floating compass button + radial menu (items arc from 12 to 6 o'clock) |
| `FileIcon` | 44×44 file icon — image thumbnails via sharp, type-specific lucide icons with tinted backgrounds |
| `FileRow` | File row with FileIcon, formatted size, action link (Play/Preview/Download), inline video player expand |
| `FilesBrowser` | Client-side file listing with loading/error/empty states, back navigation |
| `PhotoCarousel` | CSS scroll-snap carousel, 4s auto-play with scroll pause, responsive breakpoint widths, srcset images |
| `LanguageToggle` / `LanguageProvider` | Chinese/English toggle, localStorage persistence |
| `MarkdownContent` | react-markdown + remark-gfm renderer, Apple-style styled links/lists/code/headings/tables |
| `Providers` | Client-side context providers wrapper |

---

## Local AI Chat Architecture

```
Browser /chat
   │  POST /api/chat { messages, locale }
   ▼
app/api/chat/route.ts         ← Next.js route handler
   │  buildSystemPrompt(locale) → reads nas-knowledge.ts
   ▼
lib/nas-knowledge.ts          ← 11 bilingual NAS facts (files, photos, SMB, remote, copyright, FAQ)
   │  fetch → http://127.0.0.1:11434/api/chat
   ▼
Ollama (qwen2.5:3b)             ← local model, launchd auto-start, localhost-only
   │  NDJSON stream
   ▼
route.ts → plain-text stream (per-IP rate limit, input validation)
   ▼
app/chat/page.tsx             ← streams reply into message bubbles
   ▼
components/markdown-content.tsx   ← renders reply as styled markdown
```

- **Model**: `qwen2.5:3b` (~2.5GB, Q4_K_M), stored in `~/.ollama/models`
- **Service**: launchd agent `com.nas.ollama.plist` (`ollama serve`, bound to `127.0.0.1:11434`)
- **Knowledge**: `lib/nas-knowledge.ts` curates facts; the system prompt instructs the model to answer only from these facts and admit unknowns rather than fabricate
- **Streaming**: Ollama `/api/chat` NDJSON lines → decoded, buffered across chunk boundaries, forwarded as `text/plain`
- **Abuse protection**: 10 requests/min per `cf-connecting-ip` (only trusted header; other traffic shares one bucket)

---

## Deployment Architecture

```
Browser → https://nas.elevenbeans.me
               │
          [Cloudflare Tunnel]
               │
          Port 80 (socat, LaunchDaemon)
               │
          Port 3000
               │
        [Next.js]  (LaunchAgent, KeepAlive)
               │
    ┌──────────┼──────────────┐
    │          │              │
  API/files  API/photos   API/chat
  ├─ thumbnail │             │
  ├─ download  │         [Ollama]
  ├─ stream    │          127.0.0.1:11434
  └─ listing   │           qwen2.5:3b
    │          │              │
    ▼          ▼              ▼
/Volumes/NAS-Data/        Shell commands     ~/.ollama/models
  Photos/                 df, pgrep, ifconfig
  Videos/
  Downloads/
  Backups/
```

External-network restrictions: `Movies/` directory (copyright-protected) exposes only name+size and blocks preview/play/download; full access requires the home network (same WiFi). Detection via `lib/network-utils.ts` (Host header check).

## Dev & Deploy

| Mode | Command | Port |
|------|---------|------|
| Development | `npm run dev` | 3001 |
| Production (manual) | `npm run build && npm start` | 3000 |
| Production (one-click) | `npm run sync` | 80 → 3000 |
| Auto-start | launchd KeepAlive | 80 → 3000 |

## Client Devices

- MacBook — SMB + Web UI
- iPhone x2 — SMB + Web UI
- XGIMI RS10 (projector) — Kodi via SMB

## Tech Stack

| Tool | Purpose |
|------|---------|
| Next.js 15 | React meta-framework (App Router) |
| Tailwind CSS v4 | Utility-first CSS (PostCSS) |
| TypeScript | Type safety |
| lucide-react | Icon library |
| sharp | Server-side image resizing |
| react-markdown + remark-gfm | Markdown rendering for chat replies |
| exifr | EXIF capture-date extraction for photo timeline |
| Ollama | Local open-source LLM service (qwen2.5:3b) |
