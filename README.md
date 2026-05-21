# NAS

DIY home NAS on Mac Mini (macOS) + UGREEN dual-bay enclosure + WD Red 3TB.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Mac Mini (macOS)                         │
│                                                             │
│  ┌────────────────────────────────────────────┐             │
│  │             NAS Portal (Next.js 15)        │             │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────────┐ │             │
│  │  │ Dashboard│ │ Files    │ │ Photos      │ │  Port 3000  │
│  │  │ /        │ │ /files   │ │ /photos     │ │             │
│  │  └──────────┘ └──────────┘ └─────────────┘ │             │
│  │  ┌──────────┐ ┌──────────────────────┐     │             │
│  │  │ Settings │ │ API Routes           │     │             │
│  │  │ /settings│ │ /api/system/status   │     │             │
│  │  └──────────┘ │ /api/files           │     │             │
│  │               │ /api/photos          │     │             │
│  │               └──────────────────────┘     │             │
│  └────────────────────────────────────────────┘             │
│         │  socat (80 → 3000)                                │
│         ▼                                                   │
│  ┌────────────────┐    ┌──────────────────────┐             │
│  │  SMB (port 445)│────│  WD Red 3TB (APFS)   │             │
│  │  macOS SMB     │    │  /Volumes/NAS-Data   │             │
│  │  (system smbd) │    │  ├── Photos/         │             │
│  └────────────────┘    │  ├── Videos/         │             │
│                        │  ├── Downloads/      │             │
│                        │  └── Backups/        │             │
│                        └──────────────────────┘             │
│                                                             │
│  ┌────────────────────────────────────────────┐             │
│  │  Clients                                   │             │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────────┐ │             │
│  │  │ MacBook  │ │ iPhone x2│ │ XGIMI RS10  │ │             │
│  │  │ (SMB+Web)│ │ (SMB+Web)│ │ (Kodi → SMB)│ │             │
│  │  └──────────┘ └──────────┘ └─────────────┘ │             │
│  └────────────────────────────────────────────┘             │
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
| Font | System font stack (`-apple-system, SF Pro Text, Segoe UI, ...`) |
| Layout | `max-w-[920px]` centered container, responsive mobile drawer |
| Color | Apple-inspired palette, accent `#006EDB`, bg `#FBFBFD` |
| Design | Apple-style, card-based, Chinese UI |
| Browser Support | Chrome 77+ (browserslist), iOS WKWebView compatible |

## Key Architecture Decisions

- **SMB:** macOS system smbd (com.apple.smbd) managed by launchd
- **Media:** Kodi on projector via SMB direct — no Jellyfin/Docker dependency
- **Port 80:** socat (root LaunchDaemon) → Next.js (user LaunchAgent) — avoids pf/TCC issues
- **Font:** system font stack — zero external requests, matches Apple China feel
- **Photo serving:** custom API route with sharp — no Immich/PhotoPrism

## Deploy

| Mode | Command | Port |
|------|---------|------|
| Dev | `npm run dev` | 3001 |
| Production (manual) | `npm run build && npm start` | 3000 |
| Production (one-click) | `npm run sync` | 80 (socat) → 3000 |
| Production (auto) | launchd KeepAlive on boot | 80 → 3000 |

## Access

```
http://192.168.1.x/               — NAS Portal web UI
smb://192.168.1.x/NAS-Data        — SMB mount
```
