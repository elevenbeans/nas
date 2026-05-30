# Changelog

## v1.0 (2026-05-21)

- **Hardware setup** — WD Red 3TB formatted APFS, mounted at `/Volumes/NAS-Data`
- **SMB file sharing** — macOS system smbd with user access, launchd auto-start
- **Dashboard** — photo carousel with auto-play, storage/network live status cards
- **File browser** — directory navigation with path traversal protection
- **Photo timeline** — date-grouped grid with sharp-powered thumbnails
- **Settings** — real-time SMB and Tailscale service status detection
- **Production deploy** — Next.js LaunchAgent (port 3000) + socat LaunchDaemon (port 80)
- **Dev workflow** — `npm run dev` (port 3001), `npm run sync` for one-click rebuild + restart
- **WeChat iOS compatibility** — `-webkit-text-size-adjust: 100%`, browserslist Chrome 77+

## v2.0 (2026-05-22)

- **Internationalization** — Chinese/English i18n with language toggle, full UI translation across dashboard, files, photos, settings, and navigation
- **Guideline page** — `/guide` page with NAS usage guidelines

## v2.1 (2026-05-22)

- **Responsive photo carousel** — extracted to reusable component with breakpoint-based slide widths (80% / 50% / 33%) and responsive images via srcset/sizes
- **HEIC/HEIF support** — macOS `sips` + `sharp` pipeline for reliable HEIC-to-JPEG conversion on all browsers
- **EXIF capture date** — photo timeline now sorts and groups by original EXIF DateTimeOriginal instead of file mtime
- **Monthly grouping** — photo timeline grouped by month instead of day
- **Random carousel picks** — dashboard shows 6 random photos each visit, sorted by capture date
- **First-slide padding fix** — capped padding to prevent image compression on wide viewports

## v2.2 (2026-05-23)

- **Domain** — Applied `elevenbeans.me` on Cloudflare, subdomain `nas.elevenbeans.me` via Cloudflare Tunnel

## v3.0 (2026-05-25)

- **Image thumbnails** — macOS as-icon style 44×44 thumbnails in file browser, powered by sharp
- **Video playback** — inline `<video>` player for .mp4/.webm with HTTP Range streaming support
- **File type icons** — type-specific lucide-react icons with tinted backgrounds (PDF red, spreadsheet green, etc.)
- **File download** — dedicated download endpoint with UTF-8 filename encoding, inline preview mode
- **Video streaming** — HTTP Range 206/416, suffix range support (`bytes=-500`)
- **Loading & empty states** — loading indicator, abort-on-navigate, "This folder is empty" prompt
- **New components** — `FileIcon` (icon/thumbnail renderer), `FileRow` (file row with actions + video player)

## v3.1 (2026-05-25)

- **Mobile navigation redesign** — right-side floating compass button at thumb level (top 55%), replaces top-right hamburger
- **Radial menu** — 5 circular nav items arc from 6 to 12 o'clock around the trigger, one-hand thumb friendly
- **Safe area** — zero bottom overlap, no conflict with browser toolbar or iOS system gestures

## v3.2 (2026-05-31)

- **10 photos on carousel** — increased from 6 to 10 random picks per session
- **Skeleton loading** — full-width bar skeleton prevents layout shift during photo fetch
- **Zoom-in entrance** — per-photo staggered zoom-in animation (600ms gap, 600ms duration)
- **Progress bar** — replaced dot indicators with continuous scroll progress bar
- **Footer URL update** — `elevenbeans.github.io` → `elevenbeans.me`
