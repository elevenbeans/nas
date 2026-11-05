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

## v3.3 (2026-05-31)

- **Movies folder access control** — external network (Cloudflare Tunnel) restricted to name+size only with copyright compliance notice; internal network retains full movie icons and play/preview/download
- **Network-aware API layer** — `lib/network-utils.ts` detects internal vs external via Host header; `/api/files` hides mimeType/mtime under restriction; download/stream/thumbnail endpoints return 403 for Movies/ on external access
- **Restricted UI mode** — amber compliance banner on `/files` when browsing `Movies/` externally; FileRow suppresses play/preview/download actions

## v3.4 (2026-07-01)

- **Mobile video tap target** — entire file row is now tappable to play/hide video, replacing the small text button with full-row tap for easier one-hand use
- **Play/hide copy** — updated to "点击可播放"/"点击可隐藏" (CN) and "Tap to play"/"Tap to hide" (EN) for clearer affordance

## v3.5 (2026-08-07)

- **Local AI assistant** — `/chat` page with a bilingual streaming chat interface answering questions about how this NAS works
- **Local LLM service** — Ollama serving `qwen3:4b` on-device (launchd auto-start), no cloud dependency or data leaving the NAS
- **Knowledge-grounded answers** — system prompt built from curated NAS facts (`lib/nas-knowledge.ts`) covering files, photos, SMB, remote access, storage plans, and copyright restrictions
- **Markdown rendering** — assistant replies rendered as styled markdown (`react-markdown` + GFM), with Apple-style links, lists, code blocks, tables, and headings
- **Abuse protection** — per-IP rate limit (10 msg/min via `cf-connecting-ip`) on the public `/api/chat` endpoint
- **Robustness fixes** — decoder tail flush, runtime message validation, IME-safe Enter submit, status-aware offline error, 2000-char input cap, mobile radial menu overflow fix with the 6th nav item

## v3.6 (2026-08-13)

- **Architecture & technical Q&A** — knowledge base expanded with deployment chain (Cloudflare Tunnel → socat 80 → Next.js 3000, launchd services), path security, HEIC conversion (sips + sharp), HTTP Range streaming, exifr timeline, and tech stack facts
- **General-purpose chat** — system prompt relaxed so the assistant also answers non-NAS questions (translation, writing, common knowledge, casual chat) while keeping NAS facts grounded and fabrication-free
- **Live tool calling** — assistant can fetch real-time data via three tools: `get_system_status` (storage/SMB/network), `list_files` (directory listing with path safety), and `fetch_url` (summarize public https pages)
- **SSRF protection** — `fetch_url` allows only https, blocks private/loopback IPs via DNS resolution, caps response at 20KB

## v3.6.1 (2026-09-18)

- **SMB status accuracy** — service check now detects the port-445 listener instead of the `samba-dot-org-smbd` process; the shared `getSystemStatus` powers both the dashboard API and the chat tool
- **Dynamic NAS address** — network status reports the active uplink's IP (default-route interface, preferring physical `en*`/`bridge*` on the private LAN) instead of assuming `en0` / `192.168.1.46`, so the dashboard no longer shows a stale address after wired↔Wi-Fi DHCP changes
- **Stable SMB instructions** — guide and assistant knowledge now use the Bonjour name `smb://elevenbeansdemac-mini.local` (with a "current IP on dashboard" note) so client setup survives IP changes
- **Photo timeline crash fix** — a malformed EXIF `DateTimeOriginal` (exifr returned a raw byte string) no longer throws and blanks `/api/photos`; invalid dates fall back to file mtime and per-file failures are isolated with real errors logged
- **HEIC thumbnails in Files** — `/api/files/thumbnail` converts HEIC/HEIF via macOS `sips` (shared `lib/heic.ts`) before resizing, fixing the 500s that broke thumbnails for every HEIC photo in the file browser

## v3.7 (2026-09-18)

- **Profile AI assistant** — new `/api/profile-chat` streaming endpoint that chats as elevenbeans' site avatar, grounded in curated personal facts (`lib/profile-knowledge.ts`) with bilingual zh/en answers; input is validated (JSON + message shape), the final message is capped at 2000 chars, and history is trimmed to the last 12 turns
- **CORS for the personal site** — `lib/cors.ts` origin allowlist (`elevenbeans.me`, `www`, and local dev ports) with a per-request `corsHeaders()` helper and `OPTIONS` preflight; `next.config.ts` emits the matching `Access-Control-Allow-Origin` headers on `/api/profile-chat`
- **Shared rate limiter** — the per-IP limiter (10 msg/min via `cf-connecting-ip`) is extracted from `/api/chat` into `lib/rate-limit.ts` as `isRateLimited()` and reused by both chat endpoints
- **Visitor context** — optional `profile` payload (visitor name ≤60 chars, up to 6 preferences) personalizes the system prompt without leaking internal implementation details

## v3.7.1 (2026-09-18)

- **Project-doc grounding** — `/api/profile-chat` now answers project questions from the projects' own docs instead of guessing: `lib/project-docs.ts` maps fixed project keys (`myprofile`, `nas`, `blog`, `game-of-life`) to allowlisted files (`nas` = `README.md` + `nas-portal-overview.md`). ASCII-art/diagram lines are stripped and injection is length-capped, and a read-only `get_project_doc` tool covers indirect, pronoun, and multi-turn references. Docs are read from disk on every request (no cache, no index), so editing a doc is reflected on the next question.
- **Deterministic pre-fetch** — the route scans recent messages for project keywords and injects the matching docs directly into the system prompt, so grounding does not depend on the model choosing to call a tool; when docs are pre-injected, tools are disabled for that request to avoid tool loops.
- **Live-state guard** — questions about live NAS data (storage usage, current file list, service status, IP) are refused with a pointer to the NAS portal assistant (`/chat`); the assistant must not invent numbers or listings.
- **Bounded generation** — `temperature 0.3`, `num_ctx 8192`, `num_predict 512` keep project answers concise and latency low (~5–7s).
- **Model switch** — both `/api/chat` and `/api/profile-chat` now default to the faster non-thinking `qwen2.5:3b` (`qwen3:4b` removed from the host); `PROFILE_OLLAMA_MODEL` can point the profile endpoint at a different model than `/api/chat`.
- **Answer-language lock** — replies are forced to the requested locale (English prompt → English answer, Chinese prompt → Chinese answer).
- **Hardening** — non-object JSON bodies return 400 instead of 500; connection-level upstream failures now stream `[服务暂时不可用]` instead of an empty 500; profile knowledge uses the corrected 驯化师 wording.

## v3.7.2 (2026-10-01)

- **WeChat CORS fix** — `/api/profile-chat` now returns `Access-Control-Allow-Origin: *` from the shared `corsHeaders()` helper instead of echoing an allowlisted origin. WeChat's in-app browser (iOS WKWebView) sends an opaque/absent `Origin` on cross-origin fetches, so the origin-echoing allowlist rejected the preflight and the personal-site assistant failed instantly with "Something went wrong". The endpoint is public, unauthenticated, and cookie-less, so the allowlist was never a security boundary; the per-IP rate limit and read-only tool surface remain the real constraints. The origin-conditional headers in `next.config.ts` were removed to avoid conflicting duplicate `Access-Control-Allow-Origin` values.

## v3.7.3 (2026-10-08)

- **Assistant knowledge: career & impact** — `lib/profile-knowledge.ts` now answers interview-style questions about scale (Travix 100K+ daily visits, Trip.com 39 countries/regions), management scope (10–20 reports; owns hiring/performance/on-call; leads cross-team/region/country/subsidiary projects), tech stack (TypeScript/React/React Native/Node.js, prompt engineering + self-hosted LLMs, still hands-on), and the Trip.com → Travix acquisition/transfer (internal transfer, no gap).
- **Assistant knowledge: HR** — availability (employed, not currently looking), location/remote/travel (Shanghai, open to remote, Amsterdam as business travel ≤22 days/year), languages (native Chinese, working English), and degrees (MSc Xi'an Jiaotong, BSc Sichuan). Identity, phone, and references are explicitly declined online and offered only with a CV.
- **Assistant guardrails** — added a strict no-fabrication rule and templated verbatim replies for the two approved decision examples (`EAA Dialog`, breaking up a single-point application); a backend/infra boundary that never claims infra ownership or large-scale backend builds; a strict figures rule (quote only 100K+ and 39, never inflate); and a link-discipline rule (never invent URLs).

## v3.7.4 (2026-10-08)

- **Decision examples expanded** — the two approved cases in `lib/profile-knowledge.ts` now carry more public context. The technical decision `EAA Dialog` records that EAA = European Accessibility Act and that the choice was to use HTML native elements over quick JS DOM manipulation (requiring a design-system change) for a more standard, longer-term, compliance-friendly solution. The architecture decision (breaking up a single-point application) states its shareable essence: a combined understanding and judgment of technical architecture and business. Deeper implementation/results stay for a 1-on-1 chat, and the header rule was relaxed from "name only" to "only the facts provided per case".

## v3.7.5 (2026-10-08)

- **AI API origin restriction** — `/api/chat` and `/api/profile-chat` now accept requests only from `*.elevenbeans.me` pages (apex included) and local dev origins (`http://localhost:*`, `http://127.0.0.1:*`). Disallowed callers get a `403` before rate-limit accounting and before any Ollama inference; `Access-Control-Allow-Origin` is echoed only for allowed origins. WeChat's in-app browser (opaque/absent `Origin`) is supported via a `Referer` fallback, so the v3.7.2 fix is preserved. Denied requests log their `origin`/`referer` for troubleshooting.

## v3.7.6 (2026-10-08)

- **Stricter tenure & team-size answers** — `lib/profile-knowledge.ts` now gives the assistant an explicit total-experience fact ("10+ years since 2015") and a strict rule that work-experience length ("10+ years since 2015") and team size ("10–20 people") must be quoted verbatim — no rounding, aggregating, or inflating (e.g. never "15 years", "20+ people", or "dozens"). Figures not provided are never estimated; if unsure, the assistant says so.

## v3.7.7 (2026-11-05)

- **Movies restriction bypass fixed** — the external-network check ran on the raw `?path=` string before it was resolved, so `/Photos/../Movies/<file>` slipped past it and streamed (206) over the tunnel. `lib/network-utils.ts` now normalizes dot segments in `isMoviePath()` and adds `isMovieResolvedPath()` for the path after `realpath`, and all four file endpoints (`files`, `download`, `stream`, `thumbnail`) check the resolved path — which also closes the symlink variant. Internal LAN access and non-Movies paths are unchanged.
- **LAN access to the AI assistant fixed** — browsers send `Origin` on same-origin POSTs, so `http://192.168.x.x` and `http://<name>.local` were rejected with `403` after the v3.7.5 allowlist landed (the assistant only worked over the tunnel). `lib/cors.ts` now accepts an origin/referer whose host equals the request's `Host`, keeping the `*.elevenbeans.me` allowlist and the WeChat `Referer` fallback intact; foreign origins are still rejected before rate limiting and inference.
- **Tests** — `npm test` now runs `lib/network-utils.test.ts` (dot-segment normalization, prefix collisions, resolved-path checks) alongside the CORS suite, and `lib/cors.test.ts` covers LAN same-origin, `.local`, foreign-origin, and opaque-Origin cases.

## v3.7.8 (2026-11-05)

- **Deploy with rollback** — `npm run sync` moved into `scripts/deploy.sh`: it builds to `.next-build`, keeps the current `.next` as `.next.prev`, restarts, then health-checks `/` and `/api/system/status`. On failure it restores the previous build, restarts, and exits non-zero, so a bad build no longer leaves the portal down; the Cloudflare purge now runs only after a healthy restart. Restart waits for the booted-out job and port 3000 to disappear and retries `launchctl bootstrap`, because an immediate re-bootstrap answered `EIO` and took the site down during this very change — the rollback brought it back on the previous build.
- **Inline preview allowlist** — `download?inline=1` renders only allowlisted types (PDF, JSON, plain text, Markdown, CSV) inline; HTML, SVG, JS, and XML are forced to download, closing a same-origin XSS path through a crafted file dropped on the NAS. `isPreviewableInBrowser()` is now the single source of truth for both the file row and the API.
- **LAN detection hardened** — `isExternalRequest()` parses the `Host` header instead of matching prefixes: `*.local` counts as the home network (Movies play over the Bonjour name), the private range is checked properly (172.16/12 only, so `172.15.x` is external), and lookalikes such as `10.example.com` are no longer mistaken for the LAN.
- **Tests** — `npm test` covers 14 cases across CORS, host classification, and the inline allowlist.
