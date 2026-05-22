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
