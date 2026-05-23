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
│  │  ┌────┬─────┬────────────┐  │  │                    │    │
│  │  │Dash│Files│Photos(API) │  │  └─────────┬──────────┘    │
│  │  └────┴─────┴────────────┘  │            │               │
│  └────────────┬────────────────┘            │               │
│               │                             │               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  WD Red 3TB (APFS)                                   │   │
│  │  /Volumes/NAS-Data                                   │   │
│  │  ├── Photos/   ← Portal reads via API & SMB access   │   │
│  │  ├── Movies/   ← SMB access                          │   │
│  │  ├── Videos/   ← ...                                 │   │
│  │  ├── Downloads/                                      │   │
│  │  └── Backups/                                        │   │
│  └──────────────────────────────────────────────────────┘   │
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
http://192.168.1.x/               — NAS Portal (内网)
smb://192.168.1.x/NAS-Data        — SMB mount
```
