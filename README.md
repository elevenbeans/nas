# NAS

DIY home NAS on Mac Mini (macOS) + UGREEN dual-bay enclosure + WD Red 3TB.

## System Architecture

```
┌────────────────────────────────────────────────┐
│                        Clients                 │
│  ┌────────────────────────┐  ┌─────────────┐   │
│  │ MacBook   iPhone x2    │  │ XGIMI RS10  │   │
│  │      Web + SMB         │  │ Kodi → SMB  │   │
│  └───────────┬────────────┘  └──────┬──────┘   │
│              │                      │          │
│        ┌─────┴──────┬──────────────▶│          │
│        │            │               │          │
│        │──HTTPS     │          SMB──│          │
│        │      HTTP──│               │          │
└────────┼────────────┼───────────────┼──────────┘
  Public │            │               │
         ▼            │ Internal      │ Internal
┌────────────────┐    │               │
│ Cloudflare     │    │               │
│ Edge + Tunnel  │    │               │
│ nas.elevenbeans│    │               │
└───────┬────────┘    │               │
        │ HTTPS       │               │
        ▼             ▼               │
┌─────────────────────────────────────┼───────────────────────┐
│          Mac Mini (macOS)           │                       │
│                                     ▼                       │
│  ┌─────────────────────────────┐  ┌────────────────────┐    │
│  │    NAS Portal (port 3000)   │  │   SMB (port 445)   │    │
│  │          Next.js 15         │  │    macOS smbd      │    │
│  │  ┌────┬─────┬───────┬────┐  │  │                    │    │
│  │  │Dash│Files│Photos │Chat│  │  └─────────┬──────────┘    │
│  │  └────┴─────┴───────┴──┬─┘  │            │               │
│  └────────────┬───────────┼────┘            │               │
│               │           │                 │               │
│               │           ▼                 │               │
│               │       ┌─────────────┐       │               │
│               │       │ Ollama      │       │               │
│               │       │ 127.0.0.1   │       │               │
│               │       │ 11434       │       │               │
│               │       │ qwen2.5:3b    │       │               │
│               │       │ chat only   │       │               │
│               │       └─────────────┘       │               │
│               │                             │               │
│               ▼                             ▼               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │WD Red 3TB (APFS) — /Volumes/NAS-Data                │    │
│  │├── Photos/   ← Portal reads via API & SMB access    │    │
│  │├── Movies/   ← SMB access                           │    │
│  │├── Videos/   ← ...                                  │    │
│  │├── Downloads/                                       │    │
│  │└── Backups/                                         │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Frontend Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (`@theme` tokens) |
| Icons | lucide-react |
| Image Processing | sharp (server-side resize, `?w=` param, UA-aware mobile compress) |
| Local AI | Ollama (qwen2.5:3b) + react-markdown + remark-gfm |
| EXIF | exifr (photo timeline capture-date) |
| Font | System font stack (`-apple-system, SF Pro Text, Segoe UI, ...`) |
| Layout | `max-w-[920px]` centered container, mobile floating compass nav |
| Color | Apple-inspired palette, accent `#006EDB`, bg `#FBFBFD` |
| Design | Apple-style, card-based, Chinese UI |
| Browser Support | Chrome 77+ (browserslist), iOS WKWebView compatible |

## Key Architecture Decisions

- **SMB:** macOS system smbd (com.apple.smbd) managed by launchd
- **Media:** Kodi on projector via SMB direct — no Jellyfin/Docker dependency
- **Port 80:** socat (root LaunchDaemon) → Next.js (user LaunchAgent) — avoids pf/TCC issues
- **Font:** system font stack — zero external requests, matches Apple China feel
- **Photo serving:** custom API route with sharp — no Immich/PhotoPrism
- **Movies access control:** `Movies/` is restricted on external network (Cloudflare Tunnel) — only name+size visible, no preview/download/stream; internal LAN retains full playback via Host-header detection (`lib/network-utils.ts`)
- **Local AI chat:** `/chat` page answers NAS usage questions via a local Ollama `qwen2.5:3b` model — no cloud dependency, data never leaves the NAS; knowledge-grounded via `lib/nas-knowledge.ts`, streaming replies, per-IP rate limit on the public endpoint
- **Profile chat & Earth Online:** `/api/profile-chat` powers the myprofile site assistant, grounded in `lib/profile-knowledge.ts` plus project docs and the `get_project_doc` tool; `/api/earth-score` stores the shared 34-city Earth Online score board (sessions, idempotent events, per-city cooldowns).


## Profile Chat & Earth Online APIs

- **`POST /api/profile-chat`** — streaming assistant for [elevenbeans.me](https://elevenbeans.me). It combines curated profile facts (`lib/profile-knowledge.ts`) with project docs (`lib/project-docs.ts`), supports the `get_project_doc` tool, and allows `*.elevenbeans.me` origins. The Earth Online project doc is `myprofile/earth-online/README.md`.
- **`POST /api/earth-score/session`** — short-lived session token for the Earth Online score board.
- **`GET/POST /api/earth-score`** — shared scores for 34 cities; focus `+5`, detail `+10`; idempotency key, per-token/city cooldowns, and an IP rate limit. Persisted at `.data/earth-online-scores.json`.
- **CORS** — score writes use a simple `text/plain` body so the browser avoids a preflight; `lib/cors.ts` allowlists the site origins.

## NAS Portal

Detailed component breakdown, API endpoints, page descriptions, and feature progress: [nas-portal-overview.md](./nas-portal/nas-portal-overview.md)


## Deploy

| Mode | Command | Port |
|------|---------|------|
| Dev | `npm run dev` | 3001 |
| Production (manual) | `npm run build && npm start` | 3000 |
| Production (one-click) | `npm run sync` | 80 (socat) → 3000 |
| Production (auto) | launchd KeepAlive on boot | 80 → 3000 |
| Cloudflare Tunnel | launchd auto-start | nas.elevenbeans.me → Cloudflare → 3000 |

## Access

```
https://nas.elevenbeans.me/       — NAS Portal (外网, via Cloudflare Tunnel)
                                  — Movies/ 目录仅显示名称和大小，含版权合规提示
http://192.168.1.x/               — NAS Portal (内网, 全部功能)
smb://192.168.1.x/NAS-Data        — SMB mount
/chat                             — NAS 助手 (本地 AI 问答, 中英双语)
```





















