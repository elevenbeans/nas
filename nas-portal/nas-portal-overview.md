# NAS Portal — Project Overview

> A home NAS management dashboard powered by Next.js 15 + Tailwind v4 + TypeScript, running on Mac Mini.

## Directory Structure

```
nas-portal/
├── app/
│   ├── api/
│   │   ├── files/
│   │   │   └── route.ts              GET /api/files?path=
│   │   ├── photos/
│   │   │   ├── [name]/
│   │   │   │   └── route.ts          GET /api/photos/[name]?w=
│   │   │   └── route.ts              GET /api/photos
│   │   └── system/
│   │       └── status/
│   │           └── route.ts          GET /api/system/status
│   ├── files/
│   │   └── page.tsx                  File browser
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
│   ├── top-nav.tsx                   Navigation bar + mobile drawer
│   ├── photo-carousel.tsx            Photo carousel (responsive + srcset)
│   ├── language-toggle.tsx           Language switch + Context
│   └── providers.tsx                 Client-side providers wrapper
├── lib/
│   ├── api.ts                        SystemStatus type + fetch
│   └── i18n.ts                       Chinese/English translation dicts
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
| `/` | Dashboard | Greeting, system status (storage/network/services), photo carousel |
| `/files` | File Browser | Directory tree navigation, path traversal protection, hidden file filter |
| `/photos` | Photo Timeline | Grouped by date, responsive grid, lazy-loaded thumbnails |
| `/guide` | User Guide | NAS usage guide, FAQ, storage decision table, fully localized |
| `/settings` | Settings | SMB status, Tailscale status display |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/system/status` | GET | Storage usage (`df -H`), network IP (`ifconfig en0`), SMB service |
| `/api/files?path=` | GET | Directory listing with path traversal protection |
| `/api/photos` | GET | Photo list sorted by mtime desc (jpg/png/heic/webp) |
| `/api/photos/[name]?w=` | GET | Image serving + sharp server-side resize (JPEG quality 80) |

---

## Components

| Component | Description |
|-----------|-------------|
| `TopNav` | Sticky navbar, desktop links with active highlighting, mobile slide-in drawer (Escape to close) |
| `PhotoCarousel` | CSS scroll-snap carousel, 4s auto-play with scroll pause, responsive breakpoint widths, srcset images |
| `LanguageToggle` / `LanguageProvider` | Chinese/English toggle, localStorage persistence |
| `Providers` | Client-side context providers wrapper |

---

## Deployment Architecture

```
Browser → Port 80
              │
          [socat]   (LaunchDaemon)
              │
          Port 3000
              │
        [Next.js]   (LaunchAgent, KeepAlive)
              │
    ┌─────────┼─────────┐
    │         │         │
  API/files API/photos  API/system/status
    │         │         │
    ▼         ▼         ▼
/Volumes/NAS-Data/     Shell commands
  Photos/              df, pgrep, ifconfig
  Videos/
  Downloads/
  Backups/
```

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
