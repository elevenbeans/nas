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

-  **Domain: Applied `elevenbeans.me` on Cloudflare and use subdomain `nas.elevenbeans.me`** to host the service via Cloudflare Tunnel