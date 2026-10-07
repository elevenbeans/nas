# AI API Origin Restriction — Design Spec

Restrict the NAS AI endpoints so that only web pages served from `*.elevenbeans.me`
(plus local development origins) can use them, while preserving WeChat in-app
browser support.

Repo: `elevenbeans/nas` (this repo). The `elevenbeans/myprofile` frontend is
unchanged.

## Problem

Both AI endpoints call the local Ollama model and are currently either unguarded
or wide open to any origin:

- `/api/profile-chat` returns `Access-Control-Allow-Origin: *` from
  `lib/cors.ts`. This was set deliberately in commit `84cb084` (v3.7.2) to fix a
  WeChat regression: WeChat's iOS WKWebView sends an opaque/absent `Origin` on
  cross-origin fetches, so the previous origin-echoing allowlist rejected the
  preflight and the personal-site assistant failed instantly.
- `/api/chat` (NAS portal UI) sends no CORS headers at all and performs no
  origin check; any site can trigger inference cross-site (the response is not
  readable, but Ollama still runs).

`*` means any web page can drive-by trigger inference. The goal is to restrict
browser access to `*.elevenbeans.me` while keeping WeChat working.

## Goals

- `/api/profile-chat` and `/api/chat` accept requests only from
  `*.elevenbeans.me` pages (apex included) and local dev origins.
- Disallowed callers are rejected (403) before rate-limit accounting and before
  Ollama inference, not merely blocked from reading the response.
- WeChat in-app browser (opaque/absent `Origin`) still works, via a `Referer`
  fallback.
- No frontend change.

## Non-Goals

- No change to the request/response contract, streaming protocol, rate limit,
  knowledge, or tool surface.
- Not a cryptographic security boundary. `Origin`/`Referer` are forgeable by
  non-browser clients; this only reduces drive-by browser and unauthenticated
  scripted use. The per-IP rate limit and read-only tool surface remain the real
  constraints.
- No frontend (myprofile) change.
- No Cloudflare WAF work (possible future layer).

## Allowlist

Match by parsed URL, strictly:

- `https://elevenbeans.me` — apex.
- `https://<sub>.elevenbeans.me` — any subdomain (`www`, `nas`, `blog`, …).
- Dev origins:
  - `http://localhost:8080`
  - `http://localhost:3001`
  - `http://127.0.0.1:<any port>`

Host matching uses `host === "elevenbeans.me" || host.endsWith(".elevenbeans.me")`
so `evil-elevenbeans.me` and `elevenbeans.me.evil.com` are not matched. Subdomains
must be `https`; only `localhost`/`127.0.0.1` may be `http`.

## Request decision

`isRequestAllowed(req)`:

1. If `Origin` is present and its URL is allowlisted → allow. Respond with
   `Access-Control-Allow-Origin: <Origin>`.
2. Else if `Origin` is `null` or absent and `Referer` is present and its URL is
   allowlisted → allow (WeChat fallback). Respond with
   `Access-Control-Allow-Origin: *`.
3. Else → deny.

A plain `curl` with neither header is denied, keeping the restriction meaningful.

## Enforcement

Applies to both `/api/chat` and `/api/profile-chat`.

- **POST**: if `!isRequestAllowed(req)` → `403` JSON `{ "error": "forbidden origin" }`
  with `Vary: Origin` and **no** `Access-Control-Allow-Origin`. This check runs
  before `isRateLimited()` and before any Ollama call. On denial, log the
  observed `origin` and `referer` (single `console.warn`) so the real WeChat
  headers can be confirmed from the launchd logs.
- **OPTIONS**: if allowed → `204` with CORS headers; if denied → `204` with only
  `Vary: Origin` (preflight fails, browser blocks the request).

## CORS headers

`corsHeaders(req)` in `lib/cors.ts`:

- Allowed: `Vary: Origin`, `Access-Control-Allow-Origin` (echo of `Origin`, or
  `*` when `Origin` is `null`/absent), `Access-Control-Allow-Methods: POST, OPTIONS`,
  `Access-Control-Allow-Headers: Content-Type`, `Access-Control-Max-Age: 86400`.
- Denied: `Vary: Origin` only.

## Files

- `nas-portal/lib/cors.ts` — allowlist matcher (`isAllowedUrl`),
  `isRequestAllowed(req)`, and updated `corsHeaders(req)`. Single source of truth.
- `nas-portal/app/api/chat/route.ts` — import and apply the gate on `POST`; add
  `OPTIONS` returning guard + CORS headers; attach `corsHeaders(req)` to
  responses.
- `nas-portal/app/api/profile-chat/route.ts` — apply the gate on `POST` and
  `OPTIONS`; existing `corsHeaders(req)` usage continues.
- `nas-portal/next.config.ts` — remove the static `headers()` entry for
  `/api/profile-chat` so the route owns CORS and no duplicate
  `Access-Control-*` values are emitted.
- `CHANGELOG.md` — new version entry describing the restriction.

## WeChat risk

The `Referer` fallback assumes WeChat's webview includes a `Referer` on both the
preflight and the POST. If it does not, WeChat will regress again. Mitigation:
the denial log records the observed headers; after deploy, open the personal site
in WeChat and inspect the log. If there is no usable `Referer`, relax null-`Origin`
`OPTIONS` to permissive and rely solely on the POST gate.

## Verification (local, `npm run dev` port 3001)

`curl` matrix against both endpoints (`/api/chat` and `/api/profile-chat`, POST + OPTIONS):

- `Origin: https://elevenbeans.me` → allowed, echo ACAO.
- `Origin: https://www.elevenbeans.me` / `https://blog.elevenbeans.me` → allowed.
- `Origin: https://nas.elevenbeans.me` → allowed (same-origin portal).
- `Origin: http://localhost:3001` / `http://localhost:8080` → allowed.
- `Origin: https://evil.example` → POST `403`, OPTIONS no ACAO.
- `Origin: https://evil-elevenbeans.me` → denied.
- `Origin: null` + `Referer: https://elevenbeans.me/` → allowed.
- `Origin: null` with no `Referer` → denied.
- No headers → denied.
- Valid allowed request still streams text (no behavior regression).
- `/api/chat` from the portal page still works on `http://localhost:3001/chat`.

Production `npm run sync` is executed by the user, followed by a real WeChat
check.

## Rollout

1. Implement + locally verify with `npm run dev`.
2. User runs `npm run sync` and verifies from `https://elevenbeans.me` and WeChat.
3. If WeChat regresses, inspect logs and apply the documented relaxation.
